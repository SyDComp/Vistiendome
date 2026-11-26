"""
Cómo se escriben los nombres: la característica en MAYÚSCULAS ("TALLA") y la
opción con Mayúscula Cada Palabra ("Azul Rey"), salvo las siglas y las tallas
con números ("XL", "2XL").

Vivía en la API del catálogo; está aquí porque la usan también las reglas de
las opciones y de los enlaces de cada variante.
"""

SIGLAS = {"XS", "S", "M", "L", "XL", "XXL", "XXXL", "CM", "MM", "KG", "ML", "UN", "PAR"}


def normalize_char(text: str) -> str:
    """Normaliza características a MAYÚSCULAS"""
    if not text:
        return ""
    return text.strip().upper()


def normalize_opt(text: str) -> str:
    """Normaliza opciones a Mayúscula Cada Palabra preservando siglas comunes en mayúscula"""
    if not text:
        return ""
    cleaned = text.strip()
    upper_cleaned = cleaned.upper()
    if upper_cleaned in SIGLAS:
        return upper_cleaned
    # Una palabra con números va en mayúscula: "2XL", no "2xl". capwords solo
    # sube la primera letra, y si es un número no sube nada: cada guardado
    # dejaba las tallas grandes en minúscula.
    return " ".join(p.upper() if any(ch.isdigit() for ch in p) else p.capitalize()
                    for p in cleaned.lower().split())
