"""
La bodega no borra: deshacer agrega, y lo que tiene historia se da de baja.

Cubre la Entrega 0 de la Fase 1: despachar y deshacer, finalizar y reabrir una
orden de corte, quitar variantes y productos, borrar pedidos y categorías. En
todos los casos lo anotado en la bodega se conserva.

Se llaman las funciones del servidor directamente: las rutas del panel exigen
permiso de administrador, y lo que se prueba acá son las reglas, no el permiso.
"""

import asyncio

import pytest
from fastapi import HTTPException
from sqlmodel import Session, select

from app.api.v1 import catalog_admin
from app.api.v1.crm import _sincronizar_stock_venta, eliminar_cotizacion
from app.api.v1.taller import _aplicar_finalizacion
from app.core import existencias, movimientos, retiro_variantes
from app.models.catalog import Category, MovementType, Product, SKU, StockMovement
from app.models.crm import Cotizacion, CotizacionItem, EstadoCotizacion
from app.models.iam import Persona
from app.models.taller import OrdenCorte, OrdenCorteItem


@pytest.fixture
def catalogo(session: Session):
    cat = Category(name="Vestimenta", slug="vestimenta")
    comodin = Category(name="Sin Categoría", slug=catalog_admin.SLUG_SIN_CATEGORIA)
    session.add_all([cat, comodin])
    session.commit()
    prod = Product(name="Vestido Noemi", slug="vestido-noemi", description="", category_id=cat.id)
    session.add(prod)
    session.commit()
    sku = SKU(product_id=prod.id, sku="NOE-M-CORAL", price=17490, config={"TALLA": "M"})
    session.add(sku)
    session.commit()
    return {"categoria": cat, "comodin": comodin, "producto": prod, "sku": sku}


def _ingreso(session: Session, sku: SKU, cantidad: int):
    session.add(StockMovement(sku_id=sku.id, type=MovementType.RECEIPT, quantity=cantidad, note="Carga"))
    session.commit()


def _pedido(session: Session, sku: SKU, cantidad: int) -> Cotizacion:
    persona = Persona(rut="11111111-1", nombres="Camila", apellidos="Flores")
    session.add(persona)
    session.commit()
    cot = Cotizacion(persona_id=persona.id, numero=40, estado=EstadoCotizacion.CONFIRMADA)
    session.add(cot)
    session.commit()
    session.add(CotizacionItem(cotizacion_id=cot.id, sku_id=sku.id, cantidad=cantidad))
    session.commit()
    session.refresh(cot)
    return cot


def _cambiar(session: Session, cot: Cotizacion, nuevo: EstadoCotizacion):
    anterior = cot.estado
    cot.estado = nuevo
    session.add(cot)
    _sincronizar_stock_venta(session, cot, anterior, nuevo)
    session.commit()


def _movimientos(session: Session, sku: SKU):
    return session.exec(select(StockMovement).where(StockMovement.sku_id == sku.id).order_by(StockMovement.id)).all()


# --- Despachar y deshacer ---------------------------------------------------

def test_deshacer_un_despacho_agrega_una_vuelta_y_no_borra(session, catalogo):
    sku = catalogo["sku"]
    _ingreso(session, sku, 3)
    cot = _pedido(session, sku, 2)

    _cambiar(session, cot, EstadoCotizacion.DESPACHADA)
    _cambiar(session, cot, EstadoCotizacion.CONFIRMADA)

    tipos = [(m.type, m.quantity) for m in _movimientos(session, sku)]
    assert tipos == [(MovementType.RECEIPT, 3), (MovementType.SALE, -2), (MovementType.RETURN, 2)]
    assert existencias.existencias(session, sku.id) == 3


def test_redespachar_no_descuenta_dos_veces(session, catalogo):
    sku = catalogo["sku"]
    _ingreso(session, sku, 2)
    cot = _pedido(session, sku, 2)

    _cambiar(session, cot, EstadoCotizacion.DESPACHADA)
    _cambiar(session, cot, EstadoCotizacion.CONFIRMADA)
    _cambiar(session, cot, EstadoCotizacion.DESPACHADA)

    item = cot.items[0]
    assert movimientos.neto_de(session, item.id) == -2
    assert existencias.existencias(session, sku.id) == 0
    assert len(_movimientos(session, sku)) == 4  # carga, salida, vuelta, salida


def test_despachar_sin_existencia_avisa_con_409_y_el_nombre_de_la_variante(session, catalogo):
    sku = catalogo["sku"]
    cot = _pedido(session, sku, 1)

    with pytest.raises(HTTPException) as error:
        _cambiar(session, cot, EstadoCotizacion.DESPACHADA)
    assert error.value.status_code == 409
    assert "NOE-M-CORAL" in error.value.detail


# --- Orden de corte ---------------------------------------------------------

def test_reabrir_una_orden_finalizada_agrega_una_salida_y_no_borra(session, catalogo):
    sku = catalogo["sku"]
    orden = OrdenCorte(numero=7)
    session.add(orden)
    session.commit()
    session.add(OrdenCorteItem(orden_id=orden.id, sku_id=sku.id, cantidad=5))
    session.commit()
    session.refresh(orden)

    _aplicar_finalizacion(session, orden, finalizando=True)
    _aplicar_finalizacion(session, orden, finalizando=True)  # repetir no suma dos veces
    _aplicar_finalizacion(session, orden, finalizando=False)
    session.commit()

    tipos = [(m.type, m.quantity) for m in _movimientos(session, sku)]
    assert tipos == [(MovementType.RECEIPT, 5), (MovementType.ADJUSTMENT, -5)]
    assert existencias.existencias(session, sku.id) == 0


# --- Quitar variantes y productos -------------------------------------------

def test_una_variante_con_historia_se_da_de_baja_y_conserva_sus_movimientos(session, catalogo):
    sku = catalogo["sku"]
    _ingreso(session, sku, 4)

    de_baja, borradas = retiro_variantes.retirar(session, [sku])
    session.commit()

    assert (de_baja, borradas) == (1, 0)
    assert session.get(SKU, sku.id).is_deleted
    assert len(_movimientos(session, sku)) == 1


def test_una_variante_sin_historia_se_borra(session, catalogo):
    sku = catalogo["sku"]
    de_baja, borradas = retiro_variantes.retirar(session, [sku])
    session.commit()
    assert (de_baja, borradas) == (0, 1)
    assert session.get(SKU, sku.id) is None


def test_el_producto_muestra_solo_las_variantes_activas(session, catalogo):
    prod, sku = catalogo["producto"], catalogo["sku"]
    _ingreso(session, sku, 1)
    retiro_variantes.retirar(session, [sku])
    session.commit()
    session.refresh(prod)
    assert prod.skus == []
    assert [s.id for s in prod.todas_las_skus] == [sku.id]


def test_un_producto_con_historia_no_se_borra_del_todo_aunque_se_fuerce(session, catalogo):
    prod, sku = catalogo["producto"], catalogo["sku"]
    _ingreso(session, sku, 2)

    asyncio.run(catalog_admin.delete_product(prod.id, force=True, db=session))

    assert session.get(Product, prod.id).is_deleted
    assert session.get(SKU, sku.id) is not None
    assert len(_movimientos(session, sku)) == 1


# --- Pedidos y categorías ---------------------------------------------------

def test_un_pedido_con_movimientos_no_se_borra(session, catalogo):
    sku = catalogo["sku"]
    _ingreso(session, sku, 2)
    cot = _pedido(session, sku, 1)
    _cambiar(session, cot, EstadoCotizacion.DESPACHADA)
    _cambiar(session, cot, EstadoCotizacion.CONFIRMADA)  # deshecho, pero anotado

    with pytest.raises(HTTPException) as error:
        eliminar_cotizacion(cot.id, db=session, admin=None)
    assert error.value.status_code == 409


def test_sin_categoria_no_se_puede_borrar(session, catalogo):
    with pytest.raises(HTTPException) as error:
        catalog_admin.delete_category(catalogo["comodin"].id, db=session)
    assert error.value.status_code == 403


def test_borrar_una_categoria_mueve_sus_productos_a_sin_categoria(session, catalogo):
    catalog_admin.delete_category(catalogo["categoria"].id, db=session)
    assert session.get(Product, catalogo["producto"].id).category_id == catalogo["comodin"].id


def test_borrar_una_categoria_deja_sus_subcategorias_en_la_raiz(session, catalogo):
    padre = catalogo["categoria"]
    padre.level, padre.path = 1, "/vestimenta"
    sub = Category(name="Vestidos", slug="vestimenta-vestidos", parent_id=padre.id,
                   level=2, path="/vestimenta/vestimenta-vestidos")
    session.add_all([padre, sub])
    session.commit()
    nieto = Category(name="Noemi", slug="vestidos-noemi", parent_id=sub.id,
                     level=3, path="/vestimenta/vestimenta-vestidos/vestidos-noemi")
    prod = Product(name="Vestido Abril", slug="vestido-abril", description="", category_id=sub.id)
    session.add_all([nieto, prod])
    session.commit()

    catalog_admin.delete_category(padre.id, db=session)

    session.expire_all()
    sobreviviente = session.get(Category, sub.id)
    assert sobreviviente is not None and sobreviviente.parent_id is None
    assert session.get(Product, prod.id).category_id == sub.id
    # Queda en la raíz con su rama, y con la misma dirección pública.
    assert (sobreviviente.level, sobreviviente.path, sobreviviente.slug) == (
        1, "/vestimenta-vestidos", "vestimenta-vestidos")
    nieto = session.get(Category, nieto.id)
    assert (nieto.level, nieto.path, nieto.slug) == (
        2, "/vestimenta-vestidos/vestidos-noemi", "vestidos-noemi")
