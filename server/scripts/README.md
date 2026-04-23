# Herramientas de Automatización (Scripts)

Este directorio contiene scripts de automatización para la gestión del catálogo, pruebas y mantenimiento del servidor.

## Estructura de Carpetas

- `ingesta/`: Scripts para cargar datos iniciales, sincronizar el catálogo desde `img_catalogo` y procesar descripciones.
- `tests/`: Scripts de validación de integridad de datos y pruebas de carga.
- `mantenimiento/`: Herramientas de limpieza (archivos huérfanos), backups de DB y mantenimiento general.
- `core/`: Lógica compartida entre scripts (utilidades de limpieza de texto, validadores, etc.).

## Cómo ejecutar los scripts

Para asegurar que los scripts tengan acceso a los modelos de la base de datos, deben ejecutarse usando el Python del entorno virtual desde la raíz de la carpeta `server`.

### Ejemplo: Ingesta de Productos

```powershell
# Desde la carpeta server/
.\venv\Scripts\python scripts/ingesta/ingest_assets.py
```

## Reglas de Oro para nuevos scripts

1. **Idempotencia**: Los scripts deben poder ejecutarse varias veces sin corromper la base de datos o crear duplicados ("Upsert logic").
2. **Path Agnostic**: Usa `os.path` para que funcionen tanto en Windows como en entornos de producción (Linux).
3. **No Emojis en Consola**: Para evitar errores de codificación en Windows, evita usar emojis en los `print`.
