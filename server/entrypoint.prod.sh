#!/bin/sh
# Arranque del backend en producción.
#
# Existe porque el contenedor arrancaba uvicorn directamente y NUNCA corría las
# migraciones: al desplegar código nuevo contra un esquema viejo, el panel
# devuelve 500 en todo y no es obvio por qué.
#
# Si las migraciones fallan, el contenedor NO levanta. Es a propósito: servir
# contra un esquema equivocado corrompe datos en silencio; caerse se ve enseguida.
set -e

echo "[arranque] esperando a la base de datos..."
intentos=0
until python -c "
import os, sys
from sqlalchemy import create_engine
create_engine(os.environ['DATABASE_URL']).connect().close()
" 2>/dev/null; do
    intentos=$((intentos + 1))
    if [ "$intentos" -ge 30 ]; then
        echo "[arranque] la base no respondió tras 30 intentos. Abortando."
        exit 1
    fi
    sleep 2
done
echo "[arranque] base lista."

echo "[arranque] aplicando migraciones..."
alembic upgrade head
echo "[arranque] esquema al día."

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '*'
