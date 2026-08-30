"""
Unifica las tallas a MAYÚSCULA: 2xl -> 2XL, 3xl -> 3XL, ... 7xl -> 7XL.

Por qué
-------
El sistema guardaba `XS, S, M, L, XL` en mayúscula y `2xl ... 7xl` en minúscula.
Esos valores son literalmente los que ve la clienta en el selector de talla: "XL"
y justo debajo "2xl". La guía de tallas que ya está publicada en la portada dice
"2XL", así que la mayúscula no es una preferencia: es lo que el resto del sitio
ya muestra.

Qué toca, y qué NO
------------------
Toca dos cosas, que son todas las que guardan una talla (verificado recorriendo
la base entera, no de memoria):
  1. el dominio de la característica TALLA — 6 opciones
  2. `SKU.config['talla']` — 486 variantes

NO toca el código del SKU (`...-4XL-CAMEL`), que ya viene en mayúscula, ni los
tramos de precio (`priceTiers.js` compara en minúsculas, así que le da igual).

Modo de uso
-----------
    python -m app.scripts.normalizar_tallas            # ensayo: no escribe nada
    python -m app.scripts.normalizar_tallas --aplicar  # escribe, con respaldo previo

El respaldo se guarda como `respaldo_tallas_<fecha>.json` en el directorio actual
y contiene el valor ANTERIOR de todo lo que se va a tocar, con su id: alcanza
para revertir a mano si hiciera falta.
"""

import json
import re
import sys
from datetime import datetime, timezone

from sqlmodel import Session, select

sys.path.insert(0, ".")
from app.database import engine  # noqa: E402
from app.models.catalog import Characteristic, SKU  # noqa: E402

# Sólo 2xl..7xl. Las de una letra (S, M, L) ya están bien, y tocarlas sería
# arriesgar sin motivo.
MINUSCULA = re.compile(r"^([2-7])xl$")


def _corregido(valor):
    """Devuelve el valor en mayúscula, o None si ya estaba bien."""
    m = MINUSCULA.match(str(valor or ""))
    return f"{m.group(1)}XL" if m else None


def normalizar(aplicar: bool = False) -> int:
    respaldo = {"generado": datetime.now(timezone.utc).isoformat(), "dominio": None, "variantes": []}
    cambios = 0

    with Session(engine) as db:
        # 1) El dominio de la característica
        talla = db.exec(select(Characteristic).where(Characteristic.name.ilike("talla"))).first()
        if not talla:
            print("No existe la característica TALLA. Nada que hacer.")
            return 0

        respaldo["dominio"] = {"id": talla.id, "domain": json.loads(json.dumps(talla.domain))}
        nuevo_dominio, tocadas = [], []
        for opcion in talla.domain:
            arreglado = _corregido(opcion.get("value"))
            if arreglado:
                tocadas.append(f"{opcion['value']} -> {arreglado}")
                opcion = {**opcion, "value": arreglado}
            nuevo_dominio.append(opcion)

        if tocadas:
            print(f"Dominio de TALLA: {len(tocadas)} opciones")
            for t in tocadas:
                print(f"   {t}")
            cambios += len(tocadas)
            if aplicar:
                talla.domain = nuevo_dominio
                # SQLModel no detecta la mutación de una columna JSON si se
                # muta en sitio; reasignar la lista completa es lo que la marca
                # como sucia. Sin esto el commit no escribe nada y "funciona".
                db.add(talla)

        # 2) La configuración de cada variante
        por_valor = {}
        for sku in db.exec(select(SKU)).all():
            config = sku.config or {}
            nueva, tocado = dict(config), False
            for clave, valor in config.items():
                if clave.lower() != "talla":
                    continue
                arreglado = _corregido(valor)
                if arreglado:
                    nueva[clave], tocado = arreglado, True
                    por_valor[f"{valor} -> {arreglado}"] = por_valor.get(f"{valor} -> {arreglado}", 0) + 1
            if tocado:
                respaldo["variantes"].append({"id": sku.id, "sku": sku.sku, "config": config})
                cambios += 1
                if aplicar:
                    sku.config = nueva
                    db.add(sku)

        print(f"Variantes: {len(respaldo['variantes'])}")
        for k, n in sorted(por_valor.items()):
            print(f"   {k}  x{n}")

        if not cambios:
            print("\nNo hay nada que corregir.")
            return 0

        if not aplicar:
            print(f"\nENSAYO. {cambios} cambios pendientes. Repetir con --aplicar para escribirlos.")
            return cambios

        nombre = f"respaldo_tallas_{datetime.now(timezone.utc):%Y%m%d_%H%M%S}.json"
        with open(nombre, "w", encoding="utf-8") as f:
            json.dump(respaldo, f, ensure_ascii=False, indent=1)
        print(f"\nRespaldo del estado anterior: {nombre}")

        db.commit()
        print(f"Aplicado: {cambios} cambios.")
        return cambios


if __name__ == "__main__":
    normalizar(aplicar="--aplicar" in sys.argv)
