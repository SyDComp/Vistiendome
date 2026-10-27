"""
La purga: borra todo lo que no es catálogo, para dejar el sistema listo para
partir (o para armar datos de demostración limpios).

Hasta el lanzamiento, el servidor de producción funciona como ambiente de
pruebas: el catálogo es real; los pedidos, clientas, pagos, ventas y
estadísticas son de prueba (decisión del usuario 2026-10-27). Se corre ahora
y otra vez antes del lanzamiento.

Borra:
  · pedidos con sus prendas, pagos, historia y "lo que piden";
  · órdenes de corte y piezas únicas;
  · los movimientos de bodega que vienen de esos pedidos y órdenes (ventas,
    devoluciones, ingresos del taller). Los ajustes e ingresos manuales, sin
    referencia, quedan: son las existencias, que la tienda regula;
  · las personas que no tienen cuenta de acceso (las clientas), con sus datos;
  · las estadísticas del sitio;
y reinicia la numeración de pedidos, órdenes de corte y piezas únicas.

No toca: el catálogo, las fotos, el sitio (portada, ayuda, ajustes), las
cuentas de acceso ni la auditoría de accesos.

Uso (en el contenedor del servidor, que tiene la base):
    python -m herramientas.purga             muestra qué borraría, sin borrar
    python -m herramientas.purga --borrar    borra todo junto, o nada

Antes de borrar, respaldar la base (scripts/desplegar.sh lo hace al desplegar).
"""

import sys

from sqlalchemy import text

from app.database import engine

# Lo que viene de pedidos u órdenes de corte, en la bodega.
MOVIMIENTOS = """
    reference_id IN (SELECT id FROM cotizacion_items)
    OR reference_id IN (SELECT id FROM ordenes_corte)
    OR reference_id IN (SELECT id FROM orden_corte_items)
"""
CLIENTAS = "id NOT IN (SELECT persona_id FROM cuentas_acceso WHERE persona_id IS NOT NULL)"

# En orden: primero lo que apunta a otra cosa.
BORRAR = [
    ("movimientos de bodega de pedidos y órdenes", "stockmovement", MOVIMIENTOS),
    ("prendas de órdenes de corte", "orden_corte_items", None),
    ("órdenes de corte", "ordenes_corte", None),
    ("pagos", "pagos", None),
    ("eventos de la historia de pedidos", "pedido_eventos", None),
    ("lo que piden las clientas", "opciones_propuestas", None),
    ("piezas únicas", "piezas_unicas", None),
    ("prendas de pedidos", "cotizacion_items", None),
    ("pedidos", "cotizaciones", None),
    ("direcciones de clientas", "direcciones", f"persona_id IN (SELECT id FROM personas WHERE {CLIENTAS})"),
    ("perfiles de clientas", "perfiles_cliente", f"persona_id IN (SELECT id FROM personas WHERE {CLIENTAS})"),
    ("contratos de clientas", "contratos_legales", f"persona_id IN (SELECT id FROM personas WHERE {CLIENTAS})"),
    ("datos bancarios de clientas", "datos_bancarios", f"persona_id IN (SELECT id FROM personas WHERE {CLIENTAS})"),
    ("remuneraciones de clientas", "historial_remuneraciones", f"persona_id IN (SELECT id FROM personas WHERE {CLIENTAS})"),
    ("clientas (personas sin cuenta de acceso)", "personas", CLIENTAS),
    ("eventos de estadísticas del sitio", "analytics_event", None),
]

REINICIAR = ["cotizaciones_numero_seq", "ordenes_corte_numero_seq", "piezas_unicas_numero_seq",
             "pedido_eventos_secuencia_seq", "analytics_event_id_seq"]


def _donde(condicion):
    return f" WHERE {condicion}" if condicion else ""


def revisar(conexion) -> int:
    total = 0
    for nombre, tabla, condicion in BORRAR:
        n = conexion.execute(text(f"SELECT count(*) FROM {tabla}{_donde(condicion)}")).scalar_one()
        total += n
        print(f"  {n:>6}  {nombre}")
    return total


def borrar(conexion) -> None:
    # Las prendas y las piezas únicas se apuntan entre sí: se suelta una de las dos puntas.
    conexion.execute(text("UPDATE cotizacion_items SET pieza_id = NULL"))
    for nombre, tabla, condicion in BORRAR:
        n = conexion.execute(text(f"DELETE FROM {tabla}{_donde(condicion)}")).rowcount
        print(f"  {n:>6}  {nombre}: borrados")
    for secuencia in REINICIAR:
        conexion.execute(text(f"ALTER SEQUENCE {secuencia} RESTART WITH 1"))
    print(f"  numeración reiniciada: {', '.join(REINICIAR)}")


def main(argumentos) -> None:
    if "--borrar" not in argumentos:
        print("Se borraría (nada se borró; para borrar: --borrar):")
        with engine.connect() as conexion:
            print(f"  total: {revisar(conexion)}")
        return
    print("Borrando, en una sola transacción:")
    with engine.begin() as conexion:   # si algo falla, no queda nada a medias
        borrar(conexion)
    print("Listo.")


if __name__ == "__main__":
    main(sys.argv[1:])
