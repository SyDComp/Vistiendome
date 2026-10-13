"""
Los dos caminos de una prenda y en qué queda una que va por bodega.

  BODEGA  se aparta de lo que hay. Sale de la bodega cuando sale el pedido.
  TALLER  se confecciona. Nunca toca la bodega.

Los encargos a proveedor son un tercer camino, en la Fase 3.
"""

BODEGA = "BODEGA"
TALLER = "TALLER"
CAMINOS = {BODEGA: "Bodega", TALLER: "Taller"}

# Una prenda por bodega está apartada (hay para ella) o esperando (no alcanzó:
# se aparta sola cuando entre stock).
APARTADA = "APARTADA"
ESPERANDO = "ESPERANDO"
