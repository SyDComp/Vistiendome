"""
Crear un pedido: quién es la clienta, dónde vive y qué pidió.

Es la misma regla venga de donde venga: la tienda, el formulario de contacto
o el panel. Por eso vive acá y no en una ruta. Las rutas solo deciden QUIÉN
puede pedir qué: la pública no crea pedidos "manuales" ni elige a la persona
por id; la del panel sí, con sesión.
"""

from sqlalchemy import text
from sqlmodel import Session, select

from ...models.crm import Cotizacion, CotizacionItem, EstadoCotizacion, ModoEntrega, OrigenCotizacion
from ...models.iam import Direccion, Persona, TipoPersona
from .. import propuestas as core_propuestas
from ...models.historia import TipoEvento
from .historia import Actor, anotar
from .prendas import prenda_desde


def modo_de(data) -> ModoEntrega:
    """
    El modo que declara el pedido. Si no viene —clientes viejos que todavía no
    mandan el campo— se infiere del nombre del transporte, que es justo lo que
    NO queremos hacer: por eso la inferencia vive acá, en el borde, y no
    repartida por el sistema.

    "…(retiro en sucursal)" es un DESPACHO y se descarta primero, porque
    contiene la palabra "retiro" y si no se mirara antes caería del lado
    equivocado.
    """
    if getattr(data, "modo_entrega", None):
        return data.modo_entrega
    texto = (data.transporte or "").upper()
    if "SUCURSAL" in texto:
        return ModoEntrega.DESPACHO
    if texto in ("RETIRO_LOCAL", "RETIRO EN LOCAL", "RETIRO EN TIENDA", "RETIRO"):
        return ModoEntrega.RETIRO
    return ModoEntrega.DESPACHO


def crear_pedido(session: Session, data, actor: Actor, canal: str = None, permitir_sin_costo: bool = False) -> Cotizacion:
    """
    Crea el pedido con sus prendas y anota quién lo creó. `data` trae los
    campos de CotizacionCreate; `canal` es el "¿Cómo llegó?" de los que se
    cargan en el panel. `permitir_sin_costo`: solo el panel puede regalar.
    """
    # Un retiro no viaja: no tiene región, comuna ni dirección de despacho,
    # las mande quien las mande. Guardarlas sería dejar datos que contradicen
    # el modo (y que la etiqueta o el mensaje podrían imprimir).
    despacho = modo_de(data) == ModoEntrega.DESPACHO

    # 1. Buscar o Crear Persona
    #
    # LA IDENTIDAD DEL CLIENTE LA DECIDE EL RUT. SOLO EL RUT.
    #
    # Antes tambien se buscaba por email y por telefono cuando no habia rut o
    # no calzaba, y eso mezclaba pedidos de personas DISTINTAS que comparten un
    # telefono o un correo -pareja, familia, el telefono del local- bajo un
    # mismo cliente. El telefono y el correo son datos de contacto, no
    # identidad: no deciden quien es quien.
    persona = None

    if data.persona_id:
        persona = session.get(Persona, data.persona_id)

    if not persona and data.rut:
        persona = session.exec(select(Persona).where(Persona.rut == data.rut)).first()

    # El nombre con el que se identifico ESTE pedido, tal cual se escribio.
    # Se guarda siempre en la cotizacion (ver mas abajo), sin importar si
    # coincide o no con el de la Persona.
    nombre_contacto = f"{(data.nombres or '').strip()} {(data.apellidos or '').strip()}".strip() or None

    if not persona:
        nombres_final = data.nombres or "Cliente"
        apellidos_final = data.apellidos or ""
        persona = Persona(
            rut=data.rut,
            nombres=nombres_final,
            apellidos=apellidos_final,
            email_personal=data.email_personal,
            telefono=data.telefono,
            tipo_persona=TipoPersona.CLIENTE if data.origen == OrigenCotizacion.MANUAL else TipoPersona.LEAD
        )
        session.add(persona)
        session.commit()
        session.refresh(persona)
    else:
        # MISMO RUT, ¿MISMO NOMBRE?
        #
        # "Mismo nombre" tolera mayusculas, minusculas y tildes -"Maria Jose"
        # y "MARIA JOSÉ" son la misma persona escribiendo distinto-, pero no
        # tolera un nombre de verdad diferente. Ahi no se sabe si quien
        # escribio se equivoco de RUT, o si el RUT es compartido (un
        # familiar, una cuenta empresarial) y se trata de otra persona.
        #
        # En cualquier caso la Persona ya existe por ese RUT y no se puede
        # crear una segunda con el mismo RUT (es unico en la base), asi que
        # se sigue usando esta misma fila para vincular el pedido. Lo que NO
        # se hace es pisarle el nombre con el que llego esta vez: ese nombre
        # queda en la cotizacion (`nombre_contacto`, ya calculado arriba), y
        # de ahi lo toman la lista de pedidos y la orden de corte.
        nombre_nuevo = f"{(data.nombres or '').strip()} {(data.apellidos or '').strip()}".strip()
        nombre_guardado = f"{persona.nombres} {persona.apellidos}".strip()
        mismo_nombre = not nombre_nuevo or core_propuestas.normalizar(nombre_nuevo) == core_propuestas.normalizar(nombre_guardado)

        update_needed = False
        if data.rut and not persona.rut:
            persona.rut = data.rut
            update_needed = True
        if data.email_personal and not persona.email_personal:
            persona.email_personal = data.email_personal
            update_needed = True
        if data.telefono and not persona.telefono:
            persona.telefono = data.telefono
            update_needed = True
        if mismo_nombre and data.nombres and persona.nombres == "Cliente":
            persona.nombres = data.nombres
            update_needed = True

        if update_needed:
            session.add(persona)
            session.commit()
            session.refresh(persona)
            
    # 1.5 Crear o Buscar Direccion si viene en el payload (solo un despacho tiene)
    if despacho and data.comuna_id and data.direccion:
        direccion_existente = session.exec(
            select(Direccion).where(
                Direccion.persona_id == persona.id,
                Direccion.comuna_id == data.comuna_id,
                Direccion.calle_y_numero == data.direccion
            )
        ).first()
        
        if not direccion_existente:
            nueva_direccion = Direccion(
                persona_id=persona.id,
                comuna_id=data.comuna_id,
                calle_y_numero=data.direccion
            )
            session.add(nueva_direccion)
            session.commit()
            
    # 2. Crear Cotizacion
    numero = session.execute(text("SELECT nextval('cotizaciones_numero_seq')")).scalar_one()
    cotizacion = Cotizacion(
        numero=numero,
        persona_id=persona.id,
        origen=data.origen,
        mensaje=data.mensaje,
        tipo_grupo=data.tipo_grupo,
        cantidad_aprox=data.cantidad_aprox,
        fecha_evento=data.fecha_evento,
        modo_entrega=modo_de(data),
        # Un retiro no tiene transportista ni destino: guardarlos sería dejar
        # datos que contradicen el modo.
        transporte=data.transporte if despacho else None,
        tipo_despacho=data.tipo_despacho if despacho else None,
        region=(data.region or None) if despacho else None,
        comuna=(data.comuna or None) if despacho else None,
        direccion=(data.direccion or None) if despacho else None,
        nombre_contacto=nombre_contacto,
        canal=canal,
        estado=EstadoCotizacion.NUEVA
    )
    session.add(cotizacion)
    session.commit()
    session.refresh(cotizacion)
    
    # 3. Crear Items
    for posicion, item_data in enumerate(data.items):
        # Qué prenda es (variante, personalizada de un producto, o escrita a
        # mano) y su precio en tres estados: ver core/pedidos/prendas.py.
        item = CotizacionItem(
            cotizacion_id=cotizacion.id,
            posicion=posicion,
            **prenda_desde(session, item_data, permitir_sin_costo),
        )
        session.add(item)

        # Lo que el cliente propuso y no existe en el catalogo queda registrado
        # como propuesta, con quien la pidio y de que pedido salio. El pedido no
        # se cae si algo de esto falla: registrar es un efecto, no el objetivo.
        if item_data.config_propuesta:
            try:
                core_propuestas.registrar(
                    session,
                    item_data.config_propuesta,
                    persona_id=cotizacion.persona_id,
                    cotizacion_id=cotizacion.id,
                )
            except Exception:
                pass

    origen = getattr(cotizacion.origen, "value", cotizacion.origen)
    anotar(session, cotizacion, TipoEvento.CREADO, actor, origen=origen, canal=canal)
    session.commit()
    session.refresh(cotizacion)

    return cotizacion
