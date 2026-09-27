# Operación en producción

Todo lo que hace falta para instalar, actualizar, respaldar y mover el sistema.
Los comandos se ejecutan en el servidor, dentro de la carpeta del proyecto.

## Cómo está montado

Cuatro contenedores definidos en `docker-compose-prod.yml`:

| Contenedor | Función |
|---|---|
| `vistiendome_db_prod` | PostgreSQL 16. No expone puertos hacia afuera |
| `vistiendome_backend_prod` | API. Al arrancar espera la base y aplica las migraciones pendientes; si una migración falla, no arranca |
| `vistiendome_frontend_prod` | Sitio compilado |
| `vistiendome_proxy_prod` | nginx en el puerto 80: sirve el sitio y reenvía `/api`, `/ws` y `/media` |

Las fotos viven en el volumen `vistiendome_media_volume_prod` y la base en
`vistiendome_pgdata_prod`. El dominio está detrás de Cloudflare, que termina
HTTPS y entrega el tráfico al servidor por el puerto 80.

## Configuración: el archivo `.env`

Vive solo en el servidor y nunca en el repositorio. Se crea a partir de
`.env.example`:

```bash
cp .env.example .env
```

`POSTGRES_PASSWORD` y `SECRET_KEY` deben ser valores propios y largos. Si se
pierde el `.env`, la base sigue intacta pero hay que volver a escribir las
mismas credenciales para que el sistema la abra.

## Primera instalación

```bash
git clone <repositorio> Vistiendome && cd Vistiendome
cp .env.example .env            # y completarlo
docker compose -f docker-compose-prod.yml up -d --build
```

Al arrancar, el backend crea todas las tablas y carga los datos que el sistema
necesita para funcionar: estados de cuenta, permisos, regiones y comunas de
Chile, y las secciones de la página de ayuda.

Después se crea la cuenta de administrador entrando a
`https://<dominio>/admin/bootstrap`. Esa página funciona una sola vez: con la
primera cuenta creada, queda bloqueada.

## Actualizar a una versión nueva

```bash
./scripts/desplegar.sh
```

Hace, en este orden:

1. **Respalda** la base y las fotos. Si el respaldo falla, no despliega.
2. Trae el código nuevo (`git pull`).
3. Reconstruye los contenedores y recarga el proxy.
4. Comprueba que la base esté en la última migración, que la portada responda
   y que el proxy alcance a la API.
5. Pide a Cloudflare los archivos del sitio nuevo, para que el primer visitante
   no los reciba a medias.

Termina con `=== Listo ===` o con `=== TERMINO CON PROBLEMAS ===` y el detalle
de qué falló. Si el paso 5 informa archivos que fallan desde Cloudflare, se
purga su caché: Cloudflare → Caching → Configuration → Purge Everything.

## Respaldos

```bash
./scripts/respaldo.sh
```

Guarda la base y las fotos **juntas**, en una carpeta con fecha dentro de
`_db_backups/`, con un `manifiesto.txt` que indica qué contiene. Conserva los
14 más recientes y borra los anteriores.

Se ejecuta solo todos los días a las 3:00, con esta línea en el `crontab` del
servidor:

```
0 3 * * * cd /ruta/del/proyecto && ./scripts/respaldo.sh >> /var/log/respaldo-vistiendome.log 2>&1
```

Los respaldos quedan en el mismo servidor. Para sobrevivir a la pérdida del
servidor hay que copiarlos también a otro lugar:

```bash
scp -P <puerto-ssh> -r <usuario>@<servidor>:/ruta/del/proyecto/_db_backups/<fecha> .
```

## Restaurar un respaldo

```bash
./scripts/restaurar.sh _db_backups/<fecha>
```

Reemplaza la base **y** las fotos actuales por las del respaldo; no permite
restaurar solo una de las dos. Pide escribir `RESTAURAR` para confirmar. Al
terminar comprueba que cada registro de la base tenga su foto, y si falta
alguna lo informa como error.

## Restablecer una contraseña del panel

Si alguien olvida su contraseña o queda bloqueado por intentos fallidos:

```bash
docker exec -it vistiendome_backend_prod python -m app.scripts.restablecer_acceso
```

Muestra las cuentas, se elige una y se escribe la contraseña nueva dos veces.
No se ve en pantalla mientras se escribe.

## Mudarse a otro servidor

Nada está atado a la máquina actual: el proyecto no usa IPs ni rutas fijas.

1. En el servidor actual: `./scripts/respaldo.sh` y copiar la carpeta del
   respaldo al servidor nuevo.
2. En el servidor nuevo: clonar el repositorio y crear el `.env` con las mismas
   credenciales.
3. `docker compose -f docker-compose-prod.yml up -d --build`
4. `./scripts/restaurar.sh <carpeta-del-respaldo>`
5. Recién ahora, cambiar en Cloudflare el registro DNS del dominio a la IP del
   servidor nuevo.

El DNS se cambia al final para que el dominio nunca apunte a un servidor que
todavía no funciona.

## Comprobar que todo está bien

```bash
docker compose -f docker-compose-prod.yml ps                  # los 4 contenedores "Up"
docker exec vistiendome_backend_prod alembic current          # debe terminar en "(head)"
docker compose -f docker-compose-prod.yml logs --tail 50 backend
```

Y en el navegador: la portada, el catálogo, una ficha de producto y el ingreso
al panel.
