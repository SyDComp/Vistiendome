"""Datos maestros: estados de cuenta, permisos, regiones y comunas, ayuda

Revision ID: e688c40a31b3
Revises: c1d2e3f4a5b6
Create Date: 2026-09-27 00:00:00.000000

Los datos sin los cuales el sistema no funciona en una base recien creada:

- Estados de cuenta: crear el primer administrador exige el estado ACTIVO.
- Permisos: el primer administrador recibe todos los que existan, y el panel
  entero exige SISTEMA:ADMINISTRAR.
- Regiones y comunas de Chile: las direcciones de despacho se eligen de ellas.
- Secciones de la pagina de ayuda: su contenido se escribe desde el panel.

Solo agrega lo que falta. En una base que ya los tiene no cambia nada, asi
que es segura de aplicar sobre produccion y sobre una restauracion.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import ulid

# revision identifiers, used by Alembic.
revision: str = 'e688c40a31b3'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ESTADOS_CUENTA = (
    "ACTIVO",
    "BLOQUEADO",
    "PENDIENTE_VALIDACION",
    "ELIMINADO",
    "ANONIMIZADO",
)

# (recurso, accion, descripcion)
PERMISOS = (
    ("SISTEMA", "ADMINISTRAR", "Acceso total al sistema"),
    ("RRHH", "VER_SUELDOS", "Sensible, requiere MFA para protección de LRE (Libro de Remuneraciones Electrónico)"),
    ("RRHH", "EDITAR_CONTRATOS", "Edición legal para el historial contractual (SCD Tipo 2)"),
    ("INVENTARIO", "VER_STOCK", "Auditoría de pañol o stock físico"),
    ("CRM", "VER_CLIENTES", "Visualización de perfiles completos de cliente"),
)

# (slug, titulo, icono), en el orden en que se muestran
SECCIONES_AYUDA = (
    ("tallas", "Guía de Tallas", "📏"),
    ("faq", "Preguntas Frecuentes", "❓"),
    ("cambios", "Cambios y Devoluciones", "🔄"),
    ("envios", "Envíos y Seguimiento", "🚚"),
    ("cuidados", "Cuidado de Prendas", "✨"),
)

# (id, region, [(id, comuna), ...]). Los ids son fijos para que una misma
# comuna tenga el mismo id en toda instalacion y en todo respaldo.
REGIONES = [
    (1, 'Región de Tarapacá', [
        (1, 'Iquique'),
        (2, 'Alto Hospicio'),
        (3, 'Pozo Almonte'),
        (4, 'Camiña'),
        (5, 'Colchane'),
        (6, 'Huara'),
        (7, 'Pica'),
    ]),
    (2, 'Región de Antofagasta', [
        (8, 'Antofagasta'),
        (9, 'Mejillones'),
        (10, 'Sierra Gorda'),
        (11, 'Taltal'),
        (12, 'Calama'),
        (13, 'Ollagüe'),
        (14, 'San Pedro de Atacama'),
        (15, 'Tocopilla'),
        (16, 'María Elena'),
    ]),
    (3, 'Región de Atacama', [
        (17, 'Copiapó'),
        (18, 'Caldera'),
        (19, 'Tierra Amarilla'),
        (20, 'Chañaral'),
        (21, 'Diego de Almagro'),
        (22, 'Vallenar'),
        (23, 'Alto del Carmen'),
        (24, 'Freirina'),
        (25, 'Huasco'),
    ]),
    (4, 'Región de Coquimbo', [
        (26, 'La Serena'),
        (27, 'Coquimbo'),
        (28, 'Andacollo'),
        (29, 'La Higuera'),
        (30, 'Paihuano'),
        (31, 'Vicuña'),
        (32, 'Illapel'),
        (33, 'Canela'),
        (34, 'Los Vilos'),
        (35, 'Salamanca'),
        (36, 'Ovalle'),
        (37, 'Combarbalá'),
        (38, 'Monte Patria'),
        (39, 'Punitaqui'),
        (40, 'Río Hurtado'),
    ]),
    (5, 'Región de Valparaíso', [
        (41, 'Valparaíso'),
        (42, 'Casablanca'),
        (43, 'Concón'),
        (44, 'Juan Fernández'),
        (45, 'Puchuncaví'),
        (46, 'Quintero'),
        (47, 'Viña del Mar'),
        (48, 'Isla de Pascua'),
        (49, 'Los Andes'),
        (50, 'Calle Larga'),
        (51, 'Rinconada'),
        (52, 'San Esteban'),
        (53, 'La Ligua'),
        (54, 'Cabildo'),
        (55, 'Papudo'),
        (56, 'Petorca'),
        (57, 'Zapallar'),
        (58, 'Quillota'),
        (59, 'La Calera'),
        (60, 'Hijuelas'),
        (61, 'La Cruz'),
        (62, 'Nogales'),
        (63, 'San Antonio'),
        (64, 'Algarrobo'),
        (65, 'Cartagena'),
        (66, 'El Quisco'),
        (67, 'El Tabo'),
        (68, 'Santo Domingo'),
        (69, 'San Felipe'),
        (70, 'Catemu'),
        (71, 'Llaillay'),
        (72, 'Panquehue'),
        (73, 'Putaendo'),
        (74, 'Santa María'),
        (75, 'Quilpué'),
        (76, 'Limache'),
        (77, 'Olmué'),
        (78, 'Villa Alemana'),
    ]),
    (6, "Región del Libertador General Bernardo O'Higgins", [
        (79, 'Rancagua'),
        (80, 'Codegua'),
        (81, 'Coinco'),
        (82, 'Coltauco'),
        (83, 'Doñihue'),
        (84, 'Graneros'),
        (85, 'Las Cabras'),
        (86, 'Machalí'),
        (87, 'Malloa'),
        (88, 'Mostazal'),
        (89, 'Olivar'),
        (90, 'Peumo'),
        (91, 'Pichidegua'),
        (92, 'Quinta de Tilcoco'),
        (93, 'Rengo'),
        (94, 'Requínoa'),
        (95, 'San Vicente'),
        (96, 'Pichilemu'),
        (97, 'La Estrella'),
        (98, 'Litueche'),
        (99, 'Marchihue'),
        (100, 'Navidad'),
        (101, 'Paredones'),
        (102, 'San Fernando'),
        (103, 'Chépica'),
        (104, 'Chimbarongo'),
        (105, 'Lolol'),
        (106, 'Nancagua'),
        (107, 'Palmilla'),
        (108, 'Peralillo'),
        (109, 'Placilla'),
        (110, 'Pumanque'),
        (111, 'Santa Cruz'),
    ]),
    (7, 'Región del Maule', [
        (112, 'Talca'),
        (113, 'Constitución'),
        (114, 'Curepto'),
        (115, 'Empedrado'),
        (116, 'Maule'),
        (117, 'Pelarco'),
        (118, 'Pencahue'),
        (119, 'Río Claro'),
        (120, 'San Clemente'),
        (121, 'San Rafael'),
        (122, 'Cauquenes'),
        (123, 'Chanco'),
        (124, 'Pelluhue'),
        (125, 'Curicó'),
        (126, 'Hualañé'),
        (127, 'Licantén'),
        (128, 'Molina'),
        (129, 'Rauco'),
        (130, 'Romeral'),
        (131, 'Sagrada Familia'),
        (132, 'Teno'),
        (133, 'Vichuquén'),
        (134, 'Linares'),
        (135, 'Colbún'),
        (136, 'Longaví'),
        (137, 'Parral'),
        (138, 'Retiro'),
        (139, 'San Javier'),
        (140, 'Villa Alegre'),
        (141, 'Yerbas Buenas'),
    ]),
    (8, 'Región del Biobío', [
        (142, 'Concepción'),
        (143, 'Coronel'),
        (144, 'Chiguayante'),
        (145, 'Florida'),
        (146, 'Hualqui'),
        (147, 'Lota'),
        (148, 'Penco'),
        (149, 'San Pedro de la Paz'),
        (150, 'Santa Juana'),
        (151, 'Talcahuano'),
        (152, 'Tomé'),
        (153, 'Hualpén'),
        (154, 'Lebu'),
        (155, 'Arauco'),
        (156, 'Cañete'),
        (157, 'Contulmo'),
        (158, 'Curanilahue'),
        (159, 'Los Álamos'),
        (160, 'Tirúa'),
        (161, 'Los Ángeles'),
        (162, 'Antuco'),
        (163, 'Cabrero'),
        (164, 'Laja'),
        (165, 'Mulchén'),
        (166, 'Nacimiento'),
        (167, 'Negrete'),
        (168, 'Quilaco'),
        (169, 'Quilleco'),
        (170, 'San Rosendo'),
        (171, 'Santa Bárbara'),
        (172, 'Tucapel'),
        (173, 'Yumbel'),
        (174, 'Alto Biobío'),
    ]),
    (9, 'Región de La Araucanía', [
        (175, 'Temuco'),
        (176, 'Carahue'),
        (177, 'Cunco'),
        (178, 'Curarrehue'),
        (179, 'Freire'),
        (180, 'Galvarino'),
        (181, 'Gorbea'),
        (182, 'Lautaro'),
        (183, 'Loncoche'),
        (184, 'Melipeuco'),
        (185, 'Nueva Imperial'),
        (186, 'Padre Las Casas'),
        (187, 'Perquenco'),
        (188, 'Pitrufquén'),
        (189, 'Pucón'),
        (190, 'Saavedra'),
        (191, 'Teodoro Schmidt'),
        (192, 'Toltén'),
        (193, 'Vilcún'),
        (194, 'Villarrica'),
        (195, 'Cholchol'),
        (196, 'Angol'),
        (197, 'Collipulli'),
        (198, 'Curacautín'),
        (199, 'Ercilla'),
        (200, 'Lonquimay'),
        (201, 'Los Sauces'),
        (202, 'Lumaco'),
        (203, 'Purén'),
        (204, 'Renaico'),
        (205, 'Traiguén'),
        (206, 'Victoria'),
    ]),
    (10, 'Región de Los Lagos', [
        (207, 'Puerto Montt'),
        (208, 'Calbuco'),
        (209, 'Cochamó'),
        (210, 'Fresia'),
        (211, 'Frutillar'),
        (212, 'Los Muermos'),
        (213, 'Llanquihue'),
        (214, 'Maullín'),
        (215, 'Puerto Varas'),
        (216, 'Castro'),
        (217, 'Ancud'),
        (218, 'Chonchi'),
        (219, 'Curaco de Vélez'),
        (220, 'Dalcahue'),
        (221, 'Puqueldón'),
        (222, 'Queilén'),
        (223, 'Quellón'),
        (224, 'Quemchi'),
        (225, 'Quinchao'),
        (226, 'Osorno'),
        (227, 'Puerto Octay'),
        (228, 'Purranque'),
        (229, 'Puyehue'),
        (230, 'Río Negro'),
        (231, 'San Juan de la Costa'),
        (232, 'San Pablo'),
        (233, 'Chaitén'),
        (234, 'Futaleufú'),
        (235, 'Hualaihué'),
        (236, 'Palena'),
    ]),
    (11, 'Región de Aysén del General Carlos Ibáñez del Campo', [
        (237, 'Coyhaique'),
        (238, 'Lago Verde'),
        (239, 'Aysén'),
        (240, 'Cisnes'),
        (241, 'Guaitecas'),
        (242, 'Cochrane'),
        (243, "O'Higgins"),
        (244, 'Tortel'),
        (245, 'Chile Chico'),
        (246, 'Río Ibáñez'),
    ]),
    (12, 'Región de Magallanes y de la Antártica Chilena', [
        (247, 'Punta Arenas'),
        (248, 'Laguna Blanca'),
        (249, 'Río Verde'),
        (250, 'San Gregorio'),
        (251, 'Cabo de Hornos (Ex Navarino)'),
        (252, 'Antártica'),
        (253, 'Porvenir'),
        (254, 'Primavera'),
        (255, 'Timaukel'),
        (256, 'Natales'),
        (257, 'Torres del Paine'),
    ]),
    (13, 'Región Metropolitana de Santiago', [
        (258, 'Santiago'),
        (259, 'Cerrillos'),
        (260, 'Cerro Navia'),
        (261, 'Conchalí'),
        (262, 'El Bosque'),
        (263, 'Estación Central'),
        (264, 'Huechuraba'),
        (265, 'Independencia'),
        (266, 'La Cisterna'),
        (267, 'La Florida'),
        (268, 'La Granja'),
        (269, 'La Pintana'),
        (270, 'La Reina'),
        (271, 'Las Condes'),
        (272, 'Lo Barnechea'),
        (273, 'Lo Espejo'),
        (274, 'Lo Prado'),
        (275, 'Macul'),
        (276, 'Maipú'),
        (277, 'Ñuñoa'),
        (278, 'Pedro Aguirre Cerda'),
        (279, 'Peñalolén'),
        (280, 'Providencia'),
        (281, 'Pudahuel'),
        (282, 'Quilicura'),
        (283, 'Quinta Normal'),
        (284, 'Recoleta'),
        (285, 'Renca'),
        (286, 'San Joaquín'),
        (287, 'San Miguel'),
        (288, 'San Ramón'),
        (289, 'Vitacura'),
        (290, 'Puente Alto'),
        (291, 'Pirque'),
        (292, 'San José de Maipo'),
        (293, 'Colina'),
        (294, 'Lampa'),
        (295, 'Tiltil'),
        (296, 'San Bernardo'),
        (297, 'Buin'),
        (298, 'Calera de Tango'),
        (299, 'Paine'),
        (300, 'Melipilla'),
        (301, 'Alhué'),
        (302, 'Curacaví'),
        (303, 'María Pinto'),
        (304, 'San Pedro'),
        (305, 'Talagante'),
        (306, 'El Monte'),
        (307, 'Isla de Maipo'),
        (308, 'Padre Hurtado'),
        (309, 'Peñaflor'),
    ]),
    (14, 'Región de Los Ríos', [
        (310, 'Valdivia'),
        (311, 'Corral'),
        (312, 'Lanco'),
        (313, 'Los Lagos'),
        (314, 'Máfil'),
        (315, 'Mariquina'),
        (316, 'Paillaco'),
        (317, 'Panguipulli'),
        (318, 'La Unión'),
        (319, 'Futrono'),
        (320, 'Lago Ranco'),
        (321, 'Río Bueno'),
    ]),
    (15, 'Región de Arica y Parinacota', [
        (322, 'Arica'),
        (323, 'Camarones'),
        (324, 'Putre'),
        (325, 'General Lagos'),
    ]),
    (16, 'Región de Ñuble', [
        (326, 'Chillán'),
        (327, 'Bulnes'),
        (328, 'Cobquecura'),
        (329, 'Coelemu'),
        (330, 'Coihueco'),
        (331, 'Chillán Viejo'),
        (332, 'El Carmen'),
        (333, 'Ninhue'),
        (334, 'Ñiquén'),
        (335, 'Pemuco'),
        (336, 'Pinto'),
        (337, 'Portezuelo'),
        (338, 'Quillón'),
        (339, 'Quirihue'),
        (340, 'Ránquil'),
        (341, 'San Carlos'),
        (342, 'San Fabián'),
        (343, 'San Ignacio'),
        (344, 'San Nicolás'),
        (345, 'Treguaco'),
        (346, 'Yungay'),
    ]),
]


def _sembrar_estados(con) -> None:
    for nombre in ESTADOS_CUENTA:
        con.execute(
            sa.text(
                "INSERT INTO estado_cuenta (id, nombre) VALUES (:id, :nombre) "
                "ON CONFLICT (nombre) DO NOTHING"
            ),
            {"id": str(ulid.ULID()), "nombre": nombre},
        )


def _sembrar_permisos(con) -> None:
    for recurso, accion, descripcion in PERMISOS:
        con.execute(
            sa.text(
                "INSERT INTO permisos (id, recurso, accion, descripcion) "
                "VALUES (:id, :recurso, :accion, :descripcion) "
                "ON CONFLICT (recurso, accion) DO NOTHING"
            ),
            {"id": str(ulid.ULID()), "recurso": recurso, "accion": accion, "descripcion": descripcion},
        )


def _sembrar_geografia(con) -> None:
    # Se siembra como un bloque y solo en una tabla vacia: mezclar estas filas
    # con otras ya cargadas duplicaria comunas con ids distintos.
    if con.execute(sa.text("SELECT EXISTS (SELECT 1 FROM regiones)")).scalar():
        return
    for region_id, region, comunas in REGIONES:
        con.execute(
            sa.text("INSERT INTO regiones (id, nombre) VALUES (:id, :nombre)"),
            {"id": region_id, "nombre": region},
        )
        con.execute(
            sa.text("INSERT INTO comunas (id, nombre, region_id) VALUES (:id, :nombre, :region_id)"),
            [{"id": cid, "nombre": nombre, "region_id": region_id} for cid, nombre in comunas],
        )
    # Con ids explicitos las secuencias no avanzan solas.
    con.execute(sa.text("SELECT setval('regiones_id_seq', (SELECT max(id) FROM regiones))"))
    con.execute(sa.text("SELECT setval('comunas_id_seq', (SELECT max(id) FROM comunas))"))


def _sembrar_ayuda(con) -> None:
    for orden, (slug, titulo, icono) in enumerate(SECCIONES_AYUDA):
        con.execute(
            sa.text(
                'INSERT INTO helpsection (slug, title, icon, "order", is_active) '
                "VALUES (:slug, :titulo, :icono, :orden, true) "
                "ON CONFLICT (slug) DO NOTHING"
            ),
            {"slug": slug, "titulo": titulo, "icono": icono, "orden": orden},
        )


def upgrade() -> None:
    con = op.get_bind()
    _sembrar_estados(con)
    _sembrar_permisos(con)
    _sembrar_geografia(con)
    _sembrar_ayuda(con)


def downgrade() -> None:
    # No se borra: cuentas, permisos asignados y direcciones apuntan a estas
    # filas, y quitarlas romperia esos registros.
    pass
