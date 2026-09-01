#!/bin/bash
# Contra que base hablamos: el usuario y el nombre de la base.
#
# POR QUE NO SE LEEN DEL .env
# Leerlos del .env obliga a que este script y docker-compose esten de acuerdo.
# El dia que dejen de estarlo —otro .env, una variable renombrada, el script
# corrido desde cron sin entorno— el respaldo no avisa: se conecta a la base
# equivocada, o a ninguna.
#
# Ya paso, y por eso existe este archivo: sin el .env cargado, respaldo.sh caia
# al usuario "postgres" por defecto, que en el servidor de produccion no
# existe, y el volcado moria a mitad. El respaldo nunca habia funcionado.
#
# El contenedor SI sabe con que credenciales arranco su propio Postgres. Se le
# pregunta a el, que es la unica fuente que no puede estar desincronizada.
#
# Deja definidas USUARIO_DB y NOMBRE_DB. Si no las puede averiguar, corta: es
# preferible no respaldar a creer que se respaldo.

averiguar_credenciales_db() {
    local contenedor="$1"

    # El entorno manda, si alguien lo fijo a proposito.
    USUARIO_DB="${POSTGRES_USER:-}"
    NOMBRE_DB="${POSTGRES_DB:-}"

    if [ -z "$USUARIO_DB" ]; then
        USUARIO_DB="$(docker exec "$contenedor" printenv POSTGRES_USER 2>/dev/null || true)"
    fi
    if [ -z "$NOMBRE_DB" ]; then
        NOMBRE_DB="$(docker exec "$contenedor" printenv POSTGRES_DB 2>/dev/null || true)"
    fi

    if [ -z "$USUARIO_DB" ] || [ -z "$NOMBRE_DB" ]; then
        echo "ERROR: no se pudo averiguar usuario/base del contenedor '$contenedor'." >&2
        echo "       Revisa que el contenedor este corriendo, o fija POSTGRES_USER" >&2
        echo "       y POSTGRES_DB en el entorno antes de correr este script." >&2
        exit 1
    fi
}
