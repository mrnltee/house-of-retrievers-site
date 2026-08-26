from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "house-of-retrievers-logo-original.png"
OUTPUT = ROOT / "public" / "house-of-retrievers-logo-reverse.png"

BLACK_SOURCE = (13, 13, 13)
GOLD = (167, 132, 64)
WHITE = (255, 255, 255)


def fit_alpha(pixel, foreground):
    direction = tuple(255 - channel for channel in foreground)
    distance = tuple(255 - channel for channel in pixel)
    denominator = sum(channel * channel for channel in direction)
    alpha = sum(a * b for a, b in zip(distance, direction)) / denominator
    alpha = max(0.0, min(1.0, alpha))
    reconstructed = tuple(255 - alpha * channel for channel in direction)
    error = sum((actual - expected) ** 2 for actual, expected in zip(pixel, reconstructed))
    return alpha, error


source = Image.open(SOURCE).convert("RGB")
reversed_logo = Image.new("RGBA", source.size, (0, 0, 0, 0))
output_pixels = reversed_logo.load()

for y in range(source.height):
    for x in range(source.width):
        pixel = source.getpixel((x, y))
        black_alpha, black_error = fit_alpha(pixel, BLACK_SOURCE)
        gold_alpha, gold_error = fit_alpha(pixel, GOLD)

        if gold_error < black_error:
            color = GOLD
            alpha = gold_alpha
        else:
            color = WHITE
            alpha = black_alpha

        output_pixels[x, y] = (*color, round(alpha * 255))

reversed_logo.save(OUTPUT, optimize=True)
