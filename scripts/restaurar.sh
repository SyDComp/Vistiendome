#!/bin/bash
# Restaura un respaldo completo: la base Y los medios, juntos.
#
# Restaurar sólo uno de los dos es lo que este sistema existe para evitar, así
# que acá no se puede: van los dos o ninguno.
#
#   ./scripts/restaurar.sh _db_backups/20260831_120000
set -euo pipefail

CARPETA="${1:?Falta la carpeta del respaldo. Ej: ./scripts/restaurar.sh _db_backups/20260831_120000}"
CONTENEDOR_DB="${CONTENEDOR_DB:-vistiendome_db_prod}"
CONTENEDOR_BACKEND="${CONTENEDOR_BACKEND:-vistiendome_backend_prod}"
VOLUMEN_MEDIA="${VOLUMEN_MEDIA:-vistiendome_media_volume_prod}"

[ -f "$CARPETA/base.sql" ]   || { echo "No esta base.sql en $CARPETA"; exit 1; }
[ -f "$CARPETA/medios.tgz" ] || { echo "No esta medios.tgz en $CARPETA"; exit 1; }

echo "Esto REEMPLAZA la base y los medios actuales por los de $CARPETA."
read -r -p "Escribi RESTAURAR para continuar: " respuesta
[ "$respuesta" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

echo "[1/3] restaurando la base..."
docker exec -i "$CONTENEDOR_DB" psql -U "${POSTGRES_USER:-postgres}" \
    -d "${POSTGRES_DB:-postgres}" < "$CARPETA/base.sql"

echo "[2/3] restaurando los medios..."
docker run --rm \
    -v "$VOLUMEN_MEDIA":/medios \
    -v "$(cd "$(dirname "$CARPETA")" && pwd)/$(basename "$CARPETA")":/entrada:ro \
    alpine sh -c "rm -rf /medios/* && tar xzf /entrada/medios.tgz -C /medios"

# 3. La prueba de que la restauracion quedo completa. Sin esto no se sabe.
echo "[3/3] comprobando que la base y los medios coincidan..."
docker exec "$CONTENEDOR_BACKEND" python -m app.scripts.verificar_medios --estricto
echo "=== Restauracion verificada ==="
