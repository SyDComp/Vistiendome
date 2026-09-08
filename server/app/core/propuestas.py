"""
Qué hacer con una opción que propuso un cliente.

Sólo las reglas: registrar, agrupar y aprobar. Sin FastAPI de por medio, para
poder probarlas sin levantar nada.
"""

import unicodedata
from datetime import datetime
from typing import Dict, List, Optional

from sqlmodel import Session, select

from ..models.catalog import Characteristic
from ..models.propuestas import OpcionPropuesta, EstadoPropuesta


def normalizar(valor: str) -> str:
    """
    "Turquesa Perla", "turquesa perla" y "TURQUESA  PERLA" son la misma cosa.

    Sin esto, la misma opción pedida por tres clientas se vería como tres
    propuestas distintas y se perdería justo lo que interesa: cuántas la piden.
    """
    limpio = unicodedata.normalize("NFD", str(valor or ""))
    limpio = "".join(c for c in limpio if unicodedata.category(c) != "Mn")
    return " ".join(limpio.lower().split())


def valores_del_dominio(caracteristica: Characteristic) -> Dict[str, dict]:
    """Las opciones que YA existen, por valor normalizado."""
    return {normalizar(o.get("value")): o for o in (caracteristica.domain or []) if o.get("value")}


def registrar(
    db: Session,
    propuestas_por_caracteristica: Dict[str, str],
    persona_id: Optional[str] = None,
    cotizacion_id: Optional[str] = None,
) -> List[OpcionPropuesta]:
    """
    Deja registradas las opciones que un cliente pidió y no existen.

    Se ignora en silencio lo que no corresponda registrar, porque esto corre al
    guardar un pedido y un pedido no se puede caer por esto:

      · característica que no existe -> el cliente NO crea características.
        Sólo puede proponer opciones dentro de las que ya hay.
      · valor que ya está en el catálogo -> no es una propuesta, es una opción.
      · el mismo cliente pidiendo lo mismo dos veces en el mismo pedido.

    Que dos clientes distintos propongan lo mismo SÍ genera dos filas: la opción
    es una, las proponentes son dos, y ese número es la señal para decidir.
    """
    if not propuestas_por_caracteristica:
        return []

    creadas: List[OpcionPropuesta] = []

    for nombre_carac, valor in propuestas_por_caracteristica.items():
        valor = (valor or "").strip()
        if not valor:
            continue

        caracteristica = db.exec(
            select(Characteristic).where(Characteristic.name == nombre_carac)
        ).first()
        if not caracteristica:
            continue

        norm = normalizar(valor)
        if norm in valores_del_dominio(caracteristica):
            continue

        ya_esta = db.exec(
            select(OpcionPropuesta).where(
                OpcionPropuesta.attribute_id == caracteristica.id,
                OpcionPropuesta.valor_normalizado == norm,
                OpcionPropuesta.cotizacion_id == cotizacion_id,
            )
        ).first()
        if ya_esta:
            continue

        propuesta = OpcionPropuesta(
            attribute_id=caracteristica.id,
            valor=valor,
            valor_normalizado=norm,
            persona_id=persona_id,
            cotizacion_id=cotizacion_id,
        )
        db.add(propuesta)
        creadas.append(propuesta)

    return creadas


def aprobar(
    db: Session,
    propuestas_del_mismo_valor: List[OpcionPropuesta],
    extras: Optional[Dict[str, str]] = None,
) -> Optional[dict]:
    """
    Sube la opción al catálogo como una opción normal del taller.

    Recibe TODAS las filas del mismo valor: aprobar "Turquesa Perla" resuelve de
    una vez las tres veces que la pidieron, no la primera.

    La opción entra al `domain` con `is_system: false`, que es como quedan las
    que crea el taller a mano — desde el momento en que se aprueba, deja de ser
    "propuesta" y es una opción suya, sin distinción.

    Los pedidos que la originaron NO se tocan: son contratos y dicen lo que
    decían cuando se firmaron.
    """
    if not propuestas_del_mismo_valor:
        return None

    primera = propuestas_del_mismo_valor[0]
    caracteristica = db.get(Characteristic, primera.attribute_id)
    if not caracteristica:
        return None

    dominio = list(caracteristica.domain or [])
    existentes = {normalizar(o.get("value")) for o in dominio if o.get("value")}

    opcion = None
    if primera.valor_normalizado not in existentes:
        opcion = {
            "value": primera.valor,
            "order": len(dominio) + 1,
            "is_system": False,
        }
        # Los datos que el cliente no podía dar —el hex de un color, la imagen
        # de un estampado— y que el taller completa al aprobar. Sin ellos, una
        # opción de una característica del sistema entra incompleta y se ve mal
        # en toda la tienda.
        for k, v in (extras or {}).items():
            if k and k != "value" and v not in (None, ""):
                opcion[k] = v
        dominio.append(opcion)
        # Reasignar la lista entera: mutarla en el sitio no marca el JSON como
        # sucio y el cambio no llegaría a la base.
        caracteristica.domain = dominio
        db.add(caracteristica)

    ahora = datetime.utcnow()
    for p in propuestas_del_mismo_valor:
        p.estado = EstadoPropuesta.APROBADA
        p.resuelto_en = ahora
        db.add(p)

    return opcion
