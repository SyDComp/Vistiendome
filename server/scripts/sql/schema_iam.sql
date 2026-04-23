-- Arquitectura IAM & RRHH Enterprise (V2.1) con refinamientos
-- Incluye normativas chilenas y capacidades Zero-Trust/Vaulting

CREATE TABLE estado_cuenta (
    id VARCHAR(26) PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE personas (
    id VARCHAR(26) PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email_personal VARCHAR(255),
    telefono VARCHAR(20),
    estado VARCHAR(50) DEFAULT 'ACTIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perfiles_cliente (
    id VARCHAR(26) PRIMARY KEY,
    persona_id VARCHAR(26) UNIQUE NOT NULL REFERENCES personas(id),
    tipo_perfil VARCHAR(50) NOT NULL,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cuentas_acceso (
    id VARCHAR(26) PRIMARY KEY,
    persona_id VARCHAR(26) UNIQUE NOT NULL REFERENCES personas(id),
    email_corporativo VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    estado_id VARCHAR(26) NOT NULL REFERENCES estado_cuenta(id),
    intentos_fallidos INT DEFAULT 0,
    mfa_secret VARCHAR(255),
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permisos (
    id VARCHAR(26) PRIMARY KEY,
    recurso VARCHAR(100) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    UNIQUE(recurso, accion)
);

CREATE TABLE usuario_permisos_directos (
    cuenta_id VARCHAR(26) NOT NULL REFERENCES cuentas_acceso(id) ON DELETE CASCADE,
    permiso_id VARCHAR(26) NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (cuenta_id, permiso_id)
);

-- Refinamiento 2: Tabla de Políticas de Acceso (Zero-Trust PBAC Extendido)
CREATE TABLE politicas_acceso (
    id VARCHAR(26) PRIMARY KEY,
    permiso_id VARCHAR(26) NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    condicion VARCHAR(100) NOT NULL,
    valor VARCHAR(255) NOT NULL
);

CREATE TABLE historial_remuneraciones (
    id VARCHAR(26) PRIMARY KEY,
    persona_id VARCHAR(26) NOT NULL REFERENCES personas(id),
    sueldo_base DECIMAL(12, 2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_remun CHECK (fecha_fin IS NULL OR fecha_inicio <= fecha_fin)
);

CREATE TABLE contratos_legales (
    id VARCHAR(26) PRIMARY KEY,
    persona_id VARCHAR(26) NOT NULL REFERENCES personas(id),
    cargo VARCHAR(150) NOT NULL,
    hash_respaldo_pdf VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_contrato CHECK (fecha_fin IS NULL OR fecha_inicio <= fecha_fin)
);

CREATE TABLE datos_bancarios (
    id VARCHAR(26) PRIMARY KEY,
    persona_id VARCHAR(26) UNIQUE NOT NULL REFERENCES personas(id),
    banco VARCHAR(100) NOT NULL,
    tipo_cuenta VARCHAR(50) NOT NULL,
    numero_cuenta_vault VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auditoria_acceso_sensible (
    id VARCHAR(26) PRIMARY KEY,
    actor_cuenta_id VARCHAR(26) NOT NULL, 
    persona_afectada_id VARCHAR(26) NOT NULL,
    recurso_accedido_id VARCHAR(26) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    detalle TEXT
);

-- Índices de optimización y consultas frecuentes
CREATE INDEX idx_personas_rut ON personas(rut);
CREATE INDEX idx_cuentas_email ON cuentas_acceso(email_corporativo);
CREATE INDEX idx_remuneraciones_vigente ON historial_remuneraciones(persona_id) WHERE fecha_fin IS NULL;
CREATE INDEX idx_contratos_vigente ON contratos_legales(persona_id) WHERE fecha_fin IS NULL;
CREATE INDEX idx_auditoria_actor ON auditoria_acceso_sensible(actor_cuenta_id);

-- Refinamiento 1: Índice Compuesto para Auditoría
CREATE INDEX idx_auditoria_persona_fecha ON auditoria_acceso_sensible(persona_afectada_id, timestamp DESC);
