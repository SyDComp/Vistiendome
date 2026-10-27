"""
El cierre de caja de un día: cuánta plata entró y salió, por medio de pago,
cuánto efectivo debería haber en el cajón, y las ventas de la caja.

Se calcula del libro de pagos, no se guarda (decisión del usuario 2026-10-26):
un pago no se edita ni se borra, solo se anula y queda la fecha, así que el
cierre del martes se puede ver o reimprimir cuando sea y dice lo mismo. Si un
pago de ese día se anuló después, va aparte ("anulado después"): así cuadra
con el papel que se imprimió ese día.

Cuenta TODO lo cobrado ese día, no solo las ventas de la caja: si una clienta
de WhatsApp pasa al local y abona en efectivo, esa plata también está en el
cajón. "Saldo a favor" no es plata que entra: se muestra aparte.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from ...models.crm import Cotizacion
from ...models.pagos import Pago, TipoPago
from .. import pagos as libro
from ..pedidos.venta_rapida import CANAL_LOCAL

CHILE = ZoneInfo("America/Santiago")
# El medio que cuenta para el cajón. Es el nombre que trae Ajustes del negocio
# › Medios de pago; si se renombra, el cierre lo muestra en la lista igual,
# pero sin el "debería haber en el cajón".
EFECTIVO = "Efectivo"


@dataclass
class PorMedio:
    medio: str
    cobrado: int = 0
    devuelto: int = 0
    pagos: int = 0

    @property
    def neto(self) -> int:
        return self.cobrado - self.devuelto


@dataclass
class VentaCaja:
    pedido_id: str
    numero: Optional[int]
    hora: datetime
    total: int
    estado: str          # DESPACHADA, o lo que haya pasado después (una entrega deshecha)


@dataclass
class AnuladoDespues:
    numero: Optional[int]
    tipo: str
    medio: str
    monto: int
    anulado_en: datetime


@dataclass
class Cierre:
    fecha: date
    por_medio: List[PorMedio] = field(default_factory=list)
    con_saldo_a_favor: int = 0          # pagado con saldo a favor: no es plata nueva
    ventas_caja: List[VentaCaja] = field(default_factory=list)
    anulados_despues: List[AnuladoDespues] = field(default_factory=list)

    @property
    def efectivo_en_cajon(self) -> Optional[int]:
        efectivo = next((m for m in self.por_medio if m.medio == EFECTIVO), None)
        return efectivo.neto if efectivo else None

    @property
    def total_neto(self) -> int:
        return sum(m.neto for m in self.por_medio)


def _limites(dia: date):
    """El día en Chile, como instantes UTC: [desde, hasta)."""
    desde = datetime.combine(dia, time.min, tzinfo=CHILE).astimezone(timezone.utc)
    hasta = datetime.combine(dia + timedelta(days=1), time.min, tzinfo=CHILE).astimezone(timezone.utc)
    return desde, hasta


def _utc(momento: datetime) -> datetime:
    """Un instante con zona: los que vienen sin ella están en UTC."""
    return momento if momento.tzinfo else momento.replace(tzinfo=timezone.utc)


def hoy() -> date:
    return datetime.now(CHILE).date()


def cierre(db: Session, dia: date) -> Cierre:
    desde, hasta = _limites(dia)
    c = Cierre(fecha=dia)
    numeros: Dict[str, Optional[int]] = {}
    por_medio: Dict[str, PorMedio] = {}

    del_dia = [p for p in db.exec(select(Pago).where(Pago.registrado_en >= desde - timedelta(days=1),
                                                     Pago.registrado_en < hasta + timedelta(days=1))).all()
               if desde <= _utc(p.registrado_en) < hasta]
    ids = {p.cotizacion_id for p in del_dia if p.cotizacion_id}
    if ids:
        numeros = {x.id: x.numero for x in db.exec(select(Cotizacion).where(Cotizacion.id.in_(ids))).all()}

    for p in del_dia:
        if p.anulado_en is not None:
            # Anulado el mismo día: nunca contó. Anulado después: contó en el papel de ese día.
            if _utc(p.anulado_en) >= hasta:
                c.anulados_despues.append(AnuladoDespues(numeros.get(p.cotizacion_id), p.tipo, p.medio, p.monto, p.anulado_en))
            continue
        if p.tipo == TipoPago.A_FAVOR:
            continue                     # queda a favor de la clienta: no mueve plata
        if p.medio == libro.MEDIO_A_FAVOR:
            c.con_saldo_a_favor += p.monto
            continue
        m = por_medio.setdefault(p.medio, PorMedio(medio=p.medio))
        if p.tipo == TipoPago.PAGO:
            m.cobrado += p.monto
            m.pagos += 1
        elif p.tipo == TipoPago.DEVOLUCION:
            m.devuelto += p.monto
    c.por_medio = sorted(por_medio.values(), key=lambda m: (m.medio != EFECTIVO, -m.neto, m.medio))

    ventas = db.exec(
        select(Cotizacion).where(Cotizacion.canal == CANAL_LOCAL,
                                 Cotizacion.created_at >= desde.replace(tzinfo=None),
                                 Cotizacion.created_at < hasta.replace(tzinfo=None))
        .order_by(Cotizacion.created_at)
    ).all()
    c.ventas_caja = [
        VentaCaja(pedido_id=v.id, numero=v.numero,
                  hora=v.created_at.replace(tzinfo=timezone.utc).astimezone(CHILE),
                  total=libro.total_de(v)[0], estado=str(getattr(v.estado, "value", v.estado)))
        for v in ventas
    ]
    return c
