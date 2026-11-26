"""El nombre de una prenda dice sus valores en el orden de la tienda, igual en todas."""

from app.core import caracteristicas
from app.core.pedidos.cotizar import nombre_de_prenda
from app.models.crm import Cotizacion, CotizacionItem
from tests.apoyo_catalogo import en_biblioteca


def test_todas_las_prendas_en_el_orden_de_la_tienda(session):
    # En este orden: COLOR, LARGO, TALLA.
    en_biblioteca(session, {"COLOR": ["Azul Rey", "Azul Marino"]})
    en_biblioteca(session, {"LARGO": ["Bajo Rodilla", "Midi"]})
    en_biblioteca(session, {"TALLA": ["2XL", "S"]})
    cot = Cotizacion(numero=1)
    session.add(cot)
    session.commit()
    una = CotizacionItem(cotizacion_id=cot.id, nombre_custom="Vestido Noemi", cantidad=1)
    caracteristicas.vestir(session, una, {"TALLA": "2XL", "COLOR": "Azul Rey", "LARGO": "Bajo Rodilla"}, None)
    otra = CotizacionItem(cotizacion_id=cot.id, nombre_custom="Vestido Noemi", cantidad=1)
    caracteristicas.vestir(session, otra, {"COLOR": "Azul Marino", "TALLA": "S", "LARGO": "Midi"}, None)
    session.add_all([una, otra])
    session.commit()
    assert nombre_de_prenda(una) == "Vestido Noemi (Azul Rey / Bajo Rodilla / 2XL)"
    assert nombre_de_prenda(otra) == "Vestido Noemi (Azul Marino / Midi / S)"
