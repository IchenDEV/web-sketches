"""Authored landscape miniatures for the 2007 third selection of West Lake views.

Coordinates use Three.js x/y/z (y up). Run inside Blender to regenerate the GLBs.
Each place has its own plan and silhouette; shared details only cover masonry,
timber construction and planting. These are interpretive models, not surveys.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import (
    COLORS,
    G,
    box,
    curved_branch,
    export,
    foliage,
    lathe,
    mesh,
    rock,
    roof,
    terrain as make_terrain,
    tree as make_tree,
    tube,
)

COLORS.update(
    {
        "ochre": (0.63, 0.48, 0.28),
        "redwall": (0.49, 0.22, 0.16),
        "brick": (0.46, 0.36, 0.29),
        "sand": (0.66, 0.63, 0.48),
        "tea": (0.28, 0.41, 0.23),
        "tealight": (0.42, 0.49, 0.26),
        "reed": (0.48, 0.48, 0.27),
        "thatch": (0.48, 0.43, 0.29),
        "autumn": (0.59, 0.38, 0.18),
        "paving": (0.63, 0.64, 0.56),
        "bronze": (0.26, 0.31, 0.25),
        "window": (0.20, 0.28, 0.27),
    }
)


TERRAIN = []
GROUND_HEIGHT = None


def terrain(cx, cz, rx, rz, height, material="earth"):
    TERRAIN.append((cx, cz, rx, rz, height))
    make_terrain(cx, cz, rx, rz, height, material)


def planted_height(x, z, fallback=0.24):
    """Use the same radial profile as common.terrain for grounded planting."""
    heights = [GROUND_HEIGHT] if GROUND_HEIGHT is not None else []
    for cx, cz, rx, rz, height in TERRAIN:
        angle = math.atan2((z - cz) / rz, (x - cx) / rx)
        edge = 1 + 0.035 * math.sin(angle * 13) + 0.025 * math.cos(angle * 21)
        radius = math.hypot((x - cx) / rx, (z - cz) / rz) / edge
        if radius <= 1:
            heights.append(
                -0.15
                + height * (1 - radius * radius) ** 0.7
                + 0.09 * math.sin(x * 1.3 + z * 1.6) * (1 - radius)
            )
    # A tiny overlap prevents cracks from the faceted terrain interpolation.
    return max(heights) - 0.025 if heights else fallback


def tree(x, y, z, height=6):
    make_tree(x, planted_height(x, z, y), z, height)


def slope_woods(cx, cz, rx, rz, count=65, height=5):
    """Lightweight slope trees: one trunk and three textured canopy cards."""
    for i in range(count):
        angle = i * 2.399
        radius = 0.93 * math.sqrt((i + 0.5) / count)
        x = cx + math.cos(angle) * rx * radius
        z = cz + math.sin(angle) * rz * radius
        y = planted_height(x, z)
        h = height * random.uniform(0.7, 1.25)
        tube("bark", [(x, y, z), (x + 0.12, y + h * 0.88, z)], 0.1, 5)
        for j in range(3):
            a = j * math.pi / 3
            r = h * 0.32
            dx, dz = math.cos(a) * r, math.sin(a) * r
            yy = y + h * (0.7 + j * 0.055)
            mesh(
                "crown" + str(j),
                [
                    (x - dx, yy - r * 0.7, z - dz),
                    (x + dx, yy - r * 0.7, z + dz),
                    (x + dx, yy + r * 0.7, z + dz),
                    (x - dx, yy + r * 0.7, z - dz),
                ],
                [(0, 1, 2, 3)],
            )


def ground(material="sand"):
    global GROUND_HEIGHT
    GROUND_HEIGHT = 0.24
    box(material, (0, -0.16, 0), (270, 0.8, 290))


def paving(x, z, width, depth, y=0.3):
    box("paving", (x, y, z), (width, 0.16, depth))
    for offset in range(1, int(depth / 1.5)):
        zz = z - depth / 2 + offset * 1.5
        tube(
            "mortar",
            [(x - width / 2, y + 0.082, zz), (x + width / 2, y + 0.082, zz)],
            0.012,
            4,
        )


def steps(x, z, width, height, count=9, run=4, y=0.3):
    for i in range(count):
        box(
            "stoneedge",
            (x, y + height * (i + 0.5) / count, z + run / 2 - run * (i + 0.5) / count),
            (width, height / count, run / count + 0.04),
        )


def railing(x1, z1, x2, z2, y=0.6, height=0.9, material="stone"):
    length = math.hypot(x2 - x1, z2 - z1)
    count = max(2, round(length / 1.4))
    for i in range(count + 1):
        t = i / count
        x, z = x1 + (x2 - x1) * t, z1 + (z2 - z1) * t
        box(material, (x, y + height / 2, z), (0.14, height, 0.14))
        lathe(material, (x, y + height, z), [(0, 0.13), (0.13, 0.1), (0.18, 0.03)], 8)
    for yy in [0.38, 0.8]:
        tube(material, [(x1, y + height * yy, z1), (x2, y + height * yy, z2)], 0.07, 5)


def hip_roof(x, y, z, width, depth, height=2, material="roof"):
    """Rectangular ridged roof with curved, lifted eaves and visible tile courses."""
    ridge = max(0, (width - depth) / 2)
    corners = [
        (-width / 2, -depth / 2),
        (width / 2, -depth / 2),
        (width / 2, depth / 2),
        (-width / 2, depth / 2),
    ]
    tops = [(-ridge, 0), (ridge, 0), (ridge, 0), (-ridge, 0)]
    for face in range(4):
        a, b = corners[face], corners[(face + 1) % 4]
        c, d = tops[face], tops[(face + 1) % 4]

        def point(t, v):
            px = ((1 - t) * c[0] + t * d[0]) * (1 - v) + ((1 - t) * a[0] + t * b[0]) * v
            pz = ((1 - t) * c[1] + t * d[1]) * (1 - v) + ((1 - t) * a[1] + t * b[1]) * v
            py = height * (1 - v) ** 1.5 + (0.16 + 0.38 * abs(2 * t - 1) ** 3) * v**8
            return x + px, y + py, z + pz

        columns = max(6, round(math.dist(a, b) / 0.34))
        rows = 9
        vertices = [
            point(i / columns, j / rows)
            for j in range(rows + 1)
            for i in range(columns + 1)
        ]
        faces = [
            (
                j * (columns + 1) + i,
                j * (columns + 1) + i + 1,
                (j + 1) * (columns + 1) + i + 1,
                (j + 1) * (columns + 1) + i,
            )
            for j in range(rows)
            for i in range(columns)
        ]
        mesh(material, vertices, faces)
        for i in range(columns + 1):
            tube("ridge", [point(i / columns, j / 12) for j in range(13)], 0.025, 4)
        tube("wooddark", [point(i / columns, 1) for i in range(columns + 1)], 0.07, 5)
        tube("ridge", [point(0, j / 12) for j in range(13)], 0.07, 5)
    tube(
        "ridge",
        [
            (x - ridge - 0.25, y + height + 0.1, z),
            (x + ridge + 0.25, y + height + 0.1, z),
        ],
        0.13,
        6,
    )
    for sign in [-1, 1]:
        curved_branch(
            "ridge",
            [
                (x + sign * ridge, y + height, z),
                (x + sign * (ridge + 0.5), y + height + 0.1, z),
                (x + sign * (ridge + 0.65), y + height + 0.65, z),
            ],
            0.11,
            6,
        )


def hall(x, z, width=12, depth=7, y=0.4, height=4.3, wall="ochre", double=False):
    box("stone", (x, y + 0.3, z), (width + 1, 0.6, depth + 1))
    box(wall, (x, y + 0.6 + height / 2, z), (width, height, depth))
    front = z + depth / 2 + 0.015
    for dx in [-0.34 * width, 0, 0.34 * width]:
        box(
            "wooddark",
            (x + dx, y + 0.6 + height * 0.4, front),
            (width * 0.24, height * 0.8, 0.12),
        )
        for j in [-1, 0, 1]:
            tube(
                "woodlight",
                [
                    (x + dx + j * width * 0.055, y + 0.9, front + 0.08),
                    (x + dx + j * width * 0.055, y + height * 0.79, front + 0.08),
                ],
                0.035,
                4,
            )
        for yy in [height * 0.45, height * 0.65]:
            tube(
                "woodlight",
                [
                    (x + dx - width * 0.11, y + yy, front + 0.08),
                    (x + dx + width * 0.11, y + yy, front + 0.08),
                ],
                0.035,
                4,
            )
    for i in range(5):
        xx = x - width * 0.47 + i * width * 0.235
        tube(
            "redwall",
            [(xx, y + 0.6, front + 0.65), (xx, y + height + 0.9, front + 0.65)],
            0.17,
            8,
        )
        box("gold", (xx, y + height + 0.45, front + 0.65), (0.65, 0.2, 0.52))
    box("wooddark", (x, y + height + 0.1, front + 0.76), (width * 0.36, 0.62, 0.15))
    hip_roof(x, y + height + 0.7, z, width + 2.1, depth + 2, 2.5)
    if double:
        hip_roof(x, y + height + 3, z, width * 0.81, depth * 0.8, 2.1)
    steps(x, front + 2, width * 0.55, 0.6, 4, 2, y)


def woodland(x, z, count=12, radius=15, h=7):
    for i in range(count):
        angle = i * 2.399
        distance = radius * math.sqrt((i + 0.4) / count)
        tree(
            x + math.cos(angle) * distance,
            0.25,
            z + math.sin(angle) * distance,
            h * random.uniform(0.75, 1.22),
        )


def distant_woods(x, z, count=30, width=80, y=0.3, h=7):
    for i in range(count):
        xx = x - width / 2 + i * width / max(1, count - 1)
        zz = z + random.uniform(-7, 7)
        hh = h * random.uniform(0.65, 1.3)
        base = planted_height(xx, zz, y)
        tube("bark", [(xx, base, zz), (xx + 0.1, base + hh * 0.75, zz)], 0.13, 6)
        for j in range(3):
            foliage(
                xx + random.uniform(-1, 1),
                base + hh * (0.6 + j * 0.13),
                zz,
                hh * 0.28,
                "leaf" + str(j),
            )


def pine(x, y, z, h=10):
    y = planted_height(x, z, y)
    curved_branch(
        "bark", [(x, y, z), (x + 0.6, y + h * 0.45, z), (x - 0.4, y + h, z)], 0.3, 8
    )
    for i in range(5):
        a = i * 2.4
        branch = h * (0.35 - 0.04 * i)
        yy = y + h * (0.42 + 0.12 * i)
        ex = x + math.cos(a) * branch
        ez = z + math.sin(a) * branch
        curved_branch(
            "bark",
            [(x, yy - 0.6, z), (ex, yy - 0.2, ez), (ex + 0.2, yy + 0.2, ez)],
            0.13,
            6,
        )
        foliage(ex, yy + 0.25, ez, branch * 0.68, "leaf0")
        foliage(ex, yy + 0.45, ez, branch * 0.58, "leaf1")


def human(x, y, z, height=1.4, material="stone"):
    lathe(
        material,
        (x, y, z),
        [(0, 0.22), (0.65 * height, 0.28), (0.81 * height, 0.17)],
        10,
    )
    lathe(
        material,
        (x, y + 0.8 * height, z),
        [(0, 0.11), (0.07, 0.17), (0.25, 0.15), (0.31, 0.01)],
        10,
    )
    tube(
        material,
        [(x - 0.27, y + height * 0.7, z), (x - 0.3, y + height * 0.4, z + 0.09)],
        0.07,
        6,
    )
    tube(
        material,
        [(x + 0.27, y + height * 0.7, z), (x + 0.3, y + height * 0.4, z + 0.09)],
        0.07,
        6,
    )


def creek_bank(side, centre, width, y=0.45):
    # The edge changes with z; outer boundary sits well outside every camera view.
    vs = []
    for i in range(65):
        z = -100 + i * 3.6
        edge = centre(z) + side * width
        vs.extend([(edge, 0, z), (edge + side * 1.4, y, z), (side * 135, y, z)])
    mesh(
        "earth",
        vs,
        [
            (3 * i + j, 3 * (i + 1) + j, 3 * (i + 1) + j + 1, 3 * i + j + 1)
            for i in range(64)
            for j in range(2)
        ],
    )


def bridge(x, z, length=15, width=3, rise=2):
    rows = 36

    def level(t):
        return 0.25 + rise * math.sin(math.pi * t)

    for side in [-1, 1]:
        vs = []
        for i in range(rows + 1):
            t = i / rows
            vs.extend(
                [
                    (x + (t - 0.5) * length, level(t), z + side * width / 2),
                    (
                        x + (t - 0.5) * length,
                        max(-0.1, level(t) - 0.65),
                        z + side * width / 2,
                    ),
                ]
            )
        mesh(
            "stone", vs, [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(rows)]
        )
        rail = []
        for i in range(13):
            t = i / 12
            xx = x + (t - 0.5) * length
            yy = level(t)
            box("stoneedge", (xx, yy + 0.5, z + side * width / 2), (0.17, 1, 0.17))
            rail.append((xx, yy + 0.95, z + side * width / 2))
        tube("stoneedge", rail, 0.075, 6)
    vs = []
    for i in range(rows + 1):
        t = i / rows
        vs.extend(
            [
                (x + (t - 0.5) * length, level(t), z - width / 2),
                (x + (t - 0.5) * length, level(t), z + width / 2),
            ]
        )
    mesh(
        "stoneedge", vs, [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(rows)]
    )


def reeds(x, z, count=40, radius=4):
    for i in range(count):
        a = random.random() * math.tau
        r = radius * math.sqrt(random.random())
        xx = x + math.cos(a) * r
        zz = z + math.sin(a) * r
        h = random.uniform(0.65, 1.8)
        tube(
            "reed",
            [(xx, 0.1, zz), (xx + 0.08, h * 0.65, zz), (xx + 0.2, h, zz + 0.1)],
            0.018,
            4,
        )
        tube(
            "thatch",
            [(xx + 0.2, h * 0.8, zz + 0.1), (xx + 0.24, h + 0.18, zz + 0.11)],
            0.05,
            5,
        )


def courtyard_walls(width, depth, z=0, y=0.3):
    for side in [-1, 1]:
        box("plaster", (side * width / 2, y + 1.3, z), (0.45, 2.6, depth))
        box("roof", (side * width / 2, y + 2.7, z), (0.7, 0.22, depth + 0.4))
    box("plaster", (0, y + 1.3, z - depth / 2), (width, 2.6, 0.45))


def lingyin():
    ground()
    terrain(8, -67, 65, 30, 12)
    paving(5, -1, 25, 40)
    courtyard_walls(27, 43, -3)
    hall(4, 10, 12, 6, height=3.7)
    hall(4, -5, 17, 9, height=6.5, double=True)
    hall(4, -22, 13, 7, y=1.5, height=5)
    for x in [-6, 14]:
        lathe(
            "stone",
            (x, 0.4, 4),
            [(0, 0.7), (0.2, 0.6), (0.4, 0.4), (1.6, 0.25), (1.8, 0.6), (2, 0.2)],
            12,
        )
    # Feilai's limestone outcrop and shallow grotto niches, left of the temple axis.
    for i in range(12):
        rock(-18 + random.uniform(-5, 5), 0.2, -4 + i * 1.6, random.uniform(3, 6))
    for i in range(7):
        xx = -19 + i * 1.8
        yy = 0.8 + (i % 3) * 0.6
        zz = 13 + (i % 2) * 0.3
        lathe("shadow", (xx, yy, zz), [(0, 0.8), (0.15, 0.7), (0.4, 0.6)], 12)
        human(xx, yy, zz + 0.3, 1.3, "stoneedge")
    for x, z in [(-15, -21), (-17, 19), (20, -11), (22, 13), (31, -18)]:
        tree(x, 0.3, z, 10)
    distant_woods(0, -40, 40, 105, h=12)


def liuhe_tide():
    # Broad river foreground, hill connects to the left bank behind the tower.
    terrain(-18, -29, 42, 24, 8)
    terrain(-60, -29, 62, 39, 9)
    x, z = -11, -19
    box("stone", (x, 6.6, z), (13, 1, 13))
    steps(x, z + 9, 7, 6.5, 22, 13, 0.15)
    for level in range(13):
        y = 7 + level * 1.55
        radius = 4.9 - level * 0.17
        lathe("ochre", (x, y, z), [(0, radius * 0.76), (1.45, radius * 0.76)], 8)
        for i in range(8):
            angle = i * math.tau / 8 + math.pi / 6
            px = x + math.cos(angle) * radius * 0.83
            pz = z + math.sin(angle) * radius * 0.83
            tube("wood", [(px, y, pz), (px, y + 1.35, pz)], 0.09, 6)
            lathe("wooddark", (px, y + 0.45, pz), [(0, 0.13), (0.55, 0.13)], 6)
        roof(x, y + 1.03, z, radius, 1.0, 8, 7)
    lathe(
        "bronze",
        (x, 28, z),
        [(0, 0.35), (0.5, 0.27), (1, 0.2), (1.6, 0.1), (2.3, 0.025)],
        12,
    )
    for x0, z0 in [(-27, -18), (-32, -29), (-1, -31), (-40, -9)]:
        tree(x0, 4, z0, 9)
    distant_woods(-38, -42, 35, 100, y=3, h=9)
    for i in range(38):
        rock(-52 + i * 1.5, 0.1, -6 + 2 * math.sin(i * 0.18), random.uniform(0.7, 1.5))


def yue_fei():
    ground()
    paving(0, 0, 35, 38)
    courtyard_walls(35, 38, 0)
    hall(8, -13, 15, 8, height=5, wall="redwall")
    # Tomb precinct sits west of the shrine, with its own screen and spirit path.
    box("stone", (-10, 0.55, -8), (10, 0.5, 11))
    lathe(
        "stone",
        (-10, 0.8, -9),
        [(0, 3.2), (0.6, 3.2), (1.7, 2.9), (2.3, 1.4), (2.5, 0)],
        36,
    )
    box("stoneedge", (-10, 2.1, -4), (1.35, 2.8, 0.4))
    box("plaster", (-10, 2.2, -16), (12, 4, 0.55))
    box("roof", (-10, 4.3, -16), (12.4, 0.22, 0.8))
    for sign in [-1, 1]:
        for i in range(4):
            human(-10 + sign * 3.5, 0.5, 1 + i * 3.4, 1.65)
        railing(-10 + sign * 4.9, -13, -10 + sign * 4.9, -2, 0.8, 1)
    for x, z in [(-22, 6), (-23, -14), (22, 7), (23, -14), (-14, 23)]:
        pine(x, 0.3, z, 12)
    distant_woods(0, -30, 36, 100, h=11)
    for i in range(8):
        xx = random.choice([-25, 26]) + random.uniform(-3, 3)
        zz = random.uniform(-18, 18)
        tree(xx, 0.3, zz, 7)
    # Warm foliage accents have solid colors; the scene controller supplies dusk light.
    for i in range(85):
        x = random.uniform(-18, 18)
        z = random.uniform(-15, 18)
        mesh(
            "autumn",
            [(x, 0.39, z), (x + 0.12, 0.41, z + 0.08), (x + 0.26, 0.39, z)],
            [(0, 1, 2)],
        )


def lakeside_rain():
    # Curved lake edge: promenade in the midground, open water in front.
    vs = []
    for i in range(101):
        x = -125 + i * 2.5
        edge = -2 + 0.0025 * x * x
        vs.extend([(x, 0.18, edge), (x, 0.48, edge - 5), (x, 0.35, -135)])
    mesh(
        "earth",
        vs,
        [
            (3 * i + j, 3 * i + j + 1, 3 * (i + 1) + j + 1, 3 * (i + 1) + j)
            for i in range(100)
            for j in range(2)
        ],
    )
    for i in range(50):
        x = -70 + i * 2.8
        edge = -2 + 0.0025 * x * x
        box("paving", (x, 0.55, edge - 2.7), (2.83, 0.16, 5))
        box("stoneedge", (x, 0.35, edge + 0.1), (2.83, 0.7, 0.45))
    for x in range(-36, 37, 8):
        edge = -2 + 0.0025 * x * x
        tree(x, 0.6, edge - 6, 8)
        bench(x + 2, edge - 3)
        lamp(x - 2, edge - 1.1)
    for i in range(7):
        villa(
            -34 + i * 11, -24 - random.uniform(0, 5), 9, 7, random.uniform(6, 10), i % 2
        )
    distant_woods(0, -42, 32, 110, h=10)


def bench(x, z, y=0.65):
    for side in [-1, 1]:
        box("bronze", (x + side * 0.85, y + 0.32, z), (0.12, 0.64, 0.65))
    for dz in [-0.26, 0, 0.26]:
        box("woodlight", (x, y + 0.64, z + dz), (2.2, 0.11, 0.19))
    for yy in [0.96, 1.2]:
        box("woodlight", (x, y + yy, z - 0.34), (2.2, 0.14, 0.09))


def lamp(x, z, y=0.5):
    lathe("bronze", (x, y, z), [(0, 0.2), (0.16, 0.17), (0.3, 0.09), (2.6, 0.055)], 10)
    box("gold", (x, y + 2.8, z), (0.3, 0.45, 0.3))
    hip_roof(x, y + 3.0, z, 0.48, 0.48, 0.18)


def archway(x, z, width=7, y=0.4, height=4.2):
    for side in [-1, 1]:
        box("stone", (x + side * width * 0.35, y + height / 2, z), (0.42, height, 0.48))
        box("stoneedge", (x + side * width * 0.35, y + 0.2, z), (1, 0.4, 1))
    box("stone", (x, y + height - 0.7, z), (width, 0.58, 0.58))
    box("stoneedge", (x, y + height - 0.25, z), (width * 0.88, 0.3, 0.8))
    box("stone", (x, y + height - 0.9, z + 0.04), (width * 0.33, 0.8, 0.65))
    hip_roof(x, y + height, z, width + 1, 1.8, 0.6)


def qian_king():
    ground()
    paving(0, 0, 36, 53)
    courtyard_walls(34, 43, -7)
    # Five commemorative stone gates form the approach in a shallow fan.
    for x, z, s in [
        (-12, 14, 0.8),
        (-6, 18, 0.88),
        (0, 20, 1),
        (6, 18, 0.88),
        (12, 14, 0.8),
    ]:
        archway(x, z, 5.4 * s, height=4.7 * s)
    hall(0, 3, 23, 6, height=4.7, wall="redwall")
    hall(0, -14, 17, 8, height=5.5, wall="redwall", double=True)
    # Bronze offering hall in the interior courtyard.
    for x in [-3, 3]:
        tube("bronze", [(x, 0.6, -6), (x, 3.7, -6)], 0.15, 8)
    hip_roof(0, 3.7, -6, 7.5, 4.2, 1.4, "bronze")
    for x, z in [(-23, 13), (23, 11), (-23, -9), (23, -19)]:
        tree(x, 0.3, z, 10)
    distant_woods(0, -40, 30, 105, h=11)


def wansong():
    ground()
    # A long stepped ascent rather than a waterfront temple plan.
    terrain(-38, -42, 29, 55, 11)
    terrain(38, -42, 29, 55, 11)
    terrain(0, -78, 40, 32, 12)
    paving(0, 23, 8, 45)
    steps(0, 8, 6, 3, 16, 12, 0.4)
    archway(0, 2, 10, y=3.4, height=5)
    steps(0, -8, 6, 3.4, 17, 12, 3.4)
    box("stone", (0, 6.5, -21), (25, 1.2, 15))
    hall(0, -24, 16, 8, y=7, height=4.5, wall="plaster")
    for side in [-1, 1]:
        hall(side * 12, -13, 6, 6, y=4.5, height=3.4, wall="plaster")
        for i in range(5):
            pine(side * (7 + i * 2.5), 0.4 + i * 0.7, 15 - i * 10, 9 + i * 0.6)
    for z, y in [(9, 1.7), (-6, 5), (-17, 7)]:
        for side in [-1, 1]:
            box("stoneedge", (side * 4.6, y + 0.8, z), (0.8, 1.6, 0.6))
    slope_woods(-38, -42, 29, 55, 100, 6)
    slope_woods(38, -42, 29, 55, 100, 6)
    slope_woods(0, -78, 40, 32, 55, 6)
    distant_woods(0, -53, 40, 115, y=3, h=12)


def yang_causeway():
    # Two wetland channels flank a sinuous tree-lined embankment.
    def centre(z):
        return 6 * math.sin(z * 0.05)

    vs = []
    for i in range(85):
        z = -110 + i * 2.8
        c = centre(z)
        vs.extend([(c - 4, 0, z), (c - 3, 0.75, z), (c + 3, 0.75, z), (c + 4, 0, z)])
    mesh(
        "earth",
        vs,
        [
            (i * 4 + j, (i + 1) * 4 + j, (i + 1) * 4 + j + 1, i * 4 + j + 1)
            for i in range(84)
            for j in range(3)
        ],
    )
    for i in range(68):
        z = -92 + i * 3
        c = centre(z)
        box("sand", (c, 0.82, z), (2.7, 0.12, 3.1))
    # The crossing arch provides the characteristic foreground causeway view.
    bridge(0, 6, 20, 3.5, 2.1)
    terrain(-19, 8, 13, 10, 1)
    terrain(19, 8, 13, 10, 1)
    for z in [-35, -22, -9, 18, 32, 46, 64]:
        for side in [-1, 1]:
            tree(centre(z) + side * 2.7, 0.72, z, 6.5 + random.random() * 2)
    for x, z in [(-20, 6), (-17, -22), (19, 3), (15, -30), (25, -48)]:
        reeds(x, z, 70, 5)
    terrain(0, -110, 145, 33, 3.2)
    distant_woods(0, -98, 45, 130, h=8)


def santai():
    # Open pond with scattered low islands, a long zigzag boardwalk and reed beds.
    for x, z, rx, rz in [
        (-29, -15, 15, 11),
        (24, -22, 18, 11),
        (4, -45, 21, 12),
        (-41, 20, 14, 18),
    ]:
        terrain(x, z, rx, rz, 1.5)
        for j in range(3):
            tree(x + (j - 1) * 4, 0.9, z - j, 7)
    points = [(-29, 15), (-13, 15), (-13, 3), (3, 3), (3, -8), (17, -8), (17, -19)]
    for (x1, z1), (x2, z2) in zip(points, points[1:]):
        length = math.hypot(x2 - x1, z2 - z1)
        for i in range(round(length / 0.38)):
            t = i / max(1, round(length / 0.38) - 1)
            x = x1 + (x2 - x1) * t
            z = z1 + (z2 - z1) * t
            along_x = abs(x2 - x1) > abs(z2 - z1)
            box(
                "woodlight",
                (x, 0.64, z),
                (0.38 if along_x else 2.3, 0.16, 2.3 if along_x else 0.38),
            )
        for side in [-1, 1]:
            dx = 0 if x1 != x2 else side * 1.1
            dz = side * 1.1 if x1 != x2 else 0
            railing(x1 + dx, z1 + dz, x2 + dx, z2 + dz, 0.7, 0.8, "wood")
    # Reed-thatched waterside shelter, open on all sides.
    for x in [-16, -10]:
        for z in [12, 18]:
            tube("wood", [(x, 0.6, z), (x, 4, z)], 0.13, 8)
    hip_roof(-13, 4, 15, 8, 8, 2.5, "thatch")
    for i in range(24):
        x = -17 + i * 0.34
        tube("thatch", [(x, 4.2, 19), (x, 6.5, 15), (x, 4.2, 11)], 0.04, 4)
    for x, z in [(-22, 5), (-28, -9), (20, -10), (7, -35), (-38, 23), (33, -23)]:
        reeds(x, z, 100, 5)
    terrain(0, -100, 145, 36, 5)
    for x, z, h in [(-35, -72, 14), (0, -79, 20), (37, -74, 16)]:
        terrain(x, z, 32, 24, h)
    distant_woods(0, -66, 45, 125, h=12)


def tea_hill(x, z, rx, rz, height):
    terrain(x, z, rx, rz, height)
    # Contour-following rows use raised ridges, with small breaks as picking paths.
    for row in range(4, 18):
        rr = row / 19
        points = []
        for j in range(91):
            angle = -math.pi * 0.08 + j * math.pi * 1.13 / 90
            xx = x + math.cos(angle) * rx * rr
            zz = z + math.sin(angle) * rz * rr
            yy = -0.15 + height * max(0, 1 - rr * rr) ** 0.7
            points.append((xx, yy + 0.22, zz))
        tube("tea" if row % 3 else "tealight", points, 0.27, 6)
        for j in range(0, len(points), 3):
            xx, yy, zz = points[j]
            lathe("tealight", (xx, yy, zz), [(0, 0.2), (0.15, 0.27), (0.36, 0.05)], 6)


def meijiawu():
    ground()
    tea_hill(-35, -20, 24, 31, 8)
    tea_hill(40, -37, 25, 30, 11)
    tea_hill(-7, -65, 37, 32, 17)
    # The village follows the valley floor; its lane widens into the foreground.
    vs = []
    for i in range(45):
        z = -35 + i * 3.6
        x = 3 + math.sin(z * 0.05) * 3
        width = 2.4 + max(z, 0) * 0.015
        vs.extend([(x - width, 0.34, z), (x + width, 0.34, z)])
    mesh("stoneedge", vs, [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(44)])
    for x, z, w, h in [
        (-5, 10, 6, 5),
        (13, 4, 7, 6),
        (-7, -4, 7, 5.5),
        (12, -12, 6, 5),
        (-1, -23, 6, 5),
    ]:
        villa(x, z, w, 5, h, 0, white=True)
    for x, z in [(-16, 11), (22, 1), (-15, -20), (18, -23)]:
        tree(x, 0.4, z, 7)
    for x in [-25, 26]:
        tea_hill(x, 24, 15, 25, 2.4)
    distant_woods(0, -82, 38, 115, y=5, h=11)


def villa(x, z, width=8, depth=6, height=7, style=0, white=False):
    mat = "plaster" if white or style == 0 else "brick"
    box(mat, (x, 0.4 + height / 2, z), (width, height, depth))
    hip_roof(x, height + 0.5, z, width + 1, depth + 1, 1.9)
    for floor in range(max(1, round(height / 2.7))):
        yy = 1.7 + floor * 2.45
        for dx in [-width * 0.28, 0, width * 0.28]:
            box(
                "window",
                (x + dx, yy, z + depth / 2 + 0.035),
                (width * 0.15, 1.28, 0.07),
            )
            box(
                "stoneedge",
                (x + dx, yy - 0.68, z + depth / 2 + 0.08),
                (width * 0.18, 0.12, 0.2),
            )
            tube(
                "woodlight",
                [
                    (x + dx, yy - 0.6, z + depth / 2 + 0.085),
                    (x + dx, yy + 0.6, z + depth / 2 + 0.085),
                ],
                0.026,
                4,
            )
            tube(
                "woodlight",
                [
                    (x + dx - width * 0.07, yy, z + depth / 2 + 0.085),
                    (x + dx + width * 0.07, yy, z + depth / 2 + 0.085),
                ],
                0.026,
                4,
            )
    box("wooddark", (x, 1.3, z + depth / 2 + 0.06), (1.15, 2, 0.12))
    if style == 1:
        box(
            "stoneedge",
            (x, height * 0.54, z + depth / 2 + 0.75),
            (width * 0.72, 0.2, 1.5),
        )
        railing(
            x - width * 0.35,
            z + depth / 2 + 1.4,
            x + width * 0.35,
            z + depth / 2 + 1.4,
            height * 0.54,
            0.85,
            "bronze",
        )
        for side in [-1, 1]:
            tube(
                "stoneedge",
                [
                    (x + side * width * 0.32, 0.45, z + depth / 2 + 1.1),
                    (x + side * width * 0.32, height * 0.54, z + depth / 2 + 1.1),
                ],
                0.13,
                8,
            )
    if style == 2:
        # Historic brick arcade: arches are actual open arches in front of the wall.
        for dx in [-width * 0.28, 0, width * 0.28]:
            for side in [-1, 1]:
                box(
                    "brick",
                    (x + dx + side * 0.75, 1.45, z + depth / 2 + 1),
                    (0.25, 2.1, 0.45),
                )
            pts = [
                (
                    x + dx + 0.75 * math.cos(a * math.pi / 24),
                    2.5 + 0.8 * math.sin(a * math.pi / 24),
                    z + depth / 2 + 1,
                )
                for a in range(25)
            ]
            tube("stoneedge", pts, 0.14, 6)
        box("brick", (x, 3.6, z + depth / 2 + 1), (width, 0.3, 0.5))


def beishan():
    # North-shore road reads horizontally, with urban facades below Baoshi Hill.
    vs = []
    for i in range(61):
        x = -135 + i * 4.5
        edge = 9 + 0.008 * x
        vs.extend([(x, 0.16, edge), (x, 0.42, edge - 2), (x, 0.3, -135)])
    mesh(
        "earth",
        vs,
        [
            (3 * i + j, 3 * (i + 1) + j, 3 * (i + 1) + j + 1, 3 * i + j + 1)
            for i in range(60)
            for j in range(2)
        ],
    )
    paving(0, 3, 180, 8, 0.5)
    tube("stoneedge", [(-130, 0.45, 9), (130, 0.45, 11)], 0.3, 8)
    terrain(2, -53, 52, 32, 22)
    for x, z, w, d, h, style in [
        (-27, -9, 10, 7, 7, 1),
        (-14, -11, 9, 7, 8, 0),
        (-1, -9, 11, 7, 8, 2),
        (13, -13, 10, 7, 9, 1),
        (27, -11, 9, 7, 7, 0),
    ]:
        villa(x, z, w, d, h, style)
    for x in [-39, -21, 7, 23, 40]:
        tree(x, 0.5, -3, 6.7)
    for x in range(-36, 37, 12):
        bench(x + 2, 7)
        lamp(x - 2, 7)
    for x, z in [(-35, -22), (34, -25), (-21, -29), (22, -32)]:
        pine(x, 2, z, 10)
    slope_woods(2, -53, 52, 32, 130, 6)
    distant_woods(0, -37, 22, 92, y=0.3, h=7)
    for x, z in [(-8, -44), (2, -49), (12, -44)]:
        rock(x, 13, z, 5)


SCENES = {
    "lingyin": lingyin,
    "liuhe-tide": liuhe_tide,
    "yue-fei": yue_fei,
    "lakeside-rain": lakeside_rain,
    "qian-king": qian_king,
    "wansong": wansong,
    "yang-causeway": yang_causeway,
    "santai": santai,
    "meijiawu": meijiawu,
    "beishan": beishan,
}

if __name__ == "__main__":
    requested = (
        sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else list(SCENES)
    )
    for index, name in enumerate(requested):
        random.seed(300 + list(SCENES).index(name))
        TERRAIN.clear()
        GROUND_HEIGHT = None
        SCENES[name]()
        vertices = [point for points, faces in G.values() for point in points]
        triangles = sum(
            sum(len(face) - 2 for face in faces) for points, faces in G.values()
        )
        assert triangles < 700000, (name, triangles)
        assert all(math.isfinite(value) for point in vertices for value in point), name
        bounds = [
            (
                round(min(point[axis] for point in vertices), 2),
                round(max(point[axis] for point in vertices), 2),
            )
            for axis in range(3)
        ]
        print("VALIDATED", name, "triangles", triangles, "Blender XYZ bounds", bounds)
        export(name)
