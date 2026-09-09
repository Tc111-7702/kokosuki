"""Improve kokosuki home logo background removal."""
from __future__ import annotations

import base64
import io
import re
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SVG_PATH = ROOT / "components" / "ui" / "assets" / "kokosuki-home-logo.svg"
SOURCE_CANDIDATES = [
    Path(
        r"C:\Users\Tc111\.cursor\projects\c-Users-Tc111-mikke\assets"
        r"\c__Users_Tc111_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
        r"_____-04035b82-3551-41ae-adb4-1ccf0d26d8ca.png"
    ),
]


def load_source() -> Image.Image:
    for path in SOURCE_CANDIDATES:
        if path.exists():
            return Image.open(path).convert("RGBA")
    svg = SVG_PATH.read_text(encoding="utf-8")
    match = re.search(r"base64,([^\"]+)", svg)
    if not match:
        raise SystemExit("No source image found")
    return Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert("RGBA")


def is_foreground(r: int, g: int, b: int, a: int) -> bool:
    if a < 14:
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    # カラフルなロゴ本体
    if sat >= 48:
        return True
    # 白い縁取り（ドロップシャドウより明るい）
    if mx >= 236 and mn >= 228:
        return True
    # 淡いハイライト（黄・オレンジ系の明部）
    if mx >= 210 and sat >= 18:
        return True
    return False


def is_removable(r: int, g: int, b: int, a: int) -> bool:
    if a < 12:
        return True
    if is_foreground(r, g, b, a):
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    # グレー背景・地形模様
    if sat <= 38 and 70 <= mx <= 220:
        return True
    # ドロップシャドウ（暗めの低彩度）
    if sat <= 42 and 30 <= mx <= 195:
        return True
    # 淡いオリーブ/グリーン系背景
    if sat <= 44 and g >= r - 10 and g >= b - 10 and 90 <= g <= 210:
        return True
    return False


def flood_removable(img: Image.Image) -> Image.Image:
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []

    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if not is_removable(r, g, b, a):
            continue
        px[x, y] = (r, g, b, 0)
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return img


def touches_transparent(px, w: int, h: int, x: int, y: int) -> bool:
    for nx in range(max(0, x - 1), min(w, x + 2)):
        for ny in range(max(0, y - 1), min(h, y + 2)):
            if nx == x and ny == y:
                continue
            if px[nx, ny][3] == 0:
                return True
    return False


def should_peel(r: int, g: int, b: int, a: int) -> bool:
    if a == 0 or is_foreground(r, g, b, a):
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    # 外周のグレーハロー・ドロップシャドウを優先的に除去
    if is_removable(r, g, b, a):
        return True
    if sat <= 58 and mx < 248:
        return True
    if a < 250 and sat <= 40:
        return True
    return False


def peel_fringe(img: Image.Image, passes: int = 24) -> Image.Image:
    w, h = img.size
    px = img.load()

    for _ in range(passes):
        to_clear: list[tuple[int, int]] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if touches_transparent(px, w, h, x, y) and should_peel(r, g, b, a):
                    to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0)

    return img


def defringe_alpha(img: Image.Image) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if is_removable(r, g, b, a) or (a < 255 and should_peel(r, g, b, a)):
                px[x, y] = (r, g, b, 0)

    # 1px erode on alpha to remove residual halos
    alpha = img.split()[3].filter(ImageFilter.MinFilter(3))
    img.putalpha(alpha)
    return img


def trim_transparent(img: Image.Image, pad: int = 4) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def write_svg(img: Image.Image, path: Path) -> None:
    w, h = img.size
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="0 0 {w} {h}" role="img" aria-label="ココスキ">\n'
        f'  <image width="{w}" height="{h}" xlink:href="data:image/png;base64,{b64}"/>\n'
        f"</svg>",
        encoding="utf-8",
    )


def main() -> None:
    src = load_source()
    out = flood_removable(src.copy())
    out = peel_fringe(out)
    out = defringe_alpha(out)
    out = trim_transparent(out, pad=4)
    write_svg(out, SVG_PATH)
    print(f"Updated {SVG_PATH} ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()
