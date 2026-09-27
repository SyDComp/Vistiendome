CREATE TYPE public.attributetype AS ENUM (
    'text',
    'select',
    'multiselect',
    'number',
    'color'
);

CREATE TYPE public.estadocotizacion AS ENUM (
    'NUEVA',
    'EN_PROCESO',
    'CERRADA_EXITO',
    'CERRADA_PERDIDA'
);

CREATE TYPE public.estadoordencorte AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'FINALIZADA',
    'CANCELADA'
);

CREATE TYPE public.estadopropuesta AS ENUM (
    'PENDIENTE',
    'APROBADA',
    'RECHAZADA'
);

CREATE TYPE public.modoentrega AS ENUM (
    'RETIRO',
    'DESPACHO'
);

CREATE TYPE public.movementtype AS ENUM (
    'RECEIPT',
    'SALE',
    'RESERVATION',
    'ADJUSTMENT',
    'RETURN'
);

CREATE TYPE public.origencotizacion AS ENUM (
    'CATALOGO',
    'CONTACTO_INDIVIDUAL',
    'CONTACTO_GRUPAL',
    'MANUAL'
);

CREATE TYPE public.tipodespacho AS ENUM (
    'DOMICILIO',
    'SUCURSAL'
);

CREATE TYPE public.tipopersona AS ENUM (
    'LEAD',
    'CLIENTE',
    'EMPLEADO'
);

CREATE TYPE public.tipotransporte AS ENUM (
    'STARKEN',
    'CORREOS_DE_CHILE',
    'CHILEXPRESS',
    'RETIRO_LOCAL',
    'OTRO'
);

CREATE TYPE public.userrole AS ENUM (
    'ADMIN',
    'WORKER',
    'CLIENT'
);

CREATE TABLE public.analytics_event (
    id integer NOT NULL,
    type character varying NOT NULL,
    product_id integer,
    sku character varying,
    query character varying,
    session_id character varying,
    meta json NOT NULL,
    created_at timestamp without time zone NOT NULL
);

CREATE SEQUENCE public.analytics_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.analytics_event_id_seq OWNED BY public.analytics_event.id;

CREATE TABLE public.attribute (
    id integer NOT NULL,
    name character varying NOT NULL,
    "values" json DEFAULT '[]'::json,
    type public.attributetype DEFAULT 'text'::public.attributetype,
    description character varying,
    value_structure json DEFAULT '[]'::json,
    domain json DEFAULT '[]'::json,
    is_filterable boolean DEFAULT true,
    is_system boolean DEFAULT false,
    system_id character varying(50) DEFAULT NULL::character varying,
    afecta_apariencia boolean DEFAULT false NOT NULL,
    en_orden_corte boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE public.attribute_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.attribute_id_seq OWNED BY public.attribute.id;

CREATE TABLE public.attributetemplate (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying
);

CREATE SEQUENCE public.attributetemplate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.attributetemplate_id_seq OWNED BY public.attributetemplate.id;

CREATE TABLE public.auditoria_acceso_sensible (
    id character varying(26) NOT NULL,
    actor_cuenta_id character varying(26) NOT NULL,
    persona_afectada_id character varying(26) NOT NULL,
    recurso_accedido_id character varying(26) NOT NULL,
    ip_address character varying(45) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    detalle text
);

CREATE TABLE public.category (
    id integer NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    parent_id integer,
    level integer DEFAULT 1,
    path character varying DEFAULT ''::character varying,
    created_at timestamp with time zone DEFAULT now(),
    template_id integer,
    is_filterable boolean DEFAULT true
);

CREATE SEQUENCE public.category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.category_id_seq OWNED BY public.category.id;

CREATE TABLE public.categoryattributelink (
    category_id integer NOT NULL,
    attribute_id integer NOT NULL
);

CREATE TABLE public.categorycharacteristiclink (
    category_id integer NOT NULL,
    characteristic_id integer NOT NULL
);

CREATE TABLE public.categoryspecificationlink (
    category_id integer NOT NULL,
    specification_id integer NOT NULL
);

CREATE TABLE public.collection (
    id integer NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    description character varying,
    image_url character varying,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE public.collection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.collection_id_seq OWNED BY public.collection.id;

CREATE TABLE public.collectionskulink (
    collection_id integer NOT NULL,
    sku_id integer NOT NULL
);

CREATE TABLE public.colorswatch (
    id integer NOT NULL,
    name character varying NOT NULL,
    hex_code character varying NOT NULL,
    slug character varying NOT NULL
);

CREATE SEQUENCE public.colorswatch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.colorswatch_id_seq OWNED BY public.colorswatch.id;

CREATE TABLE public.comunas (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    region_id integer NOT NULL
);

CREATE SEQUENCE public.comunas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.comunas_id_seq OWNED BY public.comunas.id;

CREATE TABLE public.contratos_legales (
    id character varying(26) NOT NULL,
    persona_id character varying(26) NOT NULL,
    cargo character varying(150) NOT NULL,
    hash_respaldo_pdf character varying(255) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_contrato CHECK (((fecha_fin IS NULL) OR (fecha_inicio <= fecha_fin)))
);

CREATE TABLE public.cotizacion_items (
    id character varying(26) NOT NULL,
    cotizacion_id character varying(26) NOT NULL,
    sku_id integer,
    cantidad integer NOT NULL,
    precio_unitario_estimado double precision NOT NULL,
    nombre_custom character varying(255),
    cortado boolean DEFAULT false NOT NULL,
    config_custom json,
    config_propuesta json
);

CREATE TABLE public.cotizaciones (
    id character varying(26) NOT NULL,
    persona_id character varying(26) NOT NULL,
    origen public.origencotizacion NOT NULL,
    estado character varying(20) NOT NULL,
    mensaje character varying,
    tipo_grupo character varying,
    cantidad_aprox integer,
    fecha_evento character varying,
    transporte character varying(100),
    tipo_despacho public.tipodespacho,
    region character varying(100),
    comuna character varying(100),
    direccion character varying(255),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    numero integer NOT NULL,
    modo_entrega character varying(20),
    nombre_contacto character varying(200)
);

CREATE SEQUENCE public.cotizaciones_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cotizaciones_numero_seq OWNED BY public.cotizaciones.numero;

CREATE TABLE public.cuentas_acceso (
    id character varying(26) NOT NULL,
    persona_id character varying(26) NOT NULL,
    email_corporativo character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    estado_id character varying(26) NOT NULL,
    intentos_fallidos integer DEFAULT 0,
    mfa_secret character varying(255),
    ultimo_acceso timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    apodo character varying
);

CREATE TABLE public.datos_bancarios (
    id character varying(26) NOT NULL,
    persona_id character varying(26) NOT NULL,
    banco character varying(100) NOT NULL,
    tipo_cuenta character varying(50) NOT NULL,
    numero_cuenta_vault character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.direcciones (
    id character varying(26) NOT NULL,
    persona_id character varying(26) NOT NULL,
    comuna_id integer NOT NULL,
    calle_y_numero character varying(255) NOT NULL,
    referencia character varying(255),
    created_at timestamp without time zone NOT NULL
);

CREATE TABLE public.estado_cuenta (
    id character varying(26) NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);

CREATE TABLE public.helpsection (
    id integer NOT NULL,
    slug character varying NOT NULL,
    title character varying NOT NULL,
    icon character varying NOT NULL,
    "order" integer NOT NULL,
    is_active boolean NOT NULL
);

CREATE SEQUENCE public.helpsection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.helpsection_id_seq OWNED BY public.helpsection.id;

CREATE TABLE public.historial_remuneraciones (
    id character varying(26) NOT NULL,
    persona_id character varying(26) NOT NULL,
    sueldo_base numeric(12,2) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_remun CHECK (((fecha_fin IS NULL) OR (fecha_inicio <= fecha_fin)))
);

CREATE TABLE public.homepagesection (
    id integer NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    config json NOT NULL,
    "order" integer NOT NULL,
    is_active boolean NOT NULL,
    page character varying DEFAULT 'homepage'::character varying
);

CREATE SEQUENCE public.homepagesection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.homepagesection_id_seq OWNED BY public.homepagesection.id;

CREATE TABLE public.mediaasset (
    id integer NOT NULL,
    filename character varying NOT NULL,
    original_name character varying NOT NULL,
    url character varying NOT NULL,
    mime_type character varying,
    file_size integer,
    metadata_json json NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    alias character varying
);

CREATE SEQUENCE public.mediaasset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.mediaasset_id_seq OWNED BY public.mediaasset.id;

CREATE TABLE public.opciones_propuestas (
    id character varying(26) NOT NULL,
    attribute_id integer NOT NULL,
    valor character varying(120) NOT NULL,
    valor_normalizado character varying(120) NOT NULL,
    persona_id character varying(26),
    cotizacion_id character varying(26),
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    creado_en timestamp without time zone NOT NULL,
    resuelto_en timestamp without time zone
);

CREATE TABLE public.orden_corte_items (
    id character varying(26) NOT NULL,
    orden_id character varying(26) NOT NULL,
    sku_id integer,
    cantidad integer DEFAULT 1 NOT NULL,
    cotizacion_item_id character varying(26),
    nombre_custom character varying(255),
    config_custom json,
    config_propuesta json
);

CREATE TABLE public.ordenes_corte (
    id character varying(26) NOT NULL,
    numero integer,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    notas character varying,
    repetida_de_id character varying(26),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    finalizada_at timestamp without time zone
);

CREATE SEQUENCE public.ordenes_corte_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.perfiles_cliente (
    id character varying(26) NOT NULL,
    persona_id character varying(26) NOT NULL,
    tipo_perfil character varying(50) NOT NULL,
    descuento_porcentaje numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.permisos (
    id character varying(26) NOT NULL,
    recurso character varying(100) NOT NULL,
    accion character varying(100) NOT NULL,
    descripcion text
);

CREATE TABLE public.personas (
    id character varying(26) NOT NULL,
    rut character varying(12) NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    email_personal character varying(255),
    telefono character varying(20),
    estado character varying(50) DEFAULT 'ACTIVO'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    transporte_preferido character varying(50),
    tipo_persona character varying(50) DEFAULT 'LEAD'::character varying
);

CREATE TABLE public.politicas_acceso (
    id character varying(26) NOT NULL,
    permiso_id character varying(26) NOT NULL,
    condicion character varying(100) NOT NULL,
    valor character varying(255) NOT NULL
);

CREATE TABLE public.product (
    id integer NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    description character varying NOT NULL,
    category_id integer NOT NULL,
    specs json NOT NULL,
    extras jsonb DEFAULT '{}'::jsonb,
    is_deleted boolean DEFAULT false,
    sale_start timestamp without time zone,
    sale_end timestamp without time zone,
    sale_type character varying,
    sale_value double precision
);

CREATE SEQUENCE public.product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.product_id_seq OWNED BY public.product.id;

CREATE TABLE public.productimage (
    id integer NOT NULL,
    product_id integer NOT NULL,
    url character varying NOT NULL,
    is_main boolean NOT NULL,
    ui_config jsonb DEFAULT '{}'::jsonb,
    config_match json DEFAULT '{}'::json
);

CREATE SEQUENCE public.productimage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.productimage_id_seq OWNED BY public.productimage.id;

CREATE TABLE public.productmedialink (
    product_id integer NOT NULL,
    media_asset_id integer NOT NULL,
    is_main boolean NOT NULL,
    ui_config json NOT NULL
);

CREATE TABLE public.productoption (
    id integer NOT NULL,
    product_id integer NOT NULL,
    attribute_id integer NOT NULL,
    allowed_values json NOT NULL
);

CREATE SEQUENCE public.productoption_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.productoption_id_seq OWNED BY public.productoption.id;

CREATE TABLE public.regiones (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL
);

CREATE SEQUENCE public.regiones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.regiones_id_seq OWNED BY public.regiones.id;

CREATE TABLE public.sitesetting (
    id integer NOT NULL,
    key character varying NOT NULL,
    value json NOT NULL
);

CREATE SEQUENCE public.sitesetting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sitesetting_id_seq OWNED BY public.sitesetting.id;

CREATE TABLE public.sku (
    id integer NOT NULL,
    product_id integer NOT NULL,
    sku character varying NOT NULL,
    config json NOT NULL,
    price double precision NOT NULL,
    barcode character varying,
    image_urls json DEFAULT '[]'::json,
    sale_start timestamp without time zone,
    sale_end timestamp without time zone,
    sale_type character varying,
    sale_value double precision
);

CREATE SEQUENCE public.sku_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sku_id_seq OWNED BY public.sku.id;

CREATE TABLE public.skumedialink (
    sku_id integer NOT NULL,
    media_asset_id integer NOT NULL
);

CREATE TABLE public.specification (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying
);

CREATE SEQUENCE public.specification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.specification_id_seq OWNED BY public.specification.id;

CREATE TABLE public.specificationcharacteristiclink (
    specification_id integer NOT NULL,
    characteristic_id integer NOT NULL,
    allowed_values json DEFAULT '[]'::json
);

CREATE TABLE public.stockmovement (
    id integer NOT NULL,
    sku_id integer NOT NULL,
    type public.movementtype NOT NULL,
    quantity integer NOT NULL,
    reference_id character varying,
    note character varying,
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE public.stockmovement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.stockmovement_id_seq OWNED BY public.stockmovement.id;

CREATE TABLE public.templateattributelink (
    template_id integer NOT NULL,
    attribute_id integer NOT NULL
);

CREATE TABLE public."user" (
    email character varying NOT NULL,
    full_name character varying,
    role public.userrole NOT NULL,
    is_active boolean NOT NULL,
    id integer NOT NULL,
    hashed_password character varying NOT NULL,
    created_at timestamp without time zone NOT NULL
);

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;

CREATE TABLE public.usuario_permisos_directos (
    cuenta_id character varying(26) NOT NULL,
    permiso_id character varying(26) NOT NULL,
    fecha_inicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_fin timestamp with time zone
);

ALTER TABLE ONLY public.analytics_event ALTER COLUMN id SET DEFAULT nextval('public.analytics_event_id_seq'::regclass);

ALTER TABLE ONLY public.attribute ALTER COLUMN id SET DEFAULT nextval('public.attribute_id_seq'::regclass);

ALTER TABLE ONLY public.attributetemplate ALTER COLUMN id SET DEFAULT nextval('public.attributetemplate_id_seq'::regclass);

ALTER TABLE ONLY public.category ALTER COLUMN id SET DEFAULT nextval('public.category_id_seq'::regclass);

ALTER TABLE ONLY public.collection ALTER COLUMN id SET DEFAULT nextval('public.collection_id_seq'::regclass);

ALTER TABLE ONLY public.colorswatch ALTER COLUMN id SET DEFAULT nextval('public.colorswatch_id_seq'::regclass);

ALTER TABLE ONLY public.comunas ALTER COLUMN id SET DEFAULT nextval('public.comunas_id_seq'::regclass);

ALTER TABLE ONLY public.helpsection ALTER COLUMN id SET DEFAULT nextval('public.helpsection_id_seq'::regclass);

ALTER TABLE ONLY public.homepagesection ALTER COLUMN id SET DEFAULT nextval('public.homepagesection_id_seq'::regclass);

ALTER TABLE ONLY public.mediaasset ALTER COLUMN id SET DEFAULT nextval('public.mediaasset_id_seq'::regclass);

ALTER TABLE ONLY public.product ALTER COLUMN id SET DEFAULT nextval('public.product_id_seq'::regclass);

ALTER TABLE ONLY public.productimage ALTER COLUMN id SET DEFAULT nextval('public.productimage_id_seq'::regclass);

ALTER TABLE ONLY public.productoption ALTER COLUMN id SET DEFAULT nextval('public.productoption_id_seq'::regclass);

ALTER TABLE ONLY public.regiones ALTER COLUMN id SET DEFAULT nextval('public.regiones_id_seq'::regclass);

ALTER TABLE ONLY public.sitesetting ALTER COLUMN id SET DEFAULT nextval('public.sitesetting_id_seq'::regclass);

ALTER TABLE ONLY public.sku ALTER COLUMN id SET DEFAULT nextval('public.sku_id_seq'::regclass);

ALTER TABLE ONLY public.specification ALTER COLUMN id SET DEFAULT nextval('public.specification_id_seq'::regclass);

ALTER TABLE ONLY public.stockmovement ALTER COLUMN id SET DEFAULT nextval('public.stockmovement_id_seq'::regclass);

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);

ALTER TABLE ONLY public.analytics_event
    ADD CONSTRAINT analytics_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attribute
    ADD CONSTRAINT attribute_name_key UNIQUE (name);

ALTER TABLE ONLY public.attribute
    ADD CONSTRAINT attribute_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attributetemplate
    ADD CONSTRAINT attributetemplate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auditoria_acceso_sensible
    ADD CONSTRAINT auditoria_acceso_sensible_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.categoryattributelink
    ADD CONSTRAINT categoryattributelink_pkey PRIMARY KEY (category_id, attribute_id);

ALTER TABLE ONLY public.categorycharacteristiclink
    ADD CONSTRAINT categorycharacteristiclink_pkey PRIMARY KEY (category_id, characteristic_id);

ALTER TABLE ONLY public.categoryspecificationlink
    ADD CONSTRAINT categoryspecificationlink_pkey PRIMARY KEY (category_id, specification_id);

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT collection_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.collectionskulink
    ADD CONSTRAINT collectionskulink_pkey PRIMARY KEY (collection_id, sku_id);

ALTER TABLE ONLY public.colorswatch
    ADD CONSTRAINT colorswatch_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.comunas
    ADD CONSTRAINT comunas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contratos_legales
    ADD CONSTRAINT contratos_legales_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cotizacion_items
    ADD CONSTRAINT cotizacion_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_numero_key UNIQUE (numero);

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cuentas_acceso
    ADD CONSTRAINT cuentas_acceso_email_corporativo_key UNIQUE (email_corporativo);

ALTER TABLE ONLY public.cuentas_acceso
    ADD CONSTRAINT cuentas_acceso_persona_id_key UNIQUE (persona_id);

ALTER TABLE ONLY public.cuentas_acceso
    ADD CONSTRAINT cuentas_acceso_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.datos_bancarios
    ADD CONSTRAINT datos_bancarios_persona_id_key UNIQUE (persona_id);

ALTER TABLE ONLY public.datos_bancarios
    ADD CONSTRAINT datos_bancarios_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.direcciones
    ADD CONSTRAINT direcciones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.estado_cuenta
    ADD CONSTRAINT estado_cuenta_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY public.estado_cuenta
    ADD CONSTRAINT estado_cuenta_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.helpsection
    ADD CONSTRAINT helpsection_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.historial_remuneraciones
    ADD CONSTRAINT historial_remuneraciones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.homepagesection
    ADD CONSTRAINT homepagesection_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mediaasset
    ADD CONSTRAINT mediaasset_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.opciones_propuestas
    ADD CONSTRAINT opciones_propuestas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orden_corte_items
    ADD CONSTRAINT orden_corte_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ordenes_corte
    ADD CONSTRAINT ordenes_corte_numero_key UNIQUE (numero);

ALTER TABLE ONLY public.ordenes_corte
    ADD CONSTRAINT ordenes_corte_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.perfiles_cliente
    ADD CONSTRAINT perfiles_cliente_persona_id_key UNIQUE (persona_id);

ALTER TABLE ONLY public.perfiles_cliente
    ADD CONSTRAINT perfiles_cliente_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_recurso_accion_key UNIQUE (recurso, accion);

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_rut_key UNIQUE (rut);

ALTER TABLE ONLY public.politicas_acceso
    ADD CONSTRAINT politicas_acceso_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.productimage
    ADD CONSTRAINT productimage_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.productmedialink
    ADD CONSTRAINT productmedialink_pkey PRIMARY KEY (product_id, media_asset_id);

ALTER TABLE ONLY public.productoption
    ADD CONSTRAINT productoption_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.regiones
    ADD CONSTRAINT regiones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sitesetting
    ADD CONSTRAINT sitesetting_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sku
    ADD CONSTRAINT sku_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.skumedialink
    ADD CONSTRAINT skumedialink_pkey PRIMARY KEY (sku_id, media_asset_id);

ALTER TABLE ONLY public.specification
    ADD CONSTRAINT specification_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.specificationcharacteristiclink
    ADD CONSTRAINT specificationcharacteristiclink_pkey PRIMARY KEY (specification_id, characteristic_id);

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.templateattributelink
    ADD CONSTRAINT templateattributelink_pkey PRIMARY KEY (template_id, attribute_id);

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.usuario_permisos_directos
    ADD CONSTRAINT usuario_permisos_directos_pkey PRIMARY KEY (cuenta_id, permiso_id);

CREATE INDEX idx_auditoria_actor ON public.auditoria_acceso_sensible USING btree (actor_cuenta_id);

CREATE INDEX idx_auditoria_persona_fecha ON public.auditoria_acceso_sensible USING btree (persona_afectada_id, "timestamp" DESC);

CREATE INDEX idx_contratos_vigente ON public.contratos_legales USING btree (persona_id) WHERE (fecha_fin IS NULL);

CREATE INDEX idx_cuentas_email ON public.cuentas_acceso USING btree (email_corporativo);

CREATE INDEX idx_personas_rut ON public.personas USING btree (rut);

CREATE INDEX idx_remuneraciones_vigente ON public.historial_remuneraciones USING btree (persona_id) WHERE (fecha_fin IS NULL);

CREATE INDEX ix_analytics_event_created_at ON public.analytics_event USING btree (created_at);

CREATE INDEX ix_analytics_event_product_id ON public.analytics_event USING btree (product_id);

CREATE INDEX ix_analytics_event_session_id ON public.analytics_event USING btree (session_id);

CREATE INDEX ix_analytics_event_sku ON public.analytics_event USING btree (sku);

CREATE INDEX ix_analytics_event_type ON public.analytics_event USING btree (type);

CREATE UNIQUE INDEX ix_attributetemplate_name ON public.attributetemplate USING btree (name);

CREATE INDEX ix_category_name ON public.category USING btree (name);

CREATE INDEX ix_category_path ON public.category USING btree (path);

CREATE UNIQUE INDEX ix_category_slug ON public.category USING btree (slug);

CREATE UNIQUE INDEX ix_collection_name ON public.collection USING btree (name);

CREATE UNIQUE INDEX ix_collection_slug ON public.collection USING btree (slug);

CREATE UNIQUE INDEX ix_colorswatch_name ON public.colorswatch USING btree (name);

CREATE UNIQUE INDEX ix_colorswatch_slug ON public.colorswatch USING btree (slug);

CREATE INDEX ix_comunas_region_id ON public.comunas USING btree (region_id);

CREATE INDEX ix_cotizacion_items_cotizacion_id ON public.cotizacion_items USING btree (cotizacion_id);

CREATE INDEX ix_cotizacion_items_sku_id ON public.cotizacion_items USING btree (sku_id);

CREATE INDEX ix_cotizaciones_numero ON public.cotizaciones USING btree (numero);

CREATE INDEX ix_cotizaciones_persona_id ON public.cotizaciones USING btree (persona_id);

CREATE INDEX ix_direcciones_comuna_id ON public.direcciones USING btree (comuna_id);

CREATE INDEX ix_direcciones_persona_id ON public.direcciones USING btree (persona_id);

CREATE UNIQUE INDEX ix_helpsection_slug ON public.helpsection USING btree (slug);

CREATE INDEX ix_homepagesection_type ON public.homepagesection USING btree (type);

CREATE UNIQUE INDEX ix_mediaasset_filename ON public.mediaasset USING btree (filename);

CREATE INDEX ix_opciones_propuestas_attribute_id ON public.opciones_propuestas USING btree (attribute_id);

CREATE INDEX ix_opciones_propuestas_cotizacion_id ON public.opciones_propuestas USING btree (cotizacion_id);

CREATE INDEX ix_opciones_propuestas_estado ON public.opciones_propuestas USING btree (estado);

CREATE INDEX ix_opciones_propuestas_persona_id ON public.opciones_propuestas USING btree (persona_id);

CREATE INDEX ix_opciones_propuestas_valor_normalizado ON public.opciones_propuestas USING btree (valor_normalizado);

CREATE INDEX ix_orden_corte_items_cot_item ON public.orden_corte_items USING btree (cotizacion_item_id);

CREATE INDEX ix_orden_corte_items_orden_id ON public.orden_corte_items USING btree (orden_id);

CREATE INDEX ix_orden_corte_items_sku_id ON public.orden_corte_items USING btree (sku_id);

CREATE INDEX ix_ordenes_corte_estado ON public.ordenes_corte USING btree (estado);

CREATE INDEX ix_ordenes_corte_numero ON public.ordenes_corte USING btree (numero);

CREATE INDEX ix_product_name ON public.product USING btree (name);

CREATE UNIQUE INDEX ix_product_slug ON public.product USING btree (slug);

CREATE UNIQUE INDEX ix_sitesetting_key ON public.sitesetting USING btree (key);

CREATE UNIQUE INDEX ix_sku_barcode ON public.sku USING btree (barcode);

CREATE UNIQUE INDEX ix_sku_sku ON public.sku USING btree (sku);

CREATE UNIQUE INDEX ix_specification_name ON public.specification USING btree (name);

CREATE UNIQUE INDEX ix_user_email ON public."user" USING btree (email);

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.category(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.attributetemplate(id);

ALTER TABLE ONLY public.categoryattributelink
    ADD CONSTRAINT categoryattributelink_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attribute(id);

ALTER TABLE ONLY public.categoryattributelink
    ADD CONSTRAINT categoryattributelink_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id);

ALTER TABLE ONLY public.categorycharacteristiclink
    ADD CONSTRAINT categorycharacteristiclink_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id);

ALTER TABLE ONLY public.categorycharacteristiclink
    ADD CONSTRAINT categorycharacteristiclink_characteristic_id_fkey FOREIGN KEY (characteristic_id) REFERENCES public.attribute(id);

ALTER TABLE ONLY public.categoryspecificationlink
    ADD CONSTRAINT categoryspecificationlink_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id);

ALTER TABLE ONLY public.categoryspecificationlink
    ADD CONSTRAINT categoryspecificationlink_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specification(id);

ALTER TABLE ONLY public.collectionskulink
    ADD CONSTRAINT collectionskulink_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collection(id);

ALTER TABLE ONLY public.collectionskulink
    ADD CONSTRAINT collectionskulink_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.sku(id);

ALTER TABLE ONLY public.comunas
    ADD CONSTRAINT comunas_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regiones(id);

ALTER TABLE ONLY public.contratos_legales
    ADD CONSTRAINT contratos_legales_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.cotizacion_items
    ADD CONSTRAINT cotizacion_items_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizaciones(id);

ALTER TABLE ONLY public.cotizacion_items
    ADD CONSTRAINT cotizacion_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.sku(id);

ALTER TABLE ONLY public.cotizaciones
    ADD CONSTRAINT cotizaciones_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.cuentas_acceso
    ADD CONSTRAINT cuentas_acceso_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estado_cuenta(id);

ALTER TABLE ONLY public.cuentas_acceso
    ADD CONSTRAINT cuentas_acceso_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.datos_bancarios
    ADD CONSTRAINT datos_bancarios_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.direcciones
    ADD CONSTRAINT direcciones_comuna_id_fkey FOREIGN KEY (comuna_id) REFERENCES public.comunas(id);

ALTER TABLE ONLY public.direcciones
    ADD CONSTRAINT direcciones_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.historial_remuneraciones
    ADD CONSTRAINT historial_remuneraciones_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.opciones_propuestas
    ADD CONSTRAINT opciones_propuestas_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attribute(id);

ALTER TABLE ONLY public.opciones_propuestas
    ADD CONSTRAINT opciones_propuestas_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizaciones(id);

ALTER TABLE ONLY public.opciones_propuestas
    ADD CONSTRAINT opciones_propuestas_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.orden_corte_items
    ADD CONSTRAINT orden_corte_items_cotizacion_item_id_fkey FOREIGN KEY (cotizacion_item_id) REFERENCES public.cotizacion_items(id);

ALTER TABLE ONLY public.orden_corte_items
    ADD CONSTRAINT orden_corte_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes_corte(id);

ALTER TABLE ONLY public.orden_corte_items
    ADD CONSTRAINT orden_corte_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.sku(id);

ALTER TABLE ONLY public.ordenes_corte
    ADD CONSTRAINT ordenes_corte_repetida_de_id_fkey FOREIGN KEY (repetida_de_id) REFERENCES public.ordenes_corte(id);

ALTER TABLE ONLY public.perfiles_cliente
    ADD CONSTRAINT perfiles_cliente_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);

ALTER TABLE ONLY public.politicas_acceso
    ADD CONSTRAINT politicas_acceso_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id);

ALTER TABLE ONLY public.productimage
    ADD CONSTRAINT productimage_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id);

ALTER TABLE ONLY public.productmedialink
    ADD CONSTRAINT productmedialink_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.mediaasset(id);

ALTER TABLE ONLY public.productmedialink
    ADD CONSTRAINT productmedialink_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id);

ALTER TABLE ONLY public.productoption
    ADD CONSTRAINT productoption_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attribute(id);

ALTER TABLE ONLY public.productoption
    ADD CONSTRAINT productoption_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id);

ALTER TABLE ONLY public.sku
    ADD CONSTRAINT sku_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id);

ALTER TABLE ONLY public.skumedialink
    ADD CONSTRAINT skumedialink_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.mediaasset(id);

ALTER TABLE ONLY public.skumedialink
    ADD CONSTRAINT skumedialink_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.sku(id);

ALTER TABLE ONLY public.specificationcharacteristiclink
    ADD CONSTRAINT specificationcharacteristiclink_characteristic_id_fkey FOREIGN KEY (characteristic_id) REFERENCES public.attribute(id);

ALTER TABLE ONLY public.specificationcharacteristiclink
    ADD CONSTRAINT specificationcharacteristiclink_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specification(id);

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.sku(id);

ALTER TABLE ONLY public.templateattributelink
    ADD CONSTRAINT templateattributelink_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attribute(id);

ALTER TABLE ONLY public.templateattributelink
    ADD CONSTRAINT templateattributelink_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.attributetemplate(id);

ALTER TABLE ONLY public.usuario_permisos_directos
    ADD CONSTRAINT usuario_permisos_directos_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.cuentas_acceso(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.usuario_permisos_directos
    ADD CONSTRAINT usuario_permisos_directos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;
