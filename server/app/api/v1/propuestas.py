"""
Las opciones que proponen los clientes, y qué hace Paola con ellas.

Dos públicos distintos:

  · el cliente, al armar su prenda, necesita saber en el momento si lo que
    escribió sirve — que no sea una grosería, que no sea un tipeo de un color
    que ya existe. Eso es `POST /propuestas/revisar`, y es público.
  · Paola necesita verlas agrupadas, saber cuántas se la pidieron, y aprobar o
    rechazar. Eso es el resto, y va con permiso de administración.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ...database import get_session
from ...models.catalog import Characteristic
from ...models.crm import Cotizacion
from ...models.iam import Persona, CuentaAcceso
from ...models.propuestas import OpcionPropuesta, EstadoPropuesta
from ...models.settings import SiteSetting
from ...core import propuestas as core
from ...core import moderacion
from ..deps import RequirePermiso

router = APIRouter()

_ADMIN = Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))


def _bloqueadas(db: Session) -> Optional[List[str]]:
    """
    Los términos que Paola no quiere ver, desde ajustes.

    Si nunca configuró nada se devuelve None y el filtro usa su mínimo por
    defecto: es preferible filtrar de más que dejar el catálogo abierto.
    """
    fila = db.exec(select(SiteSetting).where(SiteSetting.key == "palabras_bloqueadas")).first()
    if not fila or not isinstance(fila.value, dict):
        return None
    lista = fila.value.get("terminos")
    return lista if isinstance(lista, list) and lista else None


def _campos_faltantes(caracteristica: Optional[Characteristic]) -> List[dict]:
    """
    Qué datos le faltan a una opción propuesta para ser una opción de verdad.

    `value_structure` declara de qué está hecha cada opción de esa
    característica: COLOR lleva {value, hex_code}; ESTAMPADO, {value,
    image_url}. El cliente sólo escribió el `value` —es lo único que puede
    escribir— así que el resto queda pendiente.

    Se devuelven para que el panel se los pida a Paola en el momento de
    aprobar. Aprobar sin ellos dejaría un color sin color.
    """
    if not caracteristica:
        return []
    faltan = []
    for campo in (caracteristica.value_structure or []):
        key = campo.get("key")
        if not key or key == "value":
            continue
        faltan.append({
            "key": key,
            "label": campo.get("label") or key,
            "type": campo.get("type") or "text",
        })
    return faltan


# ── Para el cliente, mientras escribe ────────────────────────────────────────

class RevisionEntrada(BaseModel):
    caracteristica: str = Field(max_length=80)
    valor: str = Field(max_length=120)


class RevisionSalida(BaseModel):
    veredicto: str            # ok | ofensivo | muy_corto | parecido | ya_existe
    sugerencia: Optional[str] = None
    mensaje: str


@router.post("/revisar", response_model=RevisionSalida)
def revisar_valor(data: RevisionEntrada, db: Session = Depends(get_session)):
    """
    ¿Sirve lo que el cliente acaba de escribir?

    Se responde en el momento y en su idioma, no con un código de error: la
    persona está pidiendo una prenda, no rellenando un formulario técnico.
    """
    caracteristica = db.exec(
        select(Characteristic).where(Characteristic.name == data.caracteristica)
    ).first()
    if not caracteristica:
        # El cliente no crea características: si no existe, no hay nada que
        # proponer dentro de ella.
        raise HTTPException(status_code=404, detail="Esa característica no existe")

    existentes = [o.get("value") for o in (caracteristica.domain or []) if o.get("value")]

    # Si ya está en el catálogo no es una propuesta: es una opción, y hay que
    # decírselo para que la elija de la lista en vez de escribirla.
    if core.normalizar(data.valor) in {core.normalizar(v) for v in existentes}:
        return RevisionSalida(
            veredicto="ya_existe",
            sugerencia=next((v for v in existentes if core.normalizar(v) == core.normalizar(data.valor)), None),
            mensaje="Esa opción ya está disponible: puedes elegirla de la lista.",
        )

    veredicto, sugerencia = moderacion.revisar(data.valor, existentes, _bloqueadas(db))

    mensajes = {
        "ofensivo": "Ese texto no lo podemos aceptar. Escribe el nombre de la opción que necesitas.",
        "muy_corto": "Escribe el nombre completo de la opción.",
        "parecido": f"¿Quisiste decir «{sugerencia}»? Si es otra cosa, puedes dejarla como la escribiste.",
        "ok": "Lo tendremos en cuenta. Paola la revisará antes de confirmar tu pedido.",
    }
    return RevisionSalida(veredicto=veredicto, sugerencia=sugerencia, mensaje=mensajes[veredicto])


# ── Para Paola, en el panel ──────────────────────────────────────────────────

class Proponente(BaseModel):
    persona_id: Optional[str] = None
    nombre: Optional[str] = None
    cotizacion_id: Optional[str] = None
    pedido_numero: Optional[int] = None


class CampoFaltante(BaseModel):
    key: str
    label: str
    type: str


class PropuestaAgrupada(BaseModel):
    """
    Una opción propuesta, con TODA la gente que la pidió.

    Agrupada y no fila por fila porque la decisión es sobre la opción, no sobre
    cada vez que alguien la pidió: si tres clientas quieren "Turquesa Perla",
    Paola aprueba el color una vez, no tres.
    """
    caracteristica: str
    attribute_id: int
    valor: str
    valor_normalizado: str
    veces: int
    proponentes: List[Proponente]
    estado: str

    # Las características del sistema traen opciones con estructura: un COLOR
    # lleva su código hex, un ESTAMPADO su imagen. El cliente no puede darlos
    # —sólo escribió un nombre— así que quedan pendientes y hay que pedírselos
    # a Paola AL APROBAR. Sin esto, la opción entraría al catálogo sin su color
    # real y se pintaría gris en toda la tienda.
    es_del_sistema: bool = False
    campos_faltantes: List[CampoFaltante] = []


@router.get("/", response_model=List[PropuestaAgrupada])
def listar(
    estado: str = EstadoPropuesta.PENDIENTE.value,
    db: Session = Depends(get_session),
    admin: CuentaAcceso = _ADMIN,
):
    """
    Las propuestas, agrupadas por valor y ordenadas por las más pedidas.

    El orden no es cronológico a propósito: lo que le sirve a Paola para decidir
    es cuántas personas quieren lo mismo, no cuál llegó primero.
    """
    consulta = select(OpcionPropuesta)
    if estado and estado.upper() != "TODAS":
        consulta = consulta.where(OpcionPropuesta.estado == estado.upper())

    filas = db.exec(consulta.order_by(OpcionPropuesta.creado_en.asc())).all()
    if not filas:
        return []

    caracteristicas = {c.id: c for c in db.exec(select(Characteristic)).all()}
    nombres = {i: c.name for i, c in caracteristicas.items()}

    grupos: Dict[tuple, dict] = {}
    for f in filas:
        ch = caracteristicas.get(f.attribute_id)
        clave = (f.attribute_id, f.valor_normalizado)
        if clave not in grupos:
            grupos[clave] = {
                "caracteristica": nombres.get(f.attribute_id, "—"),
                "attribute_id": f.attribute_id,
                # El primero que la escribió define cómo se ve; los demás pueden
                # haberla escrito con otras mayúsculas.
                "valor": f.valor,
                "valor_normalizado": f.valor_normalizado,
                "veces": 0,
                "proponentes": [],
                "estado": f.estado.value if hasattr(f.estado, "value") else str(f.estado),
                "es_del_sistema": bool(ch.is_system) if ch else False,
                "campos_faltantes": _campos_faltantes(ch),
            }
        g = grupos[clave]
        g["veces"] += 1

        persona = db.get(Persona, f.persona_id) if f.persona_id else None
        cot = db.get(Cotizacion, f.cotizacion_id) if f.cotizacion_id else None
        g["proponentes"].append(Proponente(
            persona_id=f.persona_id,
            nombre=f"{persona.nombres} {persona.apellidos}".strip() if persona else None,
            cotizacion_id=f.cotizacion_id,
            pedido_numero=cot.numero if cot else None,
        ))

    salida = sorted(grupos.values(), key=lambda g: g["veces"], reverse=True)
    return [PropuestaAgrupada(**g) for g in salida]


class ResolucionEntrada(BaseModel):
    attribute_id: int
    valor_normalizado: str
    # Lo que el cliente no podía saber: el hex del color, la imagen del
    # estampado. Se completa al aprobar.
    datos: Optional[Dict[str, str]] = None


@router.post("/aprobar")
def aprobar(data: ResolucionEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """
    La opción pasa al catálogo como una opción de Paola.

    Desde acá deja de ser "propuesta": queda en el `domain` de su característica
    con `is_system: false`, exactamente igual que las que ella crea a mano. No
    se guarda parentesco con quien la propuso más allá del historial.

    Los pedidos que la originaron NO se tocan: son contratos y dicen lo que
    decían cuando se hicieron.
    """
    filas = db.exec(
        select(OpcionPropuesta).where(
            OpcionPropuesta.attribute_id == data.attribute_id,
            OpcionPropuesta.valor_normalizado == data.valor_normalizado,
            OpcionPropuesta.estado == EstadoPropuesta.PENDIENTE,
        )
    ).all()
    if not filas:
        raise HTTPException(status_code=404, detail="No hay una propuesta pendiente con ese valor")

    opcion = core.aprobar(db, list(filas), extras=data.datos)
    db.commit()
    return {"ok": True, "opcion": opcion, "resueltas": len(filas)}


@router.post("/rechazar")
def rechazar(data: ResolucionEntrada, db: Session = Depends(get_session), admin: CuentaAcceso = _ADMIN):
    """
    Se descarta, pero no se borra.

    Si mañana vuelven a pedirla, hay que poder saber que ya se dijo que no en
    vez de volver a evaluarla desde cero.
    """
    from datetime import datetime

    filas = db.exec(
        select(OpcionPropuesta).where(
            OpcionPropuesta.attribute_id == data.attribute_id,
            OpcionPropuesta.valor_normalizado == data.valor_normalizado,
            OpcionPropuesta.estado == EstadoPropuesta.PENDIENTE,
        )
    ).all()
    if not filas:
        raise HTTPException(status_code=404, detail="No hay una propuesta pendiente con ese valor")

    ahora = datetime.utcnow()
    for f in filas:
        f.estado = EstadoPropuesta.RECHAZADA
        f.resuelto_en = ahora
        db.add(f)
    db.commit()
    return {"ok": True, "resueltas": len(filas)}
