"""
El Markdown del manual a HTML. Solo lo que el manual usa: títulos, párrafos,
listas numeradas y con viñetas (con un nivel anidado), imágenes, una tabla,
negritas y cursivas. No es un Markdown completo, y no hace falta que lo sea.
"""
import html
import re

IMAGEN = re.compile(r"^!\[(?P<alt>[^\]]*)\]\((?P<src>[^)]+)\)$")
NUMERADA = re.compile(r"^(\d+)\. (.*)$")
VINETA = re.compile(r"^- (.*)$")
ANIDADA = re.compile(r"^\s{2,}- (.*)$")
TITULO = re.compile(r"^(#{1,3}) (.*)$")


def _linea(texto: str) -> str:
    t = html.escape(texto, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)


def _tabla(filas: list) -> str:
    celdas = [[c.strip() for c in f.strip().strip("|").split("|")] for f in filas if not re.match(r"^\|\s*-", f)]
    cabecera, *cuerpo = celdas
    th = "".join(f"<th>{_linea(c)}</th>" for c in cabecera)
    tr = "".join("<tr>" + "".join(f"<td>{_linea(c)}</td>" for c in fila) + "</tr>" for fila in cuerpo)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>"


def a_html(md: str, base_imagenes: str) -> str:
    """El cuerpo HTML. `base_imagenes` es la URL de la carpeta de las imágenes (file:///…/)."""
    salida, lista, items, tabla = [], None, [], []

    def cerrar_lista():
        nonlocal lista, items
        if lista:
            salida.append(f"<{lista}>" + "".join(f"<li>{i}</li>" for i in items) + f"</{lista}>")
        lista, items = None, []

    def cerrar_tabla():
        if tabla:
            salida.append(_tabla(tabla))
            tabla.clear()

    for linea in md.splitlines():
        if linea.startswith("|"):
            cerrar_lista()
            tabla.append(linea)
            continue
        cerrar_tabla()
        if not linea.strip():
            continue
        if (m := ANIDADA.match(linea)) and lista:
            items[-1] += f"<ul><li>{_linea(m[1])}</li></ul>"
            items[-1] = items[-1].replace("</ul><ul>", "")
            continue
        for patron, tipo in ((NUMERADA, "ol"), (VINETA, "ul")):
            if m := patron.match(linea):
                if lista != tipo:
                    cerrar_lista()
                    lista = tipo
                items.append(_linea(m[m.lastindex]))
                break
        else:
            cerrar_lista()
            if m := TITULO.match(linea):
                n = len(m[1])
                salida.append(f"<h{n}>{_linea(m[2])}</h{n}>")
            elif m := IMAGEN.match(linea):
                salida.append(f'<figure><img src="{base_imagenes}{m["src"]}" alt="{html.escape(m["alt"])}"></figure>')
            else:
                salida.append(f"<p>{_linea(linea)}</p>")
    cerrar_lista()
    cerrar_tabla()
    return "\n".join(salida)
