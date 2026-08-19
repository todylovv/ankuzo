from __future__ import annotations

import json
import sys
from collections import defaultdict, deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best: list[tuple[int, int]] = []

    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        seen[y, x] = True
        component: list[tuple[int, int]] = []
        while queue:
            cy, cx = queue.popleft()
            component.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(component) > len(best):
            best = component

    result = np.zeros_like(mask, dtype=bool)
    for y, x in best:
        result[y, x] = True
    return result


def boundary_loops(mask: np.ndarray) -> list[list[tuple[float, float]]]:
    height, width = mask.shape
    outgoing: dict[tuple[int, int], list[tuple[int, int]]] = defaultdict(list)

    for y, x in zip(*np.nonzero(mask)):
        if y == 0 or not mask[y - 1, x]:
            outgoing[(x, y)].append((x + 1, y))
        if x == width - 1 or not mask[y, x + 1]:
            outgoing[(x + 1, y)].append((x + 1, y + 1))
        if y == height - 1 or not mask[y + 1, x]:
            outgoing[(x + 1, y + 1)].append((x, y + 1))
        if x == 0 or not mask[y, x - 1]:
            outgoing[(x, y + 1)].append((x, y))

    unused = {(start, end) for start, ends in outgoing.items() for end in ends}
    loops: list[list[tuple[float, float]]] = []
    while unused:
        start, next_point = next(iter(unused))
        loop = [start]
        current = start
        while True:
            edge = (current, next_point)
            if edge not in unused:
                break
            unused.remove(edge)
            current = next_point
            loop.append(current)
            if current == start:
                break
            candidates = [end for end in outgoing.get(current, []) if (current, end) in unused]
            if not candidates:
                break
            next_point = candidates[0]
        if len(loop) > 12 and loop[-1] == loop[0]:
            loops.append([(float(x), float(y)) for x, y in loop[:-1]])
    return loops


def distance(point: tuple[float, float], start: tuple[float, float], end: tuple[float, float]) -> float:
    p = np.asarray(point)
    a = np.asarray(start)
    b = np.asarray(end)
    delta = b - a
    if np.allclose(delta, 0):
        return float(np.linalg.norm(p - a))
    return float(abs(np.cross(delta, p - a)) / np.linalg.norm(delta))


def simplify(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    if len(points) < 4:
        return points
    closed = points + [points[0]]

    def dp(segment: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if len(segment) < 3:
            return segment
        distances = [distance(point, segment[0], segment[-1]) for point in segment[1:-1]]
        index = int(np.argmax(distances)) + 1
        if distances[index - 1] <= epsilon:
            return [segment[0], segment[-1]]
        return dp(segment[: index + 1])[:-1] + dp(segment[index:])

    result = dp(closed)
    return result[:-1] if result[-1] == result[0] else result


def polygon_area(points: list[tuple[float, float]]) -> float:
    return sum(
        points[index][0] * points[(index + 1) % len(points)][1]
        - points[(index + 1) % len(points)][0] * points[index][1]
        for index in range(len(points))
    ) / 2


def main() -> None:
    source = Path(sys.argv[1])
    image = Image.open(source).convert("RGB")
    width, height = image.size
    left = image.crop((int(width * 0.09), int(height * 0.03), int(width * 0.49), int(height * 0.96)))
    left.thumbnail((320, 560), Image.Resampling.LANCZOS)
    rgb = np.asarray(left)
    mask = np.max(rgb, axis=2) > 14
    cleaned = Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    component = largest_component(np.asarray(cleaned) > 0)
    loops = boundary_loops(component)
    loops.sort(key=lambda loop: abs(polygon_area(loop)), reverse=True)
    outer = simplify(loops[0], 7.5)

    xs = [point[0] for point in outer]
    ys = [point[1] for point in outer]
    center_x = (min(xs) + max(xs)) / 2
    center_y = (min(ys) + max(ys)) / 2
    scale = 9.4 / (max(ys) - min(ys))

    def normalize(loop: list[tuple[float, float]]) -> list[list[float]]:
        return [[round((x - center_x) * scale, 3), round((center_y - y) * scale, 3)] for x, y in loop]

    payload = {
        "outer": normalize(outer),
        "holes": [
            normalize(simplify(loop, 3.0))
            for loop in loops[1:]
            if abs(polygon_area(loop)) > abs(polygon_area(loops[0])) * 0.015
        ],
    }
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
