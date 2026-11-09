"""El nombre de una prenda dice sus valores en el orden de la tienda, igual en todas."""

from app.core.pedidos.cotizar import nombre_de_prenda
from app.models.catalog import Characteristic
from app.models.crm import Cotizacion, CotizacionItem


def test_todas_las_prendas_en_el_orden_de_la_tienda(session):
    session.add_all([Characteristic(name="COLOR", orden=0), Characteristic(name="LARGO", orden=1),
                     Characteristic(name="TALLA", orden=2)])
    cot = Cotizacion(numero=1)
    session.add(cot)
    session.commit()
    una = CotizacionItem(cotizacion_id=cot.id, nombre_custom="Vestido Noemi", cantidad=1,
                         config_custom={"TALLA": "2XL", "COLOR": "Azul Rey", "LARGO": "Bajo Rodilla"})
    otra = CotizacionItem(cotizacion_id=cot.id, nombre_custom="Vestido Noemi", cantidad=1,
                          config_custom={"COLOR": "Azul Marino", "TALLA": "S", "LARGO": "Midi"})
    session.add_all([una, otra])
    session.commit()
    assert nombre_de_prenda(una) == "Vestido Noemi (Azul Rey / Bajo Rodilla / 2XL)"
    assert nombre_de_prenda(otra) == "Vestido Noemi (Azul Marino / Midi / S)"
