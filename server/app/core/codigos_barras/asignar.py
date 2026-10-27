"""
Un código nuevo para una variante: el siguiente correlativo. Nunca un cálculo
sobre el nombre ni números al azar: esos chocaban con productos reales, podían
chocar entre ellos y a veces traían mal el dígito de control, y un lector
descarta ese código sin avisar (decisión del usuario 2026-10-26).
"""

from sqlalchemy import text
from sqlmodel import Session

from .numero import codigo_desde

SECUENCIA = "codigos_barras_seq"


def nuevo_codigo(db: Session) -> str:
    return codigo_desde(db.execute(text(f"SELECT nextval('{SECUENCIA}')")).scalar_one())
