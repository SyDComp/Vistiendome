#!/bin/bash
# Respaldo de Vistiendome: la base Y los medios, como una sola unidad.
#
# POR QUÉ NO ALCANZA CON RESPALDAR LA BASE
# Las fotos no viven en la base: en la base está el registro y en disco están
# los bytes. Un volcado de la base sin sus archivos deja registros apuntando a
# fotos que no existen. Y dos respaldos con fechas distintas es casi lo mismo:
# el desfase se convierte en enlaces rotos al restaurar.
#
# EL ORDEN IMPORTA, Y ES A PROPÓSITO
# Primero la base, después los medios. Si alguien sube una foto justo en el
# medio:
#   base primero   -> el archivo está en el respaldo y el registro no.
#                     Resultado: un archivo de más. Invisible, inofensivo.
#   medios primero -> el registro está y el archivo no.
#                     Resultado: una foto rota. Se ve, y es un dato perdido.
# Entre equivocarse hacia un archivo sobrante o hacia una foto rota, se elige
# lo primero.
#
#   ./scripts/respaldo.sh
#   DESTINO=/var/respaldos ./scripts/respaldo.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="${DESTINO:-$RAIZ/_db_backups}"
CONTENEDOR_DB="${CONTENEDOR_DB:-vistiendome_db_prod}"
CONTENEDOR_BACKEND="${CONTENEDOR_BACKEND:-vistiendome_backend_prod}"

# Los medios pueden venir de un volumen de Docker (producción) o de una carpeta
# del disco (desarrollo, donde server/media es un bind mount). Se aceptan las
# dos: un script de respaldo que no se puede correr no se prueba, y uno que no
# se prueba no es un respaldo.
VOLUMEN_MEDIA="${VOLUMEN_MEDIA:-vistiendome_media_volume_prod}"
CARPETA_MEDIA="${CARPETA_MEDIA:-}"

CONSERVAR="${CONSERVAR:-14}"

MARCA="$(date +%Y%m%d_%H%M%S)"
CARPETA="$DESTINO/$MARCA"
mkdir -p "$CARPETA"

echo "=== Respaldo $MARCA ==="

# 1. ¿El estado que vamos a guardar ya está roto? Guardar un desastre no lo
#    arregla, pero saberlo cambia qué se hace después.
echo "[1/4] revisando que la base y los medios coincidan..."
if [ -n "${VERIFICADOR:-}" ]; then
    $VERIFICADOR 2>&1 | tee "$CARPETA/integridad.txt" || echo "  (no se pudo revisar; se sigue igual)"
else
    docker exec "$CONTENEDOR_BACKEND" python -m app.scripts.verificar_medios 2>&1 | tee "$CARPETA/integridad.txt" || echo "  (no se pudo revisar; se sigue igual)"
fi

# 2. La base PRIMERO. Ver el comentario de arriba sobre el orden.
echo "[2/4] volcando la base..."
docker exec "$CONTENEDOR_DB" pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-postgres}" > "$CARPETA/base.sql"

# 3. Los medios DESPUÉS.
echo "[3/4] archivando los medios..."
if [ -n "$CARPETA_MEDIA" ]; then
    tar czf "$CARPETA/medios.tgz" -C "$CARPETA_MEDIA" .
else
    # MSYS_NO_PATHCONV: en Git Bash (Windows) las rutas /medios y /salida se
    # traducen a rutas de Windows y tar, adentro del contenedor, no las encuentra.
    MSYS_NO_PATHCONV=1 docker run --rm -v "$VOLUMEN_MEDIA":/medios:ro -v "$CARPETA":/salida alpine tar czf /salida/medios.tgz -C /medios .
fi

# 4. Qué hay adentro, para poder mirarlo sin descomprimir.
echo "[4/4] escribiendo el manifiesto..."
{
    echo "respaldo:    $MARCA"
    echo "hecho_en:    $(date -Is)"
    echo "revision_bd: ${REVISION_BD:-$(docker exec "$CONTENEDOR_BACKEND" alembic current 2>/dev/null | tail -1 || echo '?')}"
    echo "base_sql:    $(du -h "$CARPETA/base.sql" | cut -f1)"
    echo "medios_tgz:  $(du -h "$CARPETA/medios.tgz" | cut -f1)"
    echo "orden:       base primero, medios despues (a proposito, ver el script)"
} > "$CARPETA/manifiesto.txt"
cat "$CARPETA/manifiesto.txt"

# 5. Un disco lleno deja de respaldar sin avisar. Se conservan los N últimos.
sobrantes=$(ls -1d "$DESTINO"/*/ 2>/dev/null | sort | head -n -"$CONSERVAR" || true)
if [ -n "$sobrantes" ]; then
    echo "$sobrantes" | while read -r viejo; do
        echo "  quitando respaldo viejo: $(basename "$viejo")"
        rm -rf "$viejo"
    done
fi

echo "=== Listo: $CARPETA ==="
