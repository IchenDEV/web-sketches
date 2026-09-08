"""Seven authored landscapes completing the traditional West Lake Ten Scenes.

Coordinates are Three.js world coordinates: Y is up, lake level is -0.1.
Run with Blender --background --python scripts/models/classic.py.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import *

COLORS.update(
    {
        "peach": (0.72, 0.43, 0.43),
        "petal": (0.82, 0.61, 0.60),
        "lotusleaf": (0.26, 0.43, 0.29),
        "lotuslight": (0.43, 0.56, 0.34),
        "carp": (0.65, 0.20, 0.12),
        "carpgold": (0.76, 0.43, 0.19),
        "autumn": (0.64, 0.40, 0.18),
        "bronze": (0.34, 0.34, 0.21),
        "bronzerim": (0.45, 0.43, 0.26),
        "bird": (0.62, 0.51, 0.16),
        "mountain": (0.36, 0.43, 0.35),
        "mountainfar": (0.48, 0.53, 0.45),
    }
)


def place(build, x=0, z=0, angle=0):
    """Transform just the vertices appended by a local model builder."""
    starts = {key: len(data[0]) for key, data in G.items()}
    build()
    ca, sa = math.cos(angle), math.sin(angle)
    for key, (vertices, _) in G.items():
        for i in range(starts.get(key, 0), len(vertices)):
            px, nz, py = vertices[i]
            pz = -nz
            vertices[i] = (x + px * ca - pz * sa, -(z + px * sa + pz * ca), py)


def railing(a, b, y, mat="stoneedge", height=0.85):
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    count = max(1, int(length / 1.25))
    for i in range(count + 1):
        t = i / count
        x, z = a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t
        box(mat, (x, y + height * 0.5, z), (0.15, height, 0.15))
        lathe(mat, (x, y + height, z), [(0, 0.12), (0.1, 0.14), (0.23, 0.02)], 8)
    for h in [0.28, height * 0.83]:
        tube(mat, [(a[0], y + h, a[1]), (b[0], y + h, b[1])], 0.052, 6)


def pavilion(x, y, z, radius=3, height=3.6, sides=6):
    lathe(
        "stone",
        (x, y - 0.2, z),
        [(0, radius * 0.94), (0.35, radius * 0.94), (0.48, radius * 0.88)],
        sides,
    )
    for j in range(sides):
        a = j * math.tau / sides + math.pi / 6
        xx, zz = x + math.cos(a) * radius * 0.69, z + math.sin(a) * radius * 0.69
        tube("wood", [(xx, y + 0.2, zz), (xx, y + height, zz)], 0.14, 10)
        lathe("stoneedge", (xx, y + 0.2, zz), [(0, 0.23), (0.28, 0.2)], 10)
        next_a = (j + 1) * math.tau / sides + math.pi / 6
        nx, nz = (
            x + math.cos(next_a) * radius * 0.69,
            z + math.sin(next_a) * radius * 0.69,
        )
        tube(
            "woodlight",
            [(xx, y + height - 0.25, zz), (nx, y + height - 0.25, nz)],
            0.10,
            6,
        )
        if j not in [0, 1]:
            railing((xx, zz), (nx, nz), y + 0.32, "woodlight", 0.7)
    roof(x, y + height, z, radius, 1.8, sides, 10)


def bridge(length=14, width=3, rise=2.2):
    """Stone barrel arch, with individual voussoirs and stepped balustrades."""
    steps = 40

    def top(t):
        return 0.55 + rise * math.sin(math.pi * t) ** 0.75

    def underside(t):
        return -0.30 + (rise + 0.02) * math.sin(math.pi * t) ** 0.60

    for i in range(steps):
        a, b = i / steps, (i + 1) / steps
        x1, x2 = (a - 0.5) * length, (b - 0.5) * length
        for side in [-1, 1]:
            z = side * width * 0.5
            mesh(
                "stone",
                [
                    (x1, underside(a), z),
                    (x2, underside(b), z),
                    (x2, top(b), z),
                    (x1, top(a), z),
                ],
                [(0, 1, 2, 3)],
            )
            tube(
                "mortar",
                [(x1, underside(a), z + side * 0.008), (x1, top(a), z + side * 0.008)],
                0.015,
                4,
            )
        mesh(
            "stoneedge",
            [
                (x1, top(a), -width * 0.5),
                (x2, top(b), -width * 0.5),
                (x2, top(b), width * 0.5),
                (x1, top(a), width * 0.5),
            ],
            [(0, 1, 2, 3)],
        )
        mesh(
            "stone2",
            [
                (x1, underside(a), -width * 0.5),
                (x2, underside(b), -width * 0.5),
                (x2, underside(b), width * 0.5),
                (x1, underside(a), width * 0.5),
            ],
            [(0, 1, 2, 3)],
        )
    for side in [-1, 1]:
        z = side * width * 0.52
        for i in range(13):
            t = i / 12
            x = (t - 0.5) * length
            y = top(t)
            box("stoneedge", (x, y + 0.45, z), (0.16, 0.9, 0.16))
            lathe(
                "stoneedge",
                (x, y + 0.89, z),
                [(0, 0.12), (0.12, 0.12), (0.22, 0.02)],
                8,
            )
        for h in [0.25, 0.68]:
            tube(
                "stoneedge",
                [
                    ((i / steps - 0.5) * length, top(i / steps) + h, z)
                    for i in range(steps + 1)
                ],
                0.064,
                6,
            )


def willow(x, y, z, height=8):
    curved_branch(
        "bark",
        [(x, y, z), (x - 0.5, y + height * 0.35, z), (x + 0.4, y + height * 0.8, z)],
        height * 0.055,
        8,
    )
    for j in range(10):
        a = j * 2.4
        end = (
            x + math.cos(a) * height * 0.36,
            y + height * (0.65 + 0.2 * random.random()),
            z + math.sin(a) * height * 0.36,
        )
        curved_branch(
            "bark",
            [
                (x, y + height * 0.34, z),
                (
                    x + math.cos(a) * height * 0.26,
                    y + height * 0.92,
                    z + math.sin(a) * height * 0.26,
                ),
                end,
            ],
            height * 0.022,
            6,
        )
        for k in range(9):
            dx = random.uniform(-0.8, 0.8)
            dz = random.uniform(-0.8, 0.8)
            drop = height * random.uniform(0.3, 0.65)
            points = [
                (
                    end[0] + dx * (i / 12),
                    end[1] + 0.5 * math.sin(math.pi * i / 12) - drop * (i / 12) ** 1.3,
                    end[2] + dz * (i / 12),
                )
                for i in range(13)
            ]
            tube("leaf0", points, 0.018, 4)
            for i in range(1, 12):
                px, py, pz = points[i]
                sign = 1 if i % 2 else -1
                mesh(
                    "leaf1",
                    [
                        (px, py, pz),
                        (px + 0.17 * sign, py - 0.10, pz + 0.045),
                        (px + 0.12 * sign, py - 0.42, pz + 0.01),
                        (px - 0.018, py - 0.2, pz),
                    ],
                    [(0, 1, 2, 3)],
                )


def flowering_tree(x, y, z, h=5, mat="peach"):
    # A real branching silhouette remains visible beneath loose blossom clusters.
    snow_vertices, snow_faces = map(len, G["snow"])
    tree(x, y, z, h, winter=True)
    # The bare-branch helper also authors snow; spring/autumn trees only need branches.
    del G["snow"][0][snow_vertices:]
    del G["snow"][1][snow_faces:]
    for j in range(45):
        a = j * 2.4
        r = h * 0.37 * math.sqrt(random.random())
        px, pz = x + math.cos(a) * r, z + math.sin(a) * r
        py = y + h * 0.70 + random.uniform(-0.15, 0.23) * h
        lathe(
            mat, (px, py, pz), [(0, 0.04), (0.13, 0.32), (0.32, 0.37), (0.51, 0.12)], 7
        )


def shoreline(z=-19):
    # Closely sampled scallops avoid the giant polygon corners of a distant ellipse.
    def edge(x):
        return (
            z
            + 1.5 * math.sin(x * 0.12)
            + 0.8 * math.sin(x * 0.37)
            + 0.35 * math.sin(x * 0.77)
        )

    vs = []
    for row in range(5):
        for i in range(181):
            x = -150 + i * 300 / 180
            vs.append(
                (
                    x,
                    [-0.18, 0.48, 0.72, 0.9, 0.5][row],
                    edge(x) - [0, 1.1, 4, 22, 145][row],
                )
            )
    mesh(
        "earth",
        vs,
        [
            (r * 181 + i, r * 181 + i + 1, (r + 1) * 181 + i + 1, (r + 1) * 181 + i)
            for r in range(4)
            for i in range(180)
        ],
    )
    for i in range(18):
        x = -65 + i * 7.2 + random.uniform(-2, 2)
        for j in range(random.randint(2, 5)):
            xx = x + random.uniform(-1.1, 1.1)
            rock(
                xx,
                -0.04,
                edge(xx) + random.uniform(-0.7, 0.35),
                random.uniform(0.38, 1.05),
            )
    garden_layer(z)


def garden_layer(z):
    """Uneven, overlapping understorey grounds trees and screens the far meadow."""
    for i in range(20):
        x = -47 + i * 4.8 + random.uniform(-1.1, 1.1)
        zz = z - random.uniform(2.5, 8)
        h = random.uniform(1.1, 2.4)
        for j in range(3):
            foliage(
                x + (j - 1) * h * 0.52,
                0.7 + h * 0.55,
                zz + random.uniform(-0.5, 0.5),
                h * 0.62,
                "leaf" + str(i % 3),
            )
        if i % 3 == 0:
            tree(x + 1, 0.6, zz - 3, random.uniform(3.8, 5.8))
        for j in range(5):
            xx = x + random.uniform(-1, 1)
            pz = zz + random.uniform(-1, 1)
            for k in range(3):
                mesh(
                    "leaf1",
                    [
                        (xx - 0.025, 0.5, pz),
                        (xx + 0.025, 0.5, pz),
                        (
                            xx + math.sin(k * 2.4) * 0.22,
                            0.9 + random.random() * 0.3,
                            pz + math.cos(k * 2.4) * 0.25,
                        ),
                    ],
                    [(0, 1, 2)],
                )


def pine(x, y, z, h=8):
    curved_branch(
        "bark",
        [(x, y, z), (x - h * 0.2, y + h * 0.4, z + 0.2), (x + h * 0.1, y + h * 0.8, z)],
        h * 0.05,
        8,
    )
    for i in range(6):
        side = (-1) ** i
        cy = y + h * (0.45 + i * 0.075)
        ex = x + side * h * (0.38 - i * 0.033)
        curved_branch(
            "bark",
            [(x, cy - 0.6, z), (ex, cy, z), (ex + side * 0.5, cy + 0.25, z + 0.5)],
            h * 0.018,
            6,
        )
        for j in range(3):
            # Compressed clusters make pine boughs spread horizontally.
            before = {k: len(v) for k, (v, _) in G.items()}
            foliage(ex + (j - 1) * h * 0.12, cy + 0.35, z, h * 0.22, "leaf0")
            for key, (verts, _) in G.items():
                if key.startswith("crown"):
                    for k in range(before.get(key, 0), len(verts)):
                        px, nz, py = verts[k]
                        verts[k] = (px, nz, cy + 0.35 + (py - cy - 0.35) * 0.48)


def su_causeway():
    # The front arch spans the water; successive bridges carry the eye down the causeway.
    place(lambda: bridge(16, 3.8, 2.4), -2, 1, -0.25)
    place(lambda: bridge(12, 3.2, 1.7), 17, -18, -0.90)
    place(lambda: bridge(10, 2.6, 1.4), 26, -41, -1.05)
    terrain(-39, 17, 37, 17, 0.95)
    terrain(12, -9, 5.3, 16, 1.0)
    terrain(24, -31, 4.2, 11, 1.0)
    terrain(33, -83, 4.0, 38, 0.9)
    terrain(-110, 50, 95, 100, 0.85)
    for x, z, h in [
        (-16, 4, 8),
        (-28, 12, 7),
        (9, -8, 7),
        (12, -15, 6),
        (23, -27, 5),
        (29, -48, 4),
        (34, -67, 3),
    ]:
        willow(x, 0.55, z, h)
        flowering_tree(x + 4, 0.65, z + 2, h * 0.68)
    for i in range(32):
        a = i * 0.23
        rock(-39 + math.cos(a) * 35, -0.05, 17 + math.sin(a) * 16, 1.1)
    boat(7, 12)


def lotus(x, z, size=1, flower=False):
    h = random.uniform(0.12, 0.52)
    tube("leaf0", [(x, -0.1, z), (x + 0.06, h, z)], 0.025, 5)
    verts = [(x, h + 0.1, z)]
    for i in range(21):
        a = i * math.tau / 21
        r = size * (0.9 + 0.08 * math.sin(i * 2.8))
        verts.append(
            (x + r * math.cos(a), h + 0.02 * math.sin(a * 4), z + r * math.sin(a))
        )
    mesh("lotusleaf", verts, [(0, i + 1, (i + 1) % 21 + 1) for i in range(21)])
    for i in range(0, 21, 3):
        tube("lotuslight", [(x, h + 0.11, z), verts[i + 1]], 0.013, 4)
    if flower:
        fy = h + 0.95
        tube("leaf0", [(x, -0.1, z), (x + 0.25, fy, z + 0.1)], 0.027, 5)
        for j in range(9):
            a = j * math.tau / 9
            dx, dz = math.cos(a), math.sin(a)
            mesh(
                "petal",
                [
                    (x + 0.25, fy - 0.05, z + 0.1),
                    (
                        x + 0.25 + dx * 0.38 - dz * 0.15,
                        fy + 0.23,
                        z + 0.1 + dz * 0.38 + dx * 0.15,
                    ),
                    (x + 0.25 + dx * 0.54, fy + 0.55, z + 0.1 + dz * 0.54),
                    (
                        x + 0.25 + dx * 0.38 + dz * 0.15,
                        fy + 0.23,
                        z + 0.1 + dz * 0.38 - dx * 0.15,
                    ),
                ],
                [(0, 1, 2, 3)],
            )
        lathe("gold", (x + 0.25, fy, z + 0.1), [(0, 0.1), (0.23, 0.13), (0.3, 0.01)], 9)


def lotus_breeze():
    shoreline(-20)
    pavilion(-13, 0.35, -7, 4.0, 4.0)
    # Raised, angular winding walkway surrounds a generous open lotus pond.
    points = [(-45, 2), (-20, 2), (-20, -8), (-4, -8), (-4, -15), (18, -15), (18, -22)]
    for a, b in zip(points, points[1:]):
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        angle = math.atan2(b[1] - a[1], b[0] - a[0])

        def walk():
            box("woodlight", (0, 0.65, 0), (length, 0.23, 1.8))
            for zz in [-0.9, 0.9]:
                railing((-length / 2, zz), (length / 2, zz), 0.78, "woodlight", 0.7)
            for xx in [-length / 2, 0, length / 2]:
                box("wood", (xx, 0.1, 0), (0.24, 1.1, 1.5))

        place(walk, *mid, angle)
    for i in range(120):
        x, z = random.uniform(-17, 26), random.uniform(-4, 19)
        if (x - 5) ** 2 / 500 + (z - 6) ** 2 / 170 < 1:
            lotus(x, z, random.uniform(0.5, 1.0), i % 5 == 0)
    for x, z in [(-30, -21), (-17, -23), (6, -25), (23, -25), (36, -23)]:
        tree(x, 0.6, z, random.uniform(6, 9))
    for i in range(9):
        rock(-25 + i * 0.4, -0.05, 2.5 + i * 0.2, 0.7)


def autumn_moon():
    shoreline(-18)
    terrain(-42, 25, 30, 65, 0.8)
    box("stone", (-10, 0.38, -5), (22, 0.8, 14))
    box("stoneedge", (-10, 0.84, -5), (22.5, 0.14, 14.4))
    for x1, x2, z in [(-21, 1, 2.2), (-21, 1, -12.2)]:
        railing((x1, z), (x2, z), 0.91)
    railing((1, -12), (1, 2), 0.91)
    pavilion(-11, 1, -8, 4.6, 4.4, 4)
    for x, z, h in [(-26, -3, 9), (-28, -15, 8), (-16, -20, 8), (-1, -22, 7)]:
        flowering_tree(x, 0.6, z, h, "autumn")
    for i in range(6):
        box("stoneedge", (3 + i * 0.38, 0.76 - i * 0.11, -5), (0.5, 0.22, 4))
    for i in range(15):
        rock(
            -25 + random.uniform(-2, 2), -0.03, -10 + i * 2.2, random.uniform(0.7, 1.4)
        )


def carp(x, z, size=1, angle=0):
    def body():
        # Wide-backed fish sit just within the lake surface, so refraction remains legible.
        sections = [
            (-0.8, 0.025),
            (-0.55, 0.18),
            (-0.1, 0.25),
            (0.4, 0.17),
            (0.65, 0.055),
        ]
        vs = []
        for xx, r in sections:
            for j in range(8):
                a = j * math.tau / 8
                vs.append(
                    (
                        xx * size,
                        0.13 + math.sin(a) * r * size * 0.45,
                        math.cos(a) * r * size,
                    )
                )
        mesh(
            "carp",
            vs,
            [
                (
                    i * 8 + j,
                    i * 8 + (j + 1) % 8,
                    (i + 1) * 8 + (j + 1) % 8,
                    (i + 1) * 8 + j,
                )
                for i in range(4)
                for j in range(8)
            ],
        )
        mesh(
            "carpgold",
            [
                (-0.6 * size, 0.14, 0),
                (-1.12 * size, 0.14, -0.35 * size),
                (-0.95 * size, 0.16, 0),
                (-1.12 * size, 0.14, 0.35 * size),
            ],
            [(0, 1, 2), (0, 2, 3)],
        )
        for side in [-1, 1]:
            mesh(
                "carpgold",
                [
                    (-0.1 * size, 0.13, side * 0.2 * size),
                    (-0.45 * size, 0.14, side * 0.43 * size),
                    (0.2 * size, 0.14, side * 0.23 * size),
                ],
                [(0, 1, 2)],
            )

    place(body, x, z, angle)


def fish_harbor():
    shoreline(-18)
    terrain(-43, 40, 31, 95, 0.9)
    terrain(48, 35, 28, 100, 0.7)
    pavilion(-19, 0.55, -11, 3.8, 3.8)
    # Bent viewing terrace frames an open red-carp pond rather than covering it.
    box("stone", (-18, 0.4, 5), (4, 0.8, 24))
    box("stone", (-4, 0.4, -7), (31, 0.8, 3.5))
    railing((-15.8, -5), (-15.8, 17), 0.83)
    railing((-15.8, -5), (11.5, -5), 0.83)
    for i in range(35):
        carp(
            random.uniform(-11, 12),
            random.uniform(-1, 13),
            random.uniform(0.7, 1.5),
            random.uniform(0, math.tau),
        )
    for i in range(35):
        x, z = random.uniform(-32, -23), random.uniform(-2, 16)
        lathe("leaf1", (x, 0.5, z), [(0, 0.5), (0.5, 0.65), (0.85, 0.2)], 8)
        for j in range(3):
            lathe(
                "peach",
                (x + random.uniform(-0.4, 0.4), 1.1, z + random.uniform(-0.4, 0.4)),
                [(0, 0.05), (0.15, 0.3), (0.35, 0.12)],
                8,
            )
    for x, z in [(-31, -14), (-6, -20), (14, -21), (24, -14)]:
        tree(x, 0.4, z, 8)
    for i in range(11):
        rock(21 + math.sin(i) * 1.8, -0.04, -3 + i * 2, random.uniform(1, 1.8))


def willow_orioles():
    shoreline(-15)
    terrain(-43, 33, 38, 88, 1.05)
    terrain(48, 27, 27, 96, 0.8)
    for x, z, h in [
        (-20, 2, 11),
        (-29, -6, 12),
        (-11, -14, 9),
        (3, -20, 8),
        (19, -19, 8),
        (29, -9, 10),
    ]:
        willow(x, 0.7, z, h)
    pavilion(-8, 0.5, -17, 2.8, 3.2)
    for i in range(32):
        rock(-12 + math.sin(i * 0.13) * 5, -0.05, 4 + i * 2.2, random.uniform(0.5, 1.1))
    for i in range(9):
        x, y, z = random.uniform(-13, 10), random.uniform(5, 9), random.uniform(-7, 3)
        tube(
            "bird", [(x - 0.3, y + 0.1, z), (x, y, z), (x + 0.3, y + 0.15, z)], 0.06, 5
        )
        tube("bird", [(x, y - 0.05, z - 0.12), (x, y, z + 0.18)], 0.055, 6)
    boat(10, 10)


def mountain(x, z, rx, rz, height, mat):
    # Nested, corrugated contours give these mountains actual ridges at every viewing angle.
    rings, sides = 40, 96

    def surface(t, a):
        radial = (1 - t) ** 0.57 * (
            1 + 0.13 * math.sin(a * 5 + t * 7) + 0.08 * math.sin(a * 9 - t * 5)
        )
        shoulder = math.sin(math.pi * t) ** 1.4
        yy = height * t + math.sin(a * 3 + t * 9) * height * 0.09 * shoulder
        drift_x = rx * (0.15 * math.sin(t * 5) + 0.16 * t)
        drift_z = rz * 0.13 * math.sin(t * 4)
        return (
            x + math.cos(a) * rx * radial + drift_x,
            yy - 0.2,
            z + math.sin(a) * rz * radial + drift_z,
        )

    vs = []
    for i in range(rings + 1):
        t = i / rings
        for j in range(sides):
            a = j * math.tau / sides
            vs.append(surface(t, a))
    mesh(
        mat,
        vs,
        [
            (
                i * sides + j,
                i * sides + (j + 1) % sides,
                (i + 1) * sides + (j + 1) % sides,
                (i + 1) * sides + j,
            )
            for i in range(rings)
            for j in range(sides)
        ],
    )
    # Low-cost slope pines follow the exact hill surface, with gaps exposing rock folds.
    count = min(240, int(rx * height / 4))
    for i in range(count):
        t = random.uniform(0.07, 0.96)
        a = random.uniform(-0.12, math.pi + 0.12)
        px, py, pz = surface(t, a)
        h = random.uniform(1.0, 2.3) * (1 - 0.25 * t)
        tube(
            "bark",
            [
                (px, py, pz),
                (px - 0.08 * h, py + h * 0.45, pz),
                (px + 0.07 * h, py + h * 0.83, pz),
            ],
            0.045 * h,
            5,
        )
        for j in range(3):
            side = (-1) ** j
            yy = py + h * (0.55 + j * 0.16)
            ex = px + side * h * (0.34 - j * 0.06)
            tube(
                "bark", [(px, yy - 0.2 * h, pz), (ex, yy, pz + 0.06 * h)], 0.025 * h, 4
            )
            foliage(ex, yy + 0.18 * h, pz, h * (0.30 - j * 0.035), "leaf" + str(i % 3))
        if i % 9 == 0:
            rock(px + 0.5, py - 0.3, pz + 0.3, random.uniform(0.7, 1.45), flat=True)
    for i in range(20):
        px, py, pz = surface(
            random.uniform(0.15, 0.8), random.uniform(0.2, math.pi - 0.2)
        )
        rock(px, py - 0.25, pz, random.uniform(1.0, 2.1), flat=True)


def twin_peaks():
    mountain(-25, -57, 25, 19, 32, "mountain")
    mountain(25, -74, 27, 21, 38, "mountainfar")
    mountain(-42, -48, 21, 15, 17, "mountainfar")
    mountain(1, -55, 21, 14, 20, "mountain")
    mountain(43, -56, 22, 16, 21, "mountainfar")
    terrain(0, -95, 160, 55, 3)
    terrain(-39, 45, 29, 85, 0.8)
    pavilion(-16, 0.4, 2, 3.1, 3.2)
    for x, z, h in [
        (-28, 1, 8),
        (-34, -12, 10),
        (-18, -27, 8),
        (19, -39, 7),
        (37, -49, 7),
    ]:
        tree(x, 0.4, z, h)
    for i in range(25):
        x = random.uniform(-40, 40)
        z = random.uniform(-52, -35)
        tree(x, 0.3, z, random.uniform(2.2, 4.2))
    for i in range(15):
        rock(-20 + math.sin(i * 0.5) * 4, -0.1, 3 + i * 3, random.uniform(0.6, 1.4))


def temple_hall(x, y, z, width=10, depth=6):
    box("stone", (x, y + 0.25, z), (width + 1, 0.5, depth + 1))
    box("plaster", (x, y + 2.2, z), (width, 3.8, depth))
    for dx in [-0.4, -0.2, 0, 0.2, 0.4]:
        xx = x + width * dx
        box("wood", (xx, y + 2, z + depth * 0.505), (width * 0.14, 3.0, 0.10))
        for j in range(5):
            box(
                "woodlight",
                (xx - width * 0.06 + j * width * 0.03, y + 2.3, z + depth * 0.52),
                (0.035, 2.1, 0.04),
            )
    roof(x, y + 4, z, width * 0.69, 2.1, 4, 14)


def nanping_bell():
    terrain(0, 40, 145, 120, 0.6)
    mountain(4, -43, 51, 18, 23, "mountain")
    box("stone", (-2, 0.68, 2), (38, 0.24, 25))
    # The stone approach continues beyond the camera; no isolated slab in a lawn.
    box("stone", (-4, 0.57, 76), (9, 0.18, 124))
    for zz in range(16, 130, 3):
        tube("mortar", [(-8.5, 0.675, zz), (0.5, 0.675, zz)], 0.018, 4)
    for xx in [-8.5, 0.5]:
        tube("stoneedge", [(xx, 0.70, 14), (xx, 0.70, 138)], 0.08, 6)
    for xx in [-24, 24]:
        box("plaster", (xx, 1.38, -5), (1, 1.5, 35))
        box("roof", (xx, 2.2, -5), (1.3, 0.2, 35.4))
        for zz in [-22, -13, -4, 5, 12]:
            box("stoneedge", (xx, 1.53, zz), (1.35, 1.9, 0.8))
    for xx, zz, hh in [
        (-17, 17, 8),
        (14, 20, 7),
        (-20, 30, 8),
        (17, 35, 9),
        (-18, -5, 8),
        (25, -15, 7),
    ]:
        pine(xx, 0.6, zz, hh)
    for xx in [-17, 14]:
        for j in range(7):
            foliage(xx + random.uniform(-2, 2), 1.3, 40 + j * 6, 1.8, "leaf0")
    # Main hall and cloister behind the open bell pavilion.
    temple_hall(-10, 0.8, -13, 14, 7)
    temple_hall(9, 0.8, -17, 9, 6)
    pavilion(7, 1.0, 0, 4.8, 6.3, 4)
    lathe(
        "bronze",
        (7, 2.0, 0),
        [
            (0, 1.85),
            (0.2, 1.94),
            (0.4, 1.70),
            (1.5, 1.45),
            (2.7, 1.20),
            (3.4, 0.82),
            (3.7, 0.38),
        ],
        40,
    )
    for h, r in [
        (0, 1.86),
        (0.22, 1.92),
        (0.55, 1.67),
        (1.3, 1.50),
        (2.6, 1.25),
        (3.25, 0.9),
    ]:
        lathe("bronzerim", (7, 2 + h, 0), [(0, r), (0.06, r + 0.055), (0.12, r)], 40)
    for j in range(12):
        a = j * math.tau / 12
        tube(
            "bronzerim",
            [
                (7 + math.cos(a) * r, 2 + h, math.sin(a) * r)
                for h, r in [(0.5, 1.66), (1.5, 1.47), (2.65, 1.21)]
            ],
            0.035,
            5,
        )
        for h in [1.8, 2.15, 2.5]:
            lathe(
                "gold",
                (7 + math.cos(a) * 1.4, 2 + h, math.sin(a) * 1.4),
                [(0, 0.07), (0.09, 0.08)],
                6,
            )
    tube("wooddark", [(7, 5.65, 0), (7, 7.2, 0)], 0.12, 8)
    tube("wood", [(9.6, 3.3, -2), (9.6, 3.3, 2.3)], 0.25, 12)
    for zz in [-1.7, 1.8]:
        tube("wooddark", [(9.6, 3.3, zz), (9.6, 6.8, zz)], 0.038, 5)
    for x, z, h in [
        (-23, -9, 10),
        (-27, 7, 10),
        (24, 2, 9),
        (28, -20, 10),
        (-11, -27, 8),
        (9, -30, 7),
    ]:
        tree(x, 0.7, z, h)
    for i in range(8):
        box("stoneedge", (-4, 0.65 - i * 0.07, 15 + i * 0.38), (11, 0.12, 0.45))
    lathe(
        "bronze",
        (-7, 1, 4),
        [(0, 0.5), (0.4, 0.35), (0.6, 0.9), (1.6, 0.75), (1.75, 1.0)],
        12,
    )


SCENES = {
    "su-causeway": su_causeway,
    "lotus-breeze": lotus_breeze,
    "autumn-moon": autumn_moon,
    "fish-harbor": fish_harbor,
    "willow-orioles": willow_orioles,
    "twin-peaks": twin_peaks,
    "nanping-bell": nanping_bell,
}

if __name__ == "__main__":
    for scene_name, build in SCENES.items():
        random.seed(730 + list(SCENES).index(scene_name))
        build()
        vertices = [p for v, _ in G.values() for p in v]
        triangles = sum(sum(len(face) - 2 for face in faces) for _, faces in G.values())
        assert vertices and triangles < 700_000
        assert all(math.isfinite(v) for p in vertices for v in p)
        bounds = [
            (
                round(min(p[i] for p in vertices), 2),
                round(max(p[i] for p in vertices), 2),
            )
            for i in [0, 2, 1]
        ]
        print(
            "VALIDATED",
            scene_name,
            triangles,
            "triangles; X/Y/-Z bounds",
            bounds,
            flush=True,
        )
        export(scene_name)
