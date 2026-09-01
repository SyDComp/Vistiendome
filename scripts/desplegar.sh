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
    echo "[1/4] respaldo SALTEADO por SIN_RESPALDO=1"
else
    echo "[1/4] respaldando antes de tocar nada..."
    ./scripts/respaldo.sh > /tmp/respaldo-previo.log 2>&1 || {
        echo "ERROR: el respaldo fallo. NO se despliega." >&2
        tail -20 /tmp/respaldo-previo.log >&2
        exit 1
    }
    tail -3 /tmp/respaldo-previo.log
fi

# 2. Traer el codigo.
echo "[2/4] trayendo el codigo..."
git pull --ff-only
echo "    quedamos en: $(git log --oneline -1)"

# 3. Reconstruir. El arranque del backend aplica las migraciones solo; si
#    fallan, el contenedor no levanta, a proposito.
echo "[3/4] reconstruyendo..."
$COMPOSE up -d --build

# 4. Que compile no significa que ande.
echo "[4/4] comprobando que responda..."
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

if [ "$fallos" = "0" ]; then
    echo "=== Listo ==="
else
    echo "=== TERMINO CON PROBLEMAS: revisa lo de arriba ===" >&2
    exit 1
fi
