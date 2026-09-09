#!/bin/bash
# Despliegue de Vistiendome, entero y en orden.
#
# POR QUE EXISTE
# El procedimiento estaba escrito en DESPLIEGUE.md y habia que seguirlo a mano.
# El paso 1 es el respaldo, y es justamente el que se saltea cuando uno esta
# apurado por subir un arreglo. Aca no se puede saltear: si el respaldo falla,
# no se despliega.
#
# Reemplaza al deploy.sh viejo, que era de cuando se subia por WinSCP: no traia
# el codigo (lo copiaba uno a mano) y no respaldaba nada.
#
#   ./scripts/desplegar.sh
#   SIN_RESPALDO=1 ./scripts/desplegar.sh   # solo si YA respaldaste recien
set -euo pipefail

# Este archivo, en el arbol del proyecto. Cuando el script corre desde una
# copia -ver mas abajo por que-, `$0` es esa copia y no sirve para ubicar el
# proyecto: la ruta buena viaja en ORIGINAL.
ESTE="${ORIGINAL:-$(cd "$(dirname "$0")" && pwd)/$(basename "$0")}"
RAIZ="$(cd "$(dirname "$ESTE")/.." && pwd)"
cd "$RAIZ"

# ESTE ARCHIVO SE REEMPLAZA A SI MISMO A MITAD DE CAMINO
#
# El paso 2 hace `git pull`, y ese pull puede traer una version nueva de este
# mismo archivo. Bash no lo lee entero al arrancar: lo va leyendo mientras lo
# ejecuta, y se acuerda de por donde iba con una posicion en bytes. Si el
# archivo cambia debajo, sigue leyendo en esa misma posicion pero del archivo
# NUEVO: se salta pasos, repite otros, o parte una linea al medio.
#
# No es hipotetico. El 9 de septiembre este script anuncio "recreando el proxy"
# y "[4/4]", texto que ya no existia en la version recien traida: corrio mitad
# de una version y mitad de la otra, el arreglo que venia en el pull no se
# aplico, y termino diciendo "Listo" igual.
#
# Comparar el archivo despues del pull no alcanza como defensa: para cuando la
# comparacion llega a ejecutarse, bash ya se desalineo y puede no llegar nunca.
# Probado: la comparacion no corrio, salto a otra linea y murio con un error de
# sintaxis.
#
# La unica defensa que aguanta es no ejecutar el archivo que se va a reemplazar.
# Se copia a un temporal y se corre desde ahi. El pull puede hacer lo que
# quiera con el original: la copia en ejecucion no la toca nadie.
if [ "${DESDE_COPIA:-0}" != "1" ]; then
    copia_viva="$(mktemp)"
    cat "$ESTE" > "$copia_viva"
    DESDE_COPIA=1 ORIGINAL="$ESTE" exec bash "$copia_viva" "$@"
fi
# Ya corriendo desde la copia: se borra sola al terminar, salga como salga.
trap 'rm -f "$0"' EXIT
COMPOSE="docker compose -f docker-compose-prod.yml"

echo "=== Despliegue $(date '+%Y-%m-%d %H:%M:%S') ==="

# 1. RESPALDO. Primero, siempre, y si falla se corta.
if [ "${SIN_RESPALDO:-0}" = "1" ]; then
    echo "[1/5] respaldo SALTEADO por SIN_RESPALDO=1"
else
    echo "[1/5] respaldando antes de tocar nada..."
    ./scripts/respaldo.sh > /tmp/respaldo-previo.log 2>&1 || {
        echo "ERROR: el respaldo fallo. NO se despliega." >&2
        tail -20 /tmp/respaldo-previo.log >&2
        exit 1
    }
    tail -3 /tmp/respaldo-previo.log
fi

# 2. Traer el codigo.
echo "[2/5] trayendo el codigo..."
git pull --ff-only
echo "    quedamos en: $(git log --oneline -1)"

# Si el pull trajo una version nueva de este script, la que hay que correr es
# esa y no la que arranco. Aca la comparacion SI es confiable, porque estamos
# ejecutando la copia y no el archivo que acaba de cambiar.
#
# El respaldo ya se hizo, no se repite. RELANZADO corta el ciclo para que esto
# no pueda encadenarse dos veces por mas raro que sea lo que traiga el pull.
if [ "${RELANZADO:-0}" != "1" ] && ! cmp -s "$ORIGINAL" "$0"; then
    echo "    el despliegue venia actualizado: se relanza la version nueva"
    rm -f "$0"
    RELANZADO=1 SIN_RESPALDO=1 DESDE_COPIA=0 exec bash "$ORIGINAL" "$@"
fi

# 3. Reconstruir. El arranque del backend aplica las migraciones solo; si
#    fallan, el contenedor no levanta, a proposito.
echo "[3/5] reconstruyendo..."
$COMPOSE up -d --build

# EL PROXY SE RECARGA, NO SE DERRIBA
#
# Aca decia `up -d --force-recreate nginx`, y esa linea es la que dejaba la
# tienda en blanco despues de cada despliegue.
#
# Estaba por un motivo real: la configuracion entraba por un bind mount de UN
# ARCHIVO, y Docker resuelve esos montajes al inodo, no a la ruta. `git pull`
# no edita el archivo, lo reemplaza, con inodo nuevo; el contenedor se quedaba
# mirando el viejo y servia la configuracion anterior. Recrearlo era la unica
# forma de que tomara la nueva.
#
# El precio de recrearlo eran unos segundos con el puerto 80 cerrado. Y caian
# justo en el peor momento: cada build renombra todos los archivos del frontend
# -llevan un hash del contenido-, asi que en ese instante la cache de Cloudflare
# no tiene ninguno y todo el mundo va al origen. El que pidiera ahi recibia un
# 522, y Cloudflare GUARDA ese 522 pegado a la URL. Un archivo asi basta para
# dejar la tienda en blanco, y no se cura sola: hay que purgar a mano.
#
# Ahora se monta el DIRECTORIO `nginx/conf.d` en vez del archivo. Un montaje de
# directorio se resuelve por ruta en cada acceso, asi que el reemplazo que hace
# git SI se ve desde adentro. Comprobado en el servidor: con el montaje de
# archivo el contenedor seguia leyendo el contenido viejo; con el de directorio
# lee el nuevo.
#
# Con eso, alcanza con recargar. `nginx -s reload` levanta procesos nuevos con
# la configuracion nueva y retira los viejos cuando terminan lo que estaban
# sirviendo: el puerto no se cierra en ningun momento y no se corta una sola
# peticion.
#
# `nginx -t` primero: si la configuracion tiene un error de sintaxis, recargar
# la rechaza y el proxy sigue con la anterior. Preferimos enterarnos aca.
echo "    recargando el proxy con nginx/conf.d/production.conf..."
if docker ps --format '{{.Names}}' | grep -qx vistiendome_proxy_prod; then
    docker exec vistiendome_proxy_prod nginx -t
    docker exec vistiendome_proxy_prod nginx -s reload
else
    # No estaba corriendo: no hay nada que recargar, hay que levantarlo.
    $COMPOSE up -d nginx
fi

# 4. Que compile no significa que ande.
echo "[4/5] comprobando que responda..."
sleep 8
fallos=0

esquema="$(docker exec vistiendome_backend_prod alembic current 2>/dev/null | tail -1 || true)"
case "$esquema" in
    *"(head)"*) echo "    esquema: $esquema" ;;
    *)          echo "    ATENCION: el esquema NO esta en head: ${esquema:-sin respuesta}"; fallos=1 ;;
esac

portada="$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo 000)"
[ "$portada" = "200" ] && echo "    portada: 200" || { echo "    ATENCION: portada devolvio $portada"; fallos=1; }

# Contra el backend alcanza con que NO sea 502: un 404 ya prueba que nginx
# llego hasta el. Un 502 es el sintoma de que quedo hablandole a un contenedor
# que ya no existe.
api="$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/openapi.json || echo 000)"
[ "$api" != "502" ] && echo "    backend alcanzable (api: $api)" || { echo "    ATENCION: 502 — nginx no encuentra al backend"; fallos=1; }

# 5. CALENTAR LA CACHE DEL BORDE, Y COMPROBAR QUE QUEDO CALIENTE
#
# POR QUE EXISTE ESTE PASO
# Cada despliegue cambia el nombre de todos los archivos del frontend -llevan un
# hash del contenido-, asi que despues de subir, la cache de Cloudflare no tiene
# NINGUNO. Los primeros visitantes son los que van a buscarlos al origen.
#
# Y ahi esta el problema: una fraccion de esas idas al origen falla, Cloudflare
# responde 522, y GUARDA ese 522 asociado a la URL. A partir de ese momento le
# entrega el error a todo el mundo, aunque el archivo este perfecto en el
# servidor. Un solo archivo asi deja la tienda en blanco, porque el resto de los
# modulos dependen de el.
#
# Paso el 9 de septiembre con `cartUtils`: el servidor lo servia en 2 ms, 20
# pedidos directos al origen sin un solo fallo, y por Cloudflare daba 522
# siempre. La misma URL con un `?x=1` cualquiera respondia 200, porque es otra
# entrada de cache. Eso solo lo explica un error guardado.
#
# Este paso hace de primer visitante: pide cada archivo desde aca, donde un
# fallo no le arruina la visita a nadie, y deja la cache llena antes de que
# llegue la primera clienta.
#
# OJO CON LO QUE ESTE PASO NO HACE
# No cura una cache ya envenenada. Se probo: una URL con el 522 guardado lo
# siguio devolviendo seis veces seguidas por mas que se le insistiera. Lo unico
# que lo saca es purgar desde el panel de Cloudflare. Este paso PREVIENE que
# ocurra, y si ya ocurrio, lo AVISA aca en vez de dejar que lo descubra una
# clienta con la pantalla en blanco.
echo "[5/5] calentando la cache del borde..."
dominio="$(grep -m1 'server_name' nginx/conf.d/production.conf | awk '{print $2}' | tr -d ';')"
if [ -z "$dominio" ]; then
    echo "    no se pudo leer el dominio de nginx/conf.d/production.conf; se salta"
else
    lista="$(mktemp)"; caidos="$(mktemp)"
    # `-4` A PROPOSITO
    # Desde este mismo servidor el dominio resuelve primero a IPv6, y por ahi
    # Cloudflare no logra volver al origen: da 522 siempre, mientras que por
    # IPv4 responde normal. Sin esto, el paso reporta que todo el sitio esta
    # caido cuando lo unico caido es la vuelta por IPv6.
    curl -4 -s --max-time 30 "https://$dominio/" \
        | grep -oE '/assets/[^"]+\.(js|css)' | sort -u > "$lista"
    total="$(wc -l < "$lista")"

    # Si la portada no se pudo leer no hay nada que calentar, y decir "0 de 0"
    # se leeria como que salio todo bien. Es lo contrario: la tienda no
    # responde.
    if [ "$total" -eq 0 ]; then
        echo "    ATENCION: no se pudo leer la portada desde $dominio." >&2
        echo "    El origen puede estar sano y el borde no: revisa Cloudflare." >&2
        fallos=1
        rm -f "$lista" "$caidos"
    else

    # EN PARALELO, Y NO POR LUCIRSE
    # Son unos setenta archivos. Uno por uno, cada fallo se lleva su espera
    # completa y el despliegue se estira varios minutos. De a ocho toma un
    # minuto: rapido, y sin parecer un ataque desde nuestra propia IP.
    #
    # El pedido va en su propio script en vez de ir escrito dentro del `xargs`:
    # anidar comillas ahi hace que `%{http_code}` se rompa y devuelva basura en
    # lugar del codigo. Ya paso.
    pedir="$(mktemp)"
    cat > "$pedir" <<'PEDIDO'
#!/bin/sh
# $1 = dominio, $2 = ruta del archivo, $3 = donde anotar los que no responden
for intento in 1 2; do
    # 25 segundos y no menos: cuando Cloudflare no llega al origen tarda unos
    # veinte en devolver su 522, y con un limite mas corto curl corta antes y
    # anota 000, que no dice nada de lo que paso.
    codigo="$(curl -4 -s -o /dev/null -w '%{http_code}' --max-time 25 "https://$1$2")" || codigo=000
    [ "$codigo" = "200" ] && exit 0
done
echo "$codigo $2" >> "$3"
PEDIDO
    chmod +x "$pedir"
    xargs -P 8 -I RUTA "$pedir" "$dominio" RUTA "$caidos" < "$lista"

    tercos="$(wc -l < "$caidos")"
    echo "    $((total - tercos)) de $total archivos responden bien desde el borde"

    if [ "$tercos" -gt 0 ]; then
        # No se corta el despliegue: el codigo ya esta arriba y el origen sirve
        # bien. Lo que falta es purgar la cache, y eso se hace desde Cloudflare.
        echo "    ATENCION: estos fallan POR CLOUDFLARE, no por el servidor:" >&2
        sed 's/^/      /' "$caidos" >&2
        echo "    Purga la cache: Cloudflare -> Caching -> Configuration -> Purge Everything" >&2
        fallos=1
    fi
    rm -f "$lista" "$caidos" "$pedir"
    fi
fi

if [ "$fallos" = "0" ]; then
    echo "=== Listo ==="
else
    echo "=== TERMINO CON PROBLEMAS: revisa lo de arriba ===" >&2
    exit 1
fi
