# Despliegue en el VPS

> Escrito el 2026-08-31, revisando el montaje que ya existía. Reemplaza mover
> archivos a mano con WinSCP: **se despliega con `git pull`**, que es
> reproducible y deja rastro de qué versión está corriendo.

## Antes que nada: el acceso

**La contraseña de root que circuló hay que cambiarla.** Quedó escrita en un
registro de conversación, y eso no se puede deshacer.

Lo correcto, y que además evita escribir contraseñas nunca más:

```bash
# En tu máquina, una sola vez
ssh-keygen -t ed25519 -C "allan-vistiendome"

# Instalar la clave pública en el servidor (te pedirá la contraseña esta última vez)
ssh-copy-id -p 28667 root@45.236.130.174
```

Y después, en el servidor, desactivar el ingreso por contraseña — en un puerto
expuesto recibe intentos automáticos día y noche:

```
# /etc/ssh/sshd_config
PasswordAuthentication no
PermitRootLogin prohibit-password
```

## Lo que ya estaba listo

- `docker-compose-prod.yml` — base, backend, frontend y nginx como proxy.
- `server/Dockerfile.prod` y `client/Dockerfile.prod` (build multi-etapa: el
  cliente se compila y sólo viaja el `dist`).
- `nginx/production.conf` — dominio `vistiendomechile.com`, proxy a `/api`,
  `/ws` y `/media`.
- `client/nginx.conf` — SPA con `try_files`, assets cacheados un año y el
  `index.html` sin caché, que es la combinación correcta.
- `.env` está fuera de git. Bien.

## Lo que faltaba y se corrigió (2026-08-31)

1. **Las migraciones no corrían.** El contenedor arrancaba uvicorn y nada más.
   Con el código de hoy —que agrega tres migraciones— el panel habría devuelto
   500 en todo, contra un esquema viejo. Ahora hay `entrypoint.prod.sh`: espera
   la base, aplica `alembic upgrade head` y recién entonces sirve. **Si las
   migraciones fallan el contenedor no levanta**, a propósito: servir contra un
   esquema equivocado corrompe en silencio, caerse se ve enseguida.

2. **Faltaba fijar el encoding de Postgres.** El compose de desarrollo tenía
   `POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"` con un comentario
   explicando por qué; el de producción **no**. El encoding se fija en el
   `initdb` del primer arranque y no se puede cambiar después sin recrear la
   base. Sin esto el cluster puede quedar en SQL_ASCII, y ahí psycopg devuelve
   bytes en vez de str y revienta todo. Ya pasó en desarrollo.

3. **El backend arrancaba sin esperar a la base.** Ahora la base tiene
   healthcheck y el backend depende de que esté sana.

## Lo que falta decidir, y no lo decido yo

- **HTTPS.** El nginx sólo escucha en el puerto 80. Hay un
  `map $http_x_forwarded_proto` que sugiere Cloudflare adelante terminando TLS
  — **si es así, está bien**. Si no lo hay, una tienda que pide RUT y teléfono
  por HTTP no puede salir. Se resuelve con certbot o poniendo Cloudflare.
- **Qué corre hoy en el puerto 80 del VPS.** Si hay otro panel o servidor web,
  hay que ver quién se queda con el 80.
- **El `.env` de producción**, que vive sólo en el servidor y NO en git. Tiene
  que tener `SECRET_KEY` y `POSTGRES_PASSWORD` propios: los valores por defecto
  del compose de desarrollo (`vistiendome2024`) no pueden ir a producción.

## El despliegue, paso a paso

```bash
# 1. RESPALDO PRIMERO. Siempre. Antes de cualquier despliegue.
docker exec vistiendome_db_prod pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > ~/respaldos/db-$(date +%F-%H%M).sql
docker run --rm -v vistiendome_media_volume_prod:/m -v ~/respaldos:/r alpine \
  tar czf /r/media-$(date +%F-%H%M).tgz -C /m .

# 2. Traer el código
cd /ruta/del/proyecto
git pull

# 3. Reconstruir y levantar (el arranque aplica las migraciones solo)
docker compose -f docker-compose-prod.yml up -d --build

# 4. Mirar que el backend haya migrado y esté sirviendo
docker compose -f docker-compose-prod.yml logs -f backend
```

El paso 1 no es ceremonia: **la base y los medios se respaldan juntos**, y el
script lo hace en el orden correcto (ver `scripts/respaldo.sh`).

### Que el respaldo no dependa de acordarse

Un respaldo que hay que recordar no es un respaldo. En el servidor:

```bash
crontab -e
# Todos los días a las 3 de la mañana
0 3 * * * cd /ruta/del/proyecto && ./scripts/respaldo.sh >> /var/log/respaldo-vistiendome.log 2>&1
```

Conserva los 14 últimos y borra los viejos solo: un disco lleno deja de
respaldar sin avisar, que es la forma más común de quedarse sin respaldos.

### Restaurar

```bash
./scripts/restaurar.sh _db_backups/20260831_120000
```

Restaura los dos juntos —no deja restaurar uno solo— y al terminar **comprueba
que la base y los archivos coincidan**. Si algún registro quedó apuntando a una
foto que no está, falla en vez de decir que salió bien.

## Mudarse a otro VPS

Se revisó y **nada está atado a la máquina actual**: el compose no tiene IPs ni
rutas absolutas, los volúmenes son nombrados y el dominio lo resuelve
Cloudflare. La mudanza es mecánica:

```bash
# 1. En el servidor VIEJO: respaldo completo y llevárselo
./scripts/respaldo.sh
scp -P <puerto> -r _db_backups/<marca> nuevo-servidor:~/

# 2. En el NUEVO: traer el código y recrear el .env
git clone <repo> && cd Vistiendome
cp .env.example .env      # y completarlo — es lo ÚNICO que no viaja solo

# 3. Levantar (el arranque aplica las migraciones)
docker compose -f docker-compose-prod.yml up -d --build

# 4. Restaurar los datos y comprobar que quedaron completos
./scripts/restaurar.sh ~/<marca>

# 5. Recién ahora, apuntar el DNS de Cloudflare a la IP nueva
```

El orden importa: **el DNS se cambia al final**, cuando el servidor nuevo ya
responde. Al revés, hay una ventana en la que el dominio apunta a algo que
todavía no funciona.

Lo único que hay que rehacer a mano es el `.env`. Es a propósito: si viajara con
el código, las contraseñas de producción estarían en git.

## Cómo saber que quedó bien

```bash
# El esquema quedó en la última migración
docker exec vistiendome_backend_prod alembic current

# El contrato Lego responde
curl -s https://vistiendomechile.com/api/v1/... # según lo que exponga
```

Y después, en el navegador: portada, catálogo, una ficha de producto, y entrar
al panel. Que compile no significa que ande.
