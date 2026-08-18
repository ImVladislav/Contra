# -*- coding: utf-8 -*-
"""Оновлює assets/sprites/manifest.json за вмістом assets/sprites/.

Запуск:  python tools/gen_manifest.py
Потрібен лише коли ви ДОДАЄТЕ або ВИДАЛЯЄТЕ спрайти — редагування
наявних PNG маніфесту не стосується. Секція "animations" зберігається
з попереднього manifest.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / "assets" / "sprites"
MANIFEST = SPRITES / "manifest.json"


def main():
    animations = {}
    if MANIFEST.exists():
        animations = json.loads(MANIFEST.read_text(encoding="utf-8-sig")).get("animations", {})

    sprites = sorted(f.stem for f in SPRITES.glob("*.png"))
    if not sprites:
        raise SystemExit(f"У {SPRITES} немає жодного PNG")

    missing = [
        f"{anim}: {frame}"
        for anim, frames in animations.items()
        for frame in frames
        if frame not in sprites
    ]
    if missing:
        raise SystemExit("Анімації посилаються на відсутні спрайти:\n  " + "\n  ".join(missing))

    MANIFEST.write_text(
        json.dumps({"sprites": sprites, "animations": animations}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Готово: {len(sprites)} спрайтів у manifest.json")


if __name__ == "__main__":
    main()
