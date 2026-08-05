from typing import Optional, List
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func, distinct
from pydantic import BaseModel

try:
    from zoneinfo import ZoneInfo
    CHILE_TZ = ZoneInfo("America/Santiago")
except Exception:
    CHILE_TZ = timezone(timedelta(hours=-4))

def get_chile_now():
    return datetime.now(CHILE_TZ)

def to_chile_date(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(CHILE_TZ).date()

from ...database import get_session
from ...models.analytics import AnalyticsEvent
from ...models.catalog import Product, SKU
from ...models.crm import Cotizacion, EstadoCotizacion
from ...api.deps import RequirePermiso

router = APIRouter()

ALLOWED_TYPES = {"view", "click", "search", "add_to_cart", "checkout_whatsapp", "filter"}


# ---------- Captura pública (fire-and-forget) ----------

class TrackEvent(BaseModel):
    type: str
    product_id: Optional[int] = None
    sku: Optional[str] = None
    query: Optional[str] = None
    session_id: Optional[str] = None


@router.post("/track")
def track_event(data: TrackEvent, db: Session = Depends(get_session)):
    """Registra un evento de analítica. Público, no bloquea la navegación."""
    if data.type not in ALLOWED_TYPES:
        return {"ok": False, "reason": "tipo no permitido"}

    q = data.query.strip()[:200] if data.query else None
    event = AnalyticsEvent(
        type=data.type,
        product_id=data.product_id,
        sku=data.sku,
        query=q if q else None,
        session_id=data.session_id,
    )
    db.add(event)
    db.commit()
    return {"ok": True}


# ---------- Resumen para el panel de administración ----------

@router.get("/timeseries", dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])
def analytics_timeseries(db: Session = Depends(get_session), days: int = Query(30, ge=1, le=365)):
    """Serie diaria por tipo de evento ajustada a la fecha y hora local de Chile (America/Santiago)."""
    today = get_chile_now().date()
    since_date = today - timedelta(days=days - 1)
    since_dt_chile = datetime.combine(since_date, datetime.min.time(), tzinfo=CHILE_TZ)
    since_dt_utc = since_dt_chile.astimezone(timezone.utc).replace(tzinfo=None)

    rows = db.exec(
        select(AnalyticsEvent.created_at, AnalyticsEvent.type)
        .where(AnalyticsEvent.created_at >= since_dt_utc)
    ).all()

    # Mapa {fecha_iso: {tipo: count}}
    buckets = {}
    for created_at, etype in rows:
        d = to_chile_date(created_at)
        if d and since_date <= d <= today:
            key = d.isoformat()
            buckets.setdefault(key, {})[etype] = buckets.get(key, {}).get(etype, 0) + 1

    series = []
    for i in range(days):
        day = since_date + timedelta(days=i)
        key = day.isoformat()
        b = buckets.get(key, {})
        series.append({
            "date": key,
            "views": b.get("view", 0),
            "clicks": b.get("click", 0),
            "searches": b.get("search", 0),
            "add_to_cart": b.get("add_to_cart", 0),
            "checkout_whatsapp": b.get("checkout_whatsapp", 0),
        })

    return {"days": days, "series": series}


@router.get("/summary", dependencies=[Depends(RequirePermiso("SISTEMA", "ADMINISTRAR"))])
def analytics_summary(db: Session = Depends(get_session), days: int = Query(30, ge=1, le=365)):
    today = get_chile_now().date()
    since_date = today - timedelta(days=days - 1)
    since_dt_chile = datetime.combine(since_date, datetime.min.time(), tzinfo=CHILE_TZ)
    since = since_dt_chile.astimezone(timezone.utc).replace(tzinfo=None)

    # Totales por tipo
    totals_rows = db.exec(
        select(AnalyticsEvent.type, func.count())
        .where(AnalyticsEvent.created_at >= since)
        .group_by(AnalyticsEvent.type)
    ).all()
    totals = {t: c for t, c in totals_rows}

    # Vistas y clicks por producto
    def per_product(event_type):
        rows = db.exec(
            select(AnalyticsEvent.product_id, func.count())
            .where(
                AnalyticsEvent.type == event_type,
                AnalyticsEvent.created_at >= since,
                AnalyticsEvent.product_id.is_not(None),
            )
            .group_by(AnalyticsEvent.product_id)
        ).all()
        return {pid: c for pid, c in rows}

    views = per_product("view")
    clicks = per_product("click")

    # Nombres de productos involucrados
    pids = list(set(views) | set(clicks))
    names = {}
    if pids:
        for p in db.exec(select(Product.id, Product.name).where(Product.id.in_(pids))).all():
            names[p[0]] = p[1]

    # Top vistos
    top_viewed = sorted(
        [{"product_id": pid, "name": names.get(pid, f"#{pid}"), "views": v} for pid, v in views.items()],
        key=lambda x: x["views"], reverse=True
    )[:10]

    # Análisis de interés: muy vistos pero poco consultados (click) -> menor ratio click/vista
    interest = []
    for pid, v in views.items():
        c = clicks.get(pid, 0)
        ratio = round(c / v, 2) if v else 0
        interest.append({
            "product_id": pid,
            "name": names.get(pid, f"#{pid}"),
            "views": v,
            "clicks": c,
            "ratio": ratio,
        })
    # Ordenar: primero los de más vistas con menor ratio (más "mirados pero poco consultados")
    interest = sorted(interest, key=lambda x: (-x["views"], x["ratio"]))[:10]

    # Top búsquedas
    search_rows = db.exec(
        select(func.lower(AnalyticsEvent.query), func.count())
        .where(
            AnalyticsEvent.type == "search",
            AnalyticsEvent.created_at >= since,
            AnalyticsEvent.query.is_not(None),
        )
        .group_by(func.lower(AnalyticsEvent.query))
        .order_by(func.count().desc())
        .limit(15)
    ).all()
    top_searches = [{"query": q, "count": c} for q, c in search_rows if q]

    # Filtros más usados (query = "Atributo: Valor")
    filter_rows = db.exec(
        select(AnalyticsEvent.query, func.count())
        .where(
            AnalyticsEvent.type == "filter",
            AnalyticsEvent.created_at >= since,
            AnalyticsEvent.query.is_not(None),
        )
        .group_by(AnalyticsEvent.query)
        .order_by(func.count().desc())
        .limit(15)
    ).all()
    top_filters = [{"query": q, "count": c} for q, c in filter_rows if q]

    # --- Variantes (SKU) más agregadas al carrito / cerradas por WhatsApp ---
    def top_variants(event_type, limit=10):
        rows = db.exec(
            select(AnalyticsEvent.sku, func.count())
            .where(
                AnalyticsEvent.type == event_type,
                AnalyticsEvent.created_at >= since,
                AnalyticsEvent.sku.is_not(None),
            )
            .group_by(AnalyticsEvent.sku)
            .order_by(func.count().desc())
            .limit(limit)
        ).all()
        codes = [c for c, _ in rows]
        info = {}
        if codes:
            sku_objs = db.exec(select(SKU).where(SKU.sku.in_(codes))).all()
            prod_ids = list({s.product_id for s in sku_objs})
            pnames = {}
            if prod_ids:
                for p in db.exec(select(Product.id, Product.name).where(Product.id.in_(prod_ids))).all():
                    pnames[p[0]] = p[1]
            for s in sku_objs:
                variant = " / ".join(str(v) for v in (s.config or {}).values())
                pname = pnames.get(s.product_id, f"#{s.product_id}")
                info[s.sku] = {
                    "product_id": s.product_id,
                    "label": f"{pname}{(' · ' + variant) if variant else ''}",
                }
        return [{
            "sku": c,
            "product_id": info.get(c, {}).get("product_id"),
            "label": info.get(c, {}).get("label", c),
            "count": cnt,
        } for c, cnt in rows]

    top_cart_variants = top_variants("add_to_cart")
    top_checkout_variants = top_variants("checkout_whatsapp")

    # Carritos abandonados: sesiones con add_to_cart pero sin checkout_whatsapp
    add_sessions = set(s for s in db.exec(
        select(distinct(AnalyticsEvent.session_id)).where(
            AnalyticsEvent.type == "add_to_cart",
            AnalyticsEvent.created_at >= since,
            AnalyticsEvent.session_id.is_not(None),
        )
    ).all() if s)
    checkout_sessions = set(s for s in db.exec(
        select(distinct(AnalyticsEvent.session_id)).where(
            AnalyticsEvent.type == "checkout_whatsapp",
            AnalyticsEvent.created_at >= since,
            AnalyticsEvent.session_id.is_not(None),
        )
    ).all() if s)
    abandoned_count = len(add_sessions - checkout_sessions)

    # Cotizaciones pendientes (iniciadas por WhatsApp pero no cerradas)
    pending_quotes = db.exec(
        select(func.count()).where(Cotizacion.estado == EstadoCotizacion.NUEVA)
    ).one()

    return {
        "days": days,
        "totals": {
            "views": totals.get("view", 0),
            "clicks": totals.get("click", 0),
            "searches": totals.get("search", 0),
            "add_to_cart": totals.get("add_to_cart", 0),
            "checkout_whatsapp": totals.get("checkout_whatsapp", 0),
        },
        "top_viewed": top_viewed,
        "interest": interest,
        "top_searches": top_searches,
        "top_filters": top_filters,
        "top_cart_variants": top_cart_variants,
        "top_checkout_variants": top_checkout_variants,
        "abandoned_carts": abandoned_count,
        "pending_quotes": pending_quotes,
    }
