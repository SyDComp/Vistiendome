"""
A dónde va un pedido, y cambiarlo mientras no haya salido.

Cada pedido guarda su destino tal como se dio (una clienta puede mandar un
regalo a otra parte), y de ahí sale la etiqueta. Antes no había cómo corregirlo:
QA cambió los datos de la clienta y la etiqueta seguía igual (2026-11-09).

  · cambiar: el destino de un pedido, con las mismas reglas que al crearlo.
  · de_la_clienta: los pedidos por despachar de una clienta toman su ubicación
    de hoy (lo que se ofrece al editarla en el panel).
"""

from dataclasses import dataclass, replace
from typing import List, Optional

from sqlmodel import Session, select

from ...models.crm import Cotizacion, EstadoCotizacion, ModoEntrega
from ...models.geo import Comuna
from ...models.historia import TipoEvento
from ...models.iam import Persona
from .. import ubicacion_persona
from .historia import Actor, anotar

NO_SE_CAMBIA = {EstadoCotizacion.DESPACHADA, EstadoCotizacion.CANCELADA}
DOMICILIO = "DOMICILIO"
SUCURSAL = "SUCURSAL"


class NoSeCambiaDestino(Exception):
    """El mensaje dice por qué, en palabras de la tienda."""


@dataclass
class Destino:
    modo_entrega: str
    tipo_despacho: Optional[str] = None
    transporte: Optional[str] = None
    region: Optional[str] = None
    comuna: Optional[str] = None
    comuna_id: Optional[int] = None
    direccion: Optional[str] = None


def _valor(v) -> str:
    return str(getattr(v, "value", v) or "")


def _limpio(texto: Optional[str]) -> Optional[str]:
    return (texto or "").strip() or None


def texto(d) -> str:
    """El destino dicho corto, para la historia."""
    if _valor(d.modo_entrega) == ModoEntrega.RETIRO.value:
        return "Retiro en el local"
    lugar = ", ".join(p for p in (d.comuna, d.region) if p) or "sin comuna"
    como = "a sucursal" if _valor(d.tipo_despacho) == SUCURSAL else (d.direccion or "sin dirección")
    return f"{d.transporte or 'Sin transporte'} · {como} · {lugar}"


def _falta(d: Destino) -> List[str]:
    if d.modo_entrega == ModoEntrega.RETIRO.value:
        return []
    falta = [n for n, v in (("la región", d.region), ("la comuna", d.comuna)) if not v]
    if d.tipo_despacho != SUCURSAL and not d.direccion:
        falta.append("la dirección")
    return falta


def cambiar(db: Session, cotizacion: Cotizacion, d: Destino, actor: Actor) -> None:
    """Pone ese destino al pedido y lo anota. No hace commit."""
    if EstadoCotizacion(_valor(cotizacion.estado)) in NO_SE_CAMBIA:
        raise NoSeCambiaDestino("El destino se cambia mientras el pedido no ha salido ni se canceló.")
    retiro = d.modo_entrega == ModoEntrega.RETIRO.value
    d = replace(
        d,
        tipo_despacho=None if retiro else (d.tipo_despacho or DOMICILIO),
        transporte=None if retiro else _limpio(d.transporte),
        region=None if retiro else _limpio(d.region),
        comuna=None if retiro else _limpio(d.comuna),
        # A sucursal la dirección la pone el transportista.
        direccion=None if retiro or d.tipo_despacho == SUCURSAL else _limpio(d.direccion),
    )
    falta = _falta(d)
    if falta:
        raise NoSeCambiaDestino(f"Para el despacho falta {', '.join(falta)}.")

    antes = texto(cotizacion)
    cotizacion.modo_entrega = ModoEntrega(d.modo_entrega)
    cotizacion.tipo_despacho = d.tipo_despacho
    cotizacion.transporte = d.transporte
    cotizacion.region = d.region
    cotizacion.comuna = d.comuna
    cotizacion.direccion = d.direccion
    db.add(cotizacion)
    if antes != texto(cotizacion):
        anotar(db, cotizacion, TipoEvento.DESTINO, actor, de=antes, a=texto(cotizacion))
    if not retiro and cotizacion.persona is not None:
        ubicacion_persona.registrar(db, cotizacion.persona, d.comuna_id, d.direccion)


def por_despachar(db: Session, persona: Persona) -> List[Cotizacion]:
    """Sus pedidos con despacho que todavía no salen, del más antiguo al más nuevo."""
    return db.exec(
        select(Cotizacion)
        .where(Cotizacion.persona_id == persona.id, Cotizacion.modo_entrega == ModoEntrega.DESPACHO,
               Cotizacion.estado.not_in(list(NO_SE_CAMBIA)))
        .order_by(Cotizacion.created_at)
    ).all()


def de_la_clienta(db: Session, persona: Persona, actor: Actor) -> dict:
    """
    Sus pedidos por despachar toman su ubicación de hoy (y su transporte, si
    tiene uno preferido). Sin calle, un pedido a sucursal sigue a sucursal; uno
    a domicilio no se puede cambiar sin calle, y se informa. No hace commit.
    """
    ubicacion = ubicacion_persona.actual(persona)
    comuna = db.get(Comuna, ubicacion.comuna_id) if ubicacion is not None else None
    if comuna is None:
        raise NoSeCambiaDestino("La clienta no tiene una comuna registrada.")
    cambiados, omitidos = [], []
    for cot in por_despachar(db, persona):
        tipo = DOMICILIO if ubicacion.calle_y_numero else (_valor(cot.tipo_despacho) or SUCURSAL)
        d = Destino(
            modo_entrega=ModoEntrega.DESPACHO.value, tipo_despacho=tipo,
            transporte=persona.transporte_preferido or cot.transporte,
            region=comuna.region.nombre if comuna.region else cot.region,
            comuna=comuna.nombre, comuna_id=comuna.id, direccion=ubicacion.calle_y_numero,
        )
        try:
            cambiar(db, cot, d, actor)
            cambiados.append(cot.numero)
        except NoSeCambiaDestino as e:
            omitidos.append({"numero": cot.numero, "motivo": str(e)})
    return {"cambiados": cambiados, "omitidos": omitidos}
