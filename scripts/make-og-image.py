"""Генерирует OpenGraph-изображение 1200x630 для CodeSensei."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (225, 29, 72)  # primary rose
FG = (255, 255, 255)
SOFT = (255, 235, 240)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# Простой графический акцент: два скруглённых кода-блока по бокам
def rounded_rect(d, x0, y0, x1, y1, r, fill, outline=None, width=0):
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill, outline=outline, width=width)

# Верхний и нижний декоративные блоки
rounded_rect(draw, 80, 60, 1120, 180, 24, fill=(237, 62, 100))
rounded_rect(draw, 80, 620 - 60 - 120, 1120, 570, 24, fill=(197, 20, 62))

# Текст
title_font = ImageFont.truetype(r"C:\Windows\Fonts\seguisb.ttf", 96)
sub_font = ImageFont.truetype(r"C:\Windows\Fonts\seguisb.ttf", 40)

def center_text(d, cx, y, text, font, fill):
    bbox = d.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    d.text((cx - w / 2, y), text, font=font, fill=fill)

center_text(draw, W // 2, 220, "CodeSensei", title_font, FG)
center_text(draw, W // 2, 350, "Python для школьников", sub_font, SOFT)
center_text(draw, W // 2, 410, "Пишите настоящий код с первого урока", sub_font, SOFT)

img.save(r"C:\Users\ravva\CodeSensei\public\og-image.png")
print("OK")
