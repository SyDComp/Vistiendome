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

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"
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

# 3. Reconstruir. El arranque del backend aplica las migraciones solo; si
#    fallan, el contenedor no levanta, a proposito.
echo "[3/5] reconstruyendo..."
$COMPOSE up -d --build

# El proxy NO se reconstruye —usa la imagen oficial de nginx— asi que compose lo
# deja corriendo tal cual, y su configuracion entra por un bind mount de UN
# ARCHIVO: nginx/production.conf -> /etc/nginx/conf.d/default.conf.
#
# Docker resuelve ese montaje al inodo, no a la ruta. `git pull` no edita el
# archivo: lo reemplaza, con inodo nuevo. El contenedor se queda mirando el
# viejo, que ya no existe en el arbol, y sigue sirviendo la configuracion
# anterior. Ni recargar nginx lo arregla: recarga el archivo viejo.
#
# Resultado: TODO cambio a nginx que se subio hasta hoy nunca llego a
# produccion, y el despliegue igual decia "Listo". Recrear el contenedor vuelve
# a resolver el montaje contra el archivo actual.
echo "    recreando el proxy para que tome nginx/production.conf..."
$COMPOSE up -d --force-recreate nginx

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
dominio="$(grep -m1 'server_name' nginx/production.conf | awk '{print $2}' | tr -d ';')"
if [ -z "$dominio" ]; then
    echo "    no se pudo leer el dominio de nginx/production.conf; se salta"
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
