"""
Backfill único e idempotente: asigna `asset_id` a referencias de imagen que hoy
solo guardan la URL (heroes legacy del StudioEditor y settings previos a la Fase B).

Mapea por URL interna (/media/...) -> MediaAsset.id. Las URLs externas se dejan intactas.
Tras esto, todas las referencias internas quedan por ID (rename-safe).

Uso:
    docker compose -f docker-compose-prod.yml exec backend python backfill_media_refs.py
"""
from sqlmodel import Session, select
from app.database import engine
from app.models.catalog import MediaAsset
from app.models.cms import HomepageSection
from app.models.settings import SiteSetting


def backfill_node(node, url_to_id):
    """Devuelve una copia del JSON con asset_id/image_asset_id rellenados donde falten."""
    if isinstance(node, dict):
        new = {k: backfill_node(v, url_to_id) for k, v in node.items()}
        # Convención de capas hero: { url, asset_id }
        u = new.get("url")
        if not new.get("asset_id") and isinstance(u, str) and u in url_to_id:
            new["asset_id"] = url_to_id[u]
        # Convención de settings: { image_url, image_asset_id }
        iu = new.get("image_url")
        if not new.get("image_asset_id") and isinstance(iu, str) and iu in url_to_id:
            new["image_asset_id"] = url_to_id[iu]
        return new
    if isinstance(node, list):
        return [backfill_node(x, url_to_id) for x in node]
    return node


def main():
    with Session(engine) as db:
        url_to_id = {a.url: a.id for a in db.exec(select(MediaAsset)).all()}

        sec_count = 0
        for sec in db.exec(select(HomepageSection)).all():
            new_cfg = backfill_node(sec.config, url_to_id)
            if new_cfg != sec.config:
                sec.config = new_cfg
                db.add(sec)
                sec_count += 1

        set_count = 0
        for st in db.exec(select(SiteSetting)).all():
            new_val = backfill_node(st.value, url_to_id)
            if new_val != st.value:
                st.value = new_val
                db.add(st)
                set_count += 1

        db.commit()
        print(f"Backfill completo. Secciones actualizadas: {sec_count} | Settings actualizados: {set_count}")


if __name__ == "__main__":
    main()
