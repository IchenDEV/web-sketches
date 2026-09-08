"""Authored, stylized landmarks for the 1985 New Ten Scenes of West Lake.

Run with Blender in background mode. Coordinates are Three.js x/up-y/z;
common.export batches the meshes by material and compresses each GLB.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import *

COLORS.update(
    {
        "earth": (0.43, 0.47, 0.34),
        "bamboo": (0.24, 0.35, 0.19),
        "bamboonode": (0.47, 0.51, 0.29),
        "leaf3": (0.22, 0.35, 0.18),
        "tea": (0.29, 0.41, 0.18),
        "tealight": (0.42, 0.48, 0.24),
        "blossom": (0.91, 0.68, 0.24),
        "pool": (0.24, 0.46, 0.39),
        "redstone": (0.51, 0.29, 0.22),
        "redstoneedge": (0.65, 0.43, 0.31),
    }
)


def ellipsoid(mat, center, radii, segments=12, rows=8):
    """Small sculptural volumes, used for carvings, plants and roof ornaments."""
    x, y, z = center
    a, b, c = radii
    vertices = [
        (
            x + a * math.sin(v * math.pi / rows) * math.cos(u * math.tau / segments),
            y + b * math.cos(v * math.pi / rows),
            z + c * math.sin(v * math.pi / rows) * math.sin(u * math.tau / segments),
        )
        for v in range(rows + 1)
        for u in range(segments)
    ]
    faces = [
        (
            v * segments + u,
            v * segments + (u + 1) % segments,
            (v + 1) * segments + (u + 1) % segments,
            (v + 1) * segments + u,
        )
        for v in range(rows)
        for u in range(segments)
    ]
    mesh(mat, vertices, faces)


def ground(height=None):
    """Continuous land extends past both desktop and portrait camera bounds."""
    height = height or (lambda x, z: 0.5 + 0.10 * math.sin(x * 0.19 + z * 0.12))
    nx, nz = 62, 60
    vertices = []
    for j in range(nz + 1):
        z = -90 + j * 225 / nz
        for i in range(nx + 1):
            x = -125 + i * 250 / nx
            vertices.append((x, height(x, z), z))
    faces = [
        (
            j * (nx + 1) + i,
            j * (nx + 1) + i + 1,
            (j + 1) * (nx + 1) + i + 1,
            (j + 1) * (nx + 1) + i,
        )
        for j in range(nz)
        for i in range(nx)
    ]
    mesh("earth", vertices, faces)


def path(points, width=3, height=0.66):
    """Flagstones run along a gently meandering center line."""
    for index in range(len(points) - 1):
        x0, z0 = points[index]
        x1, z1 = points[index + 1]
        length = math.hypot(x1 - x0, z1 - z0)
        steps = max(1, int(length / 1.1))
        nx, nz = -(z1 - z0) / length, (x1 - x0) / length
        for j in range(steps):
            t0, t1 = j / steps, (j + 0.94) / steps
            for k in range(3):
                a, b = (k / 3 - 0.5) * width, ((k + 0.94) / 3 - 0.5) * width
                yy = height(index, j / steps) if callable(height) else height
                mesh(
                    "stone" if (index + j + k) % 3 else "stone2",
                    [
                        (
                            x0 + (x1 - x0) * t0 + nx * a,
                            yy,
                            z0 + (z1 - z0) * t0 + nz * a,
                        ),
                        (
                            x0 + (x1 - x0) * t0 + nx * b,
                            yy,
                            z0 + (z1 - z0) * t0 + nz * b,
                        ),
                        (
                            x0 + (x1 - x0) * t1 + nx * b,
                            yy,
                            z0 + (z1 - z0) * t1 + nz * b,
                        ),
                        (
                            x0 + (x1 - x0) * t1 + nx * a,
                            yy,
                            z0 + (z1 - z0) * t1 + nz * a,
                        ),
                    ],
                    [(0, 1, 2, 3)],
                )


def rail(cx, y, cz, half_width, half_depth, mat="stoneedge"):
    for side in [-1, 1]:
        for j in range(int(half_width * 1.5) + 1):
            x = cx - half_width + j * 2 * half_width / int(half_width * 1.5)
            box(mat, (x, y + 0.55, cz + side * half_depth), (0.14, 1.1, 0.14))
        for h in [0.30, 0.90]:
            tube(
                mat,
                [
                    (cx - half_width, y + h, cz + side * half_depth),
                    (cx + half_width, y + h, cz + side * half_depth),
                ],
                0.075,
                5,
            )
    for side in [-1, 1]:
        for j in range(int(half_depth * 1.5) + 1):
            z = cz - half_depth + j * 2 * half_depth / int(half_depth * 1.5)
            box(mat, (cx + side * half_width, y + 0.55, z), (0.14, 1.1, 0.14))
        for h in [0.30, 0.90]:
            tube(
                mat,
                [
                    (cx + side * half_width, y + h, cz - half_depth),
                    (cx + side * half_width, y + h, cz + half_depth),
                ],
                0.075,
                5,
            )


def pavilion(x, y, z, radius=4, height=4.2, sides=6, enclosed=False):
    lathe(
        "stone",
        (x, y, z),
        [
            (0, radius * 0.9),
            (0.28, radius * 0.9),
            (0.28, radius * 0.83),
            (0.52, radius * 0.83),
        ],
        sides,
    )
    for j in range(sides):
        a = j * math.tau / sides + math.pi / 6
        px, pz = x + math.cos(a) * radius * 0.67, z + math.sin(a) * radius * 0.67
        tube("wood", [(px, y + 0.45, pz), (px, y + height, pz)], 0.14, 9)
        if enclosed:
            b = (j + 1) * math.tau / sides + math.pi / 6
            qx, qz = x + math.cos(b) * radius * 0.67, z + math.sin(b) * radius * 0.67
            if j != 1:
                mesh(
                    "plaster",
                    [
                        (px, y + 0.52, pz),
                        (qx, y + 0.52, qz),
                        (qx, y + height - 0.45, qz),
                        (px, y + height - 0.45, pz),
                    ],
                    [(0, 1, 2, 3)],
                )
        for lift in [0.75, height - 0.25]:
            b = (j + 1) * math.tau / sides + math.pi / 6
            tube(
                "wooddark",
                [
                    (px, y + lift, pz),
                    (
                        x + math.cos(b) * radius * 0.67,
                        y + lift,
                        z + math.sin(b) * radius * 0.67,
                    ),
                ],
                0.07,
                6,
            )
    roof(x, y + height, z, radius, radius * 0.56, sides, 11)


def temple(x, y, z, width=12, depth=7, height=4.5):
    """A tiled hall with white walls, red-brown columns and lattice doors."""
    box("stone", (x, y + 0.28, z), (width + 1.7, 0.56, depth + 1.7))
    box("plaster", (x, y + height / 2 + 0.5, z), (width, height, depth))
    for j in range(7):
        px = x - width * 0.45 + j * width * 0.9 / 6
        tube(
            "wood",
            [(px, y + 0.5, z + depth * 0.53), (px, y + height + 0.6, z + depth * 0.53)],
            0.12,
            8,
        )
        if j < 6:
            box(
                "wooddark",
                (px + width * 0.075, y + 2.2, z + depth * 0.51),
                (width * 0.125, 3, 0.04),
            )
            for k in range(5):
                box(
                    "woodlight",
                    (px + width * 0.025 + k * width * 0.025, y + 2.5, z + depth * 0.53),
                    (0.035, 2, 0.05),
                )
            for h in [1.6, 2.2, 2.8, 3.4]:
                box(
                    "woodlight",
                    (px + width * 0.075, y + h, z + depth * 0.53),
                    (width * 0.13, 0.035, 0.05),
                )
    # A long ridge and two bowed tiled roof slopes.
    for side in [-1, 1]:
        for j in range(45):
            xx = x - width * 0.58 + j * width * 1.16 / 44
            points = []
            for k in range(15):
                t = k / 14
                points.append(
                    (
                        xx,
                        y + height + 0.4 + 2.4 * (1 - t) ** 1.5 + 0.35 * t**8,
                        z + side * t * depth * 0.72,
                    )
                )
            if j:
                mesh(
                    "roof",
                    previous + points,
                    [(k, k + 1, 16 + k, 15 + k) for k in range(14)],
                )
            tube("ridge", points, 0.037, 5)
            previous = points
    tube(
        "ridge",
        [
            (x - width * 0.62, y + height + 3.1, z),
            (x - width * 0.5, y + height + 2.85, z),
            (x + width * 0.5, y + height + 2.85, z),
            (x + width * 0.62, y + height + 3.1, z),
        ],
        0.14,
        8,
    )
    for j in range(5):
        box(
            "stoneedge",
            (x, y + 0.10 + j * 0.105, z + depth * 0.62 + (4 - j) * 0.34),
            (width * 0.47, 0.20, 0.43),
        )


def bamboo(x, y, z, height=13, lean=0):
    """Jointed culms with fine sprays of pointed individual leaves."""
    nodes = max(7, int(height / 1.1))

    def center(t):
        return (x + lean * t * t, y + height * t, z + 0.13 * math.sin(t * math.pi))

    tube(
        "bamboo",
        [center(j / nodes) for j in range(nodes + 1)],
        0.075 + height * 0.003,
        7,
    )
    for j in range(1, nodes):
        t = j / nodes
        px, py, pz = center(t)
        lathe(
            "bamboonode",
            (px, py, pz),
            [(-0.035, 0.10 + height * 0.003), (0.025, 0.10 + height * 0.003)],
            8,
        )
        if t < 0.36:
            continue
        for spray in range(3):
            direction = j * 2.4 + x + spray * 2.1
            reach = (1.2 + height * 0.095) * (1 - 0.35 * t)
            end = (
                px + math.cos(direction) * reach,
                py + 0.25,
                pz + math.sin(direction) * reach,
            )
            tube(
                "bamboo",
                [(px, py, pz), ((px + end[0]) / 2, py + 0.6, (pz + end[2]) / 2), end],
                0.025,
                5,
            )
            for leaf in range(15):
                t1 = 0.08 + leaf * 0.06
                lx, ly, lz = px + (end[0] - px) * t1, py + 0.43, pz + (end[2] - pz) * t1
                a = direction + (-1 if leaf % 2 else 1) * 0.9
                length = 0.85 + 0.32 * math.sin(leaf * 1.7)
                dx, dz = math.cos(a) * length, math.sin(a) * length
                mesh(
                    "leaf3",
                    [
                        (lx, ly, lz),
                        (
                            lx + dx * 0.5 - dz * 0.11,
                            ly - 0.07,
                            lz + dz * 0.5 + dx * 0.11,
                        ),
                        (lx + dx, ly - 0.4, lz + dz),
                        (
                            lx + dx * 0.5 + dz * 0.11,
                            ly - 0.13,
                            lz + dz * 0.5 - dx * 0.11,
                        ),
                    ],
                    [(0, 1, 2, 3)],
                )


def pool(x, y, z, rx=5, rz=3.8):
    lathe("pool", (x, y, z), [(0, 0), (0, 1)], 48)
    vertices = [(x, y, z)] + [
        (x + rx * math.cos(j * math.tau / 64), y, z + rz * math.sin(j * math.tau / 64))
        for j in range(64)
    ]
    mesh("pool", vertices, [(0, j + 1, (j + 1) % 64 + 1) for j in range(64)])
    for j in range(33):
        a = j * math.tau / 33
        rock(
            x + rx * math.cos(a),
            y - 0.1,
            z + rz * math.sin(a),
            0.65 + random.random() * 0.32,
            True,
        )
    for radius in [0.5, 1, 1.6]:
        tube(
            "waterfall",
            [
                (
                    x + math.cos(j * math.tau / 60) * radius,
                    y + 0.025,
                    z + math.sin(j * math.tau / 60) * radius * 0.5,
                )
                for j in range(61)
            ],
            0.014,
            4,
        )


def grove(positions, height=8):
    for x, y, z in positions:
        tree(x, y, z, height * random.uniform(0.78, 1.18))


def planting_beds(centers, height=None, per_bed=12):
    """Understory clusters make the forest floor a garden, rather than a lawn."""
    height = height or (lambda x, z: 0.63)
    for cx, cz in centers:
        for j in range(per_bed):
            a = j * 2.4
            distance = math.sqrt(j / per_bed) * 5
            x, z = cx + math.cos(a) * distance, cz + math.sin(a) * distance
            y = height(x, z)
            scale = random.uniform(0.8, 1.6)
            for k in range(4):
                angle = k * math.tau / 4 + a
                px, pz = (
                    x + math.cos(angle) * scale * 0.65,
                    z + math.sin(angle) * scale * 0.65,
                )
                curved_branch(
                    "bark",
                    [(x, y, z), (px, y + scale, pz), (px, y + scale * 1.5, pz)],
                    0.045,
                    5,
                )
                foliage(px, y + scale * 1.2, pz, scale * 0.68, "leaf1")
            for k in range(9):
                angle = k * 2.4
                px, pz = x + math.cos(angle) * scale, z + math.sin(angle) * scale
                mesh(
                    "leaf1",
                    [
                        (px, y, pz),
                        (px + 0.05, y + 0.8, pz),
                        (
                            px + math.cos(angle) * 0.35,
                            y + 0.4,
                            pz + math.sin(angle) * 0.35,
                        ),
                    ],
                    [(0, 1, 2)],
                )
        for j in range(4):
            a = random.random() * math.tau
            x, z = cx + math.cos(a) * 4.9, cz + math.sin(a) * 4.9
            rock(x, height(x, z), z, random.uniform(0.4, 1.0), True)


def bamboo_path():
    ground()
    path([(4, 135), (4, 26), (0, 8), (-3, -10), (1, -25), (1, -60)], 4.6)
    pavilion(1, 0.6, -29, 4.5)
    for side in [-1, 1]:
        for row in range(8):
            for column in range(11):
                x = side * (6 + row * 4.8) + random.uniform(-1.2, 1.2)
                z = 29 - column * 7.4 + random.uniform(-2, 2)
                if abs(z + 29) < 5 and abs(x) < 8:
                    continue
                bamboo(x, 0.55, z, random.uniform(10, 20), random.uniform(-2.2, 2.2))
    for side in [-1, 1]:
        for j in range(10):
            rock(
                side * (5.5 + random.random() * 2),
                0.55,
                26 - j * 6,
                random.uniform(0.5, 1.2),
                True,
            )
    box("stone", (-7.3, 1.4, -6), (2.2, 2, 0.45))
    roof(-7.3, 2.45, -6, 1.55, 0.7, 4, 6)
    planting_beds([(-12, 17), (14, 19), (-16, -10), (15, -12)], per_bed=8)
    export("bamboo-path")


def osmanthus_rain():
    ground()
    path([(-3, 135), (-3, 24), (4, 8), (9, -8), (0, -25), (0, -70)], 4.5)
    pavilion(-10, 0.6, -9, 5.3)
    # Stone tea tables under osmanthus branches.
    for x, z in [(-9, 3), (12, 3), (-16, -17)]:
        lathe(
            "stone",
            (x, 0.7, z),
            [(0, 0.35), (0.85, 0.35), (0.85, 1.3), (1.03, 1.3)],
            16,
        )
        for a in [0, 2.1, 4.2]:
            lathe(
                "stone2",
                (x + math.cos(a) * 1.8, 0.6, z + math.sin(a) * 1.8),
                [(0, 0.4), (0.55, 0.43)],
                10,
            )
    locations = [
        (-19, 10),
        (-22, -7),
        (-16, -27),
        (-4, -21),
        (19, 11),
        (19, -9),
        (11, -26),
        (27, -27),
        (-30, -25),
        (0, -38),
        (30, -42),
        (-30, -44),
    ]
    for x, z in locations:
        height = random.uniform(8, 11)
        tree(x, 0.6, z, height)
        for j in range(170):
            a = random.random() * math.tau
            r = math.sqrt(random.random()) * height * 0.35
            px, py, pz = (
                x + math.cos(a) * r,
                height * random.uniform(0.64, 1.06),
                z + math.sin(a) * r,
            )
            ellipsoid("blossom", (px, py, pz), (0.055, 0.065, 0.055), 5, 3)
    for j in range(450):
        x, z = random.uniform(-23, 23), random.uniform(-22, 24)
        mesh(
            "blossom",
            [(x, 0.70, z), (x + 0.11, 0.70, z + 0.025), (x + 0.02, 0.70, z + 0.13)],
            [(0, 1, 2)],
        )
    planting_beds(
        [(-16, 15), (19, 18), (-15, 4), (19, -5), (-22, -23), (20, -26), (-3, -34)],
        per_bed=12,
    )
    grove([(-35, 0.6, -30), (34, 0.6, -24), (-26, 0.6, -39), (15, 0.6, -43)], 6)
    export("osmanthus-rain")


def tiger_spring():
    ground()
    path([(9, 135), (9, 15), (6, 7), (-3, 4), (-14, -10)], 4)
    temple(-5, 0.6, -17, 18, 7, 4.4)
    pool(0, 0.75, -2, 6.7, 4.6)
    for j in range(17):
        rock(
            -8 + j * 1.0, 0.6, -8 + random.uniform(-0.7, 0.7), random.uniform(1.8, 3.4)
        )
    # Crouching carved tiger, raised above the spring lip.
    tiger_start = {key: len(vertices) for key, (vertices, _) in G.items()}
    ellipsoid("stone", (-2, 3.2, -7.8), (2.4, 0.85, 0.85), 20, 12)
    ellipsoid("stoneedge", (0.3, 3.25, -7.3), (0.86, 0.86, 0.82), 18, 12)
    for xx in [-0.1, 0.7]:
        ellipsoid("stone2", (xx, 3.0, -6.7), (0.48, 0.38, 0.43), 12, 8)
    ellipsoid("shadow", (0.3, 3.3, -6.42), (0.22, 0.12, 0.15), 10, 6)
    for xx in [-0.25, 0.82]:
        ellipsoid("stone", (xx, 4, -7.35), (0.27, 0.31, 0.21), 12, 8)
        ellipsoid("shadow", (xx, 3.58, -6.72), (0.08, 0.07, 0.065), 8, 5)
    for zz in [-7.2, -8.4]:
        curved_branch(
            "stone",
            [(-0.5, 3.3, zz), (-0.1, 1.8, zz + 0.4), (1.6, 1.35, zz + 0.7)],
            0.36,
            10,
        )
        ellipsoid("stoneedge", (1.55, 1.36, zz + 0.68), (0.62, 0.20, 0.35))
        curved_branch(
            "stone", [(-3.5, 3, zz), (-4.3, 1.9, zz), (-2.4, 1.35, zz + 0.7)], 0.37, 10
        )
    curved_branch(
        "stone",
        [(-4, 3.2, -8), (-6, 3.1, -8.6), (-6.4, 4.2, -7), (-5.4, 4.5, -6.5)],
        0.18,
        8,
    )
    for j in range(8):
        xx = -3.8 + j * 0.48
        tube(
            "shadow",
            [(xx, 3.55, -7.08), (xx + 0.22, 3.93, -7.65), (xx + 0.25, 3.56, -8.4)],
            0.035,
            4,
        )
    # Keep the sculptural silhouette clear of the rear cliff and foreground pool.
    for key, (vertices, _) in G.items():
        for i in range(tiger_start.get(key, 0), len(vertices)):
            x, negative_z, y = vertices[i]
            vertices[i] = (x * 1.23 - 0.5, negative_z - 2.1, y + 1.4)
    rock(-2.5, 0.8, -5.0, 3.7, True)
    tube("waterfall", [(3, 2.0, -7.1), (3.1, 1.7, -6.4), (3.1, 0.8, -5.7)], 0.15, 8)
    grove(
        [
            (x, 0.5, z)
            for x, z in [
                (-22, 3),
                (19, 4),
                (-20, -16),
                (20, -18),
                (-25, -35),
                (0, -34),
                (24, -35),
            ]
        ],
        13,
    )
    planting_beds(
        [(-18, 12), (19, 16), (-14, 0), (17, -4), (-21, -27), (22, -27)], per_bed=13
    )
    grove([(-30, 0.6, -21), (30, 0.6, -22), (-16, 0.6, -38), (15, 0.6, -37)], 7)
    export("tiger-spring")


def dragon_well():
    def hill(x, z):
        return 0.5 + max(0, -z - 1) * 0.12 + 1.3 * math.sin(x * 0.055) ** 2

    ground(hill)
    # Contour-following terraced tea hedges with scalloped, individually shaped leaves.
    for row in range(13):
        z0 = -5 - row * 3.5
        for side in [-1, 1]:
            vertices = []
            for step in range(101):
                x = side * (5.3 + step * 0.43)
                z = z0 + 1.5 * math.sin(x * 0.075)
                for cross in range(9):
                    angle = cross * math.pi / 8
                    zz = z + math.cos(angle) * 1.17
                    waviness = 0.08 * math.sin(step * 1.2 + cross * 1.7)
                    vertices.append(
                        (
                            x,
                            hill(x, zz) + 0.15 + (1.05 + waviness) * math.sin(angle),
                            zz,
                        )
                    )
            mesh(
                "tea" if row % 3 else "tealight",
                vertices,
                [
                    (
                        step * 9 + k,
                        step * 9 + k + 1,
                        (step + 1) * 9 + k + 1,
                        (step + 1) * 9 + k,
                    )
                    for step in range(100)
                    for k in range(8)
                ],
            )
            for j in range(26):
                x = side * (5.5 + j * 1.65)
                z = z0 + 1.5 * math.sin(x * 0.075)
                y = hill(x, z)
                for k in range(3):
                    a = (j + k) * 2.4
                    px, pz = x + math.cos(a) * 0.6, z + math.sin(a) * 0.55
                    mesh(
                        "leaf3",
                        [
                            (px - 0.22, y + 1.05, pz),
                            (px, y + 1.22, pz + 0.07),
                            (px + 0.22, y + 1.05, pz),
                            (px, y + 1.02, pz - 0.07),
                        ],
                        [(0, 1, 2, 3)],
                    )
    path(
        [(1, 135), (1, 10), (0, 1), (0, -48)],
        3.4,
        lambda i, t: 0.69 if i < 2 else 0.70 + t * 5.8,
    )
    # A round stone-lined well is the foreground landmark.
    well_start = {key: len(vertices) for key, (vertices, _) in G.items()}
    lathe(
        "stoneedge",
        (-7, 0.7, 7),
        [
            (0, 2.2),
            (0.35, 2.2),
            (0.35, 1.9),
            (1.4, 1.9),
            (1.53, 2.1),
            (1.72, 2.1),
            (1.72, 1.40),
            (0.4, 1.4),
        ],
        48,
    )
    lathe("pool", (-7, 1.15, 7), [(0, 0), (0, 1.42)], 48)
    for j in range(16):
        a = j * math.tau / 16
        tube(
            "mortar",
            [
                (-7 + math.cos(a) * 1.91, 1.06, 7 + math.sin(a) * 1.91),
                (-7 + math.cos(a) * 1.91, 2.09, 7 + math.sin(a) * 1.91),
            ],
            0.013,
            4,
        )
    for key, (vertices, _) in G.items():
        for i in range(well_start.get(key, 0), len(vertices)):
            x, negative_z, y = vertices[i]
            vertices[i] = (
                -8 + (x + 7) * 1.5,
                -7 + (negative_z + 7) * 1.5,
                0.7 + (y - 0.7) * 1.4,
            )
    for x, z, width in [(-21, -12, 9), (21, -26, 10), (-26, -35, 8)]:
        temple(x, hill(x, z), z, width, 5, 3)
    tree(14, 0.6, 5, 9)
    for j in range(5):
        rock(-11 - j * 1.3, 0.6, 4 + j * 2, random.uniform(0.6, 1.1), True)
    planting_beds([(-20, 16), (17, 16), (-23, 2), (29, 2)], per_bed=8)
    export("dragon-well")


def wushan_wind():
    def hill(x, z):
        return 0.5 + 8.5 * math.exp(-((x / 31) ** 2 + ((z + 12) / 37) ** 2))

    ground(hill)
    # Chenghuang pavilion: a substantial hilltop pavilion with stacked double eaves.
    base = hill(0, -11)
    box("stone", (0, base + 0.4, -11), (18, 0.8, 17))
    rail(0, base + 0.8, -11, 8.5, 8)
    for level, (width, depth) in enumerate([(17, 14), (14.5, 12), (11.5, 9.5)]):
        yy = base + 0.9 + level * 4.7
        box("stoneedge", (0, yy + 0.12, -11), (width, 0.24, depth))
        box("woodlight", (0, yy + 1.7, -11), (width * 0.78, 3.2, depth * 0.77))
        rail(0, yy + 0.25, -11, width * 0.49, depth * 0.49, "wood")
        for side in [-1, 1]:
            for column in range(7):
                x = -width * 0.42 + column * width * 0.84 / 6
                z = -11 + side * depth * 0.40
                box("wooddark", (x, yy + 1.8, z), (width * 0.085, 2.4, 0.08))
                tube(
                    "wood",
                    [(x, yy + 0.25, z + side * 0.2), (x, yy + 3.4, z + side * 0.2)],
                    0.11,
                    8,
                )
                for bar in range(4):
                    box(
                        "woodlight",
                        (
                            x - width * 0.032 + bar * width * 0.021,
                            yy + 1.9,
                            z + side * 0.08,
                        ),
                        (0.035, 2, 0.05),
                    )
        # Four broad corner eaves establish the square tower plan.
        start = {key: len(vertices) for key, (vertices, _) in G.items()}
        radius = width * 0.82
        roof(0, yy + 3.35, 0, radius, 2.3, 4, 18)
        for key, (vertices, _) in G.items():
            for i in range(start.get(key, 0), len(vertices)):
                x, negative_z, y = vertices[i]
                z = -negative_z
                angle = math.pi / 12
                rx = x * math.cos(angle) - z * math.sin(angle)
                rz = x * math.sin(angle) + z * math.cos(angle)
                vertices[i] = (rx, 11 - rz * depth / width, y)
    pavilion(0, base + 15.0, -11, 4.5, 2.3, 8, enclosed=True)
    # Long stone stair climbs diagonally through the wooded slope.
    for j in range(46):
        t = j / 45
        x, z = 11 - 4 * t, 34 - 32 * t
        y = hill(x, z)
        box("stone", (x, y + 0.15, z), (4.0, 0.28, 0.85))
        for side in [-1, 1]:
            if j % 3 == 0:
                box("stoneedge", (x + side * 2, y + 0.6, z), (0.17, 1.15, 0.17))
    grove(
        [
            (x, hill(x, z), z)
            for x, z in [
                (-19, 2),
                (-25, -13),
                (-20, -30),
                (22, -10),
                (27, 5),
                (20, -35),
                (-31, 15),
                (34, -24),
            ]
        ],
        10,
    )
    for j in range(13):
        x = -28 + j * 4.7
        z = 17 + 4 * math.sin(j)
        rock(x, hill(x, z), z, random.uniform(1.1, 2.6))
    planting_beds([(-16, 16), (24, 20), (-25, -4), (29, -18)], height=hill, per_bed=9)
    export("wushan-wind")


def willow(x, y, z, height=9):
    curved_branch(
        "bark",
        [(x, y, z), (x + 0.5, y + height * 0.6, z), (x + 2.0, y + height, z)],
        0.32,
        8,
    )
    for j in range(13):
        a = j * 2.4
        ex, ez = x + math.cos(a) * height * 0.46, z + math.sin(a) * height * 0.46
        top = y + height * random.uniform(0.65, 1)
        curved_branch(
            "bark",
            [
                (x + 0.3, y + height * 0.45, z),
                (ex * 0.5 + x * 0.5, y + height, ez * 0.5 + z * 0.5),
                (ex, top, ez),
            ],
            0.1,
            6,
        )
        for k in range(3):
            dx, dz = random.uniform(-0.65, 0.65), random.uniform(-0.65, 0.65)
            points = [
                (ex + dx * t, top - height * 0.64 * t, ez + dz * t)
                for t in [i / 12 for i in range(13)]
            ]
            tube("leaf1", points, 0.034, 4)
            for i in range(1, 12):
                px, py, pz = points[i]
                mesh(
                    "leaf2",
                    [
                        (px, py, pz),
                        (px + 0.12, py - 0.23, pz + 0.07),
                        (px + 0.04, py - 0.48, pz),
                    ],
                    [(0, 1, 2)],
                )


def ruan_islet():
    terrain(0, -11, 26, 17, 1.4)
    # Interrupted natural shoreline, reeds and a small landing rather than a disc.
    for j in range(95):
        a = j * math.tau / 95
        x, z = math.cos(a) * (25.4 + 0.9 * math.sin(a * 7)), -11 + math.sin(a) * 16
        rock(x, -0.03, z, random.uniform(0.45, 1.15), True)
        if j % 2 == 0:
            for k in range(8):
                rx, rz = x + random.uniform(-0.6, 0.6), z + random.uniform(-0.6, 0.6)
                tube(
                    "leaf1",
                    [
                        (rx, 0.0, rz),
                        (rx + 0.12, 0.6, rz),
                        (rx + 0.24, random.uniform(1.1, 1.8), rz + 0.13),
                    ],
                    0.018,
                    4,
                )
    for x, z in [(-17, -5), (-8, -20), (9, -17), (17, -6), (3, -2)]:
        willow(x, 1, z, random.uniform(7, 10))
    grove(
        [(x, 1, z) for x, z in [(-15, -16), (0, -20), (15, -17), (-7, -9), (12, -5)]], 8
    )
    pavilion(-4, 1.3, -8, 4.4)
    for j in range(15):
        box("wood", (16, 0.47, 3 + j * 0.42), (3.4, 0.22, 0.38))
    for x in [14.5, 17.5]:
        for z in [4, 7.5]:
            tube("wooddark", [(x, -0.6, z), (x, 1.1, z)], 0.10, 7)
    boat(19, 10)
    export("ruan-islet")


def dragon_head(x, y, z):
    """Golden dragon carving protrudes toward the pool, with horns and whiskers."""
    ellipsoid("gold", (x, y, z), (1.6, 1.15, 0.85), 24, 14)
    ellipsoid("gold", (x, y - 0.3, z + 0.7), (1.05, 0.55, 0.74), 20, 12)
    ellipsoid("shadow", (x, y - 0.53, z + 1.23), (0.72, 0.24, 0.12), 18, 8)
    for side in [-1, 1]:
        ellipsoid(
            "stoneedge",
            (x + side * 0.75, y + 0.37, z + 0.76),
            (0.30, 0.23, 0.19),
            12,
            8,
        )
        ellipsoid(
            "shadow", (x + side * 0.75, y + 0.38, z + 0.92), (0.10, 0.10, 0.035), 10, 6
        )
        curved_branch(
            "gold",
            [
                (x + side * 1.1, y + 0.8, z),
                (x + side * 1.5, y + 2.2, z),
                (x + side * 2, y + 2.35, z - 0.2),
            ],
            0.17,
            8,
        )
        curved_branch(
            "gold",
            [
                (x + side * 0.65, y - 0.2, z + 1.1),
                (x + side * 1.8, y - 0.5, z + 1.3),
                (x + side * 2.1, y + 0.3, z + 0.6),
            ],
            0.055,
            6,
        )
        for j in range(7):
            a = j * 0.4
            curved_branch(
                "gold",
                [
                    (x + side * 1.2, y + 0.6 - j * 0.15, z),
                    (x + side * 2.0, y + 1.0 - j * 0.2, z + 0.1),
                    (x + side * 1.7, y + 0.7 - j * 0.25, z + 0.5),
                ],
                0.07,
                5,
            )


def yellow_dragon():
    ground()
    path([(11, 135), (11, 15), (8, 6), (12, -3), (19, -14)], 3.3)
    pool(-2, 0.74, 1, 8, 5.5)
    # Broad jagged vertical cliff, not a single sphere.
    for row in range(4):
        for j in range(13):
            x = -17 + j * 2.4
            y = 0.5 + row * 2.0
            z = -8 - row * 0.35 + random.uniform(-0.3, 0.3)
            rock(x, y, z, random.uniform(2.2, 3.4))
    dragon_head(-2, 6.4, -5.9)
    tube(
        "waterfall",
        [(-2, 5.87, -4.65), (-2, 5.2, -4.05), (-2, 3.4, -3.45), (-2, 0.8, -2.75)],
        0.19,
        10,
    )
    for i in range(7):
        tube(
            "waterfall",
            [
                (-2 + (i - 3) * 0.07, 5.8, -4.62),
                (-2 + (i - 3) * 0.11, 3.2, -3.4),
                (-2 + (i - 3) * 0.17, 0.81, -2.6),
            ],
            0.028,
            5,
        )
    for side in [-1, 1]:
        for j in range(19):
            bamboo(
                side * (18 + random.random() * 12),
                0.5,
                6 - j * 2.6,
                random.uniform(9, 16),
                random.uniform(-1, 1),
            )
    pavilion(19, 0.6, -13, 4.4)
    planting_beds(
        [(-17, 15), (22, 16), (-17, 1), (25, -4), (-20, -18), (25, -25)], per_bed=13
    )
    grove([(-25, 0.6, -24), (29, 0.6, -32), (0, 0.6, -27)], 7)
    export("yellow-dragon")


def jade_emperor():
    def mountain(x, z):
        return 0.6 + 9.5 * math.exp(-((x / 30) ** 2 + ((z + 12) / 39) ** 2))

    ground(mountain)
    # Fuxing temple courtyard sits on the summit, approached by a tall stair.
    level = mountain(0, -11)
    box("stone", (0, level, -11), (24, 1, 22))
    rail(0, level + 0.5, -11, 11.6, 10.6)
    temple(0, level + 0.5, -17, 15, 6, 4.7)
    temple(-9, level + 0.5, -7, 5, 8, 3.1)
    temple(9, level + 0.5, -7, 5, 8, 3.1)
    # Ceremonial bronze incense burner and its raised canopy.
    lathe(
        "gold",
        (0, level + 0.5, -6),
        [(0, 0.85), (0.4, 0.70), (0.7, 1.0), (1.5, 1.15), (1.7, 0.85)],
        20,
    )
    for side in [-1, 1]:
        tube(
            "gold",
            [
                (side * 0.8, level + 1.2, -6),
                (side * 1.5, level + 2.0, -6),
                (side * 1, level + 2.3, -6),
            ],
            0.11,
            8,
        )
    roof(0, level + 2.9, -6, 1.45, 0.85, 4, 6)
    for j in range(40):
        t = j / 39
        z = 32 - t * 32
        y = mountain(0, z)
        box("stoneedge", (0, y + 0.14, z), (4.5, 0.28, 0.91))
    for j in range(12):
        x = -29 + j * 5.5
        z = 3 + 5 * math.sin(j * 1.3)
        rock(x, mountain(x, z), z, random.uniform(1.7, 3))
    grove(
        [
            (x, mountain(x, z), z)
            for x, z in [
                (-21, -3),
                (-25, -18),
                (-18, -31),
                (23, -5),
                (27, -22),
                (20, -35),
                (-34, 19),
                (31, 17),
            ]
        ],
        9,
    )
    planting_beds(
        [(-13, 18), (13, 21), (-24, 4), (26, 1), (-29, -22), (29, -25)],
        height=mountain,
        per_bed=11,
    )
    grove([(-32, mountain(-32, -32), -32), (31, mountain(31, -34), -34)], 7)
    export("jade-emperor")


def precious_stone():
    def hill(x, z):
        return 0.7 + 5.5 * math.exp(-((x / 30) ** 2 + ((z + 10) / 34) ** 2))

    ground(hill)
    # Exposed ochre-red rhyolite slabs, split by steep, angular fractures.
    for row in range(3):
        for j in range(10):
            x = -25 + j * 5.2
            z = 8 - row * 6.5
            y = hill(x, z)
            before = {key: (len(v), len(f)) for key, (v, f) in G.items()}
            rock(x, y, z, random.uniform(2.8, 5.0))
            # Move the new rock vertices/faces into the red rock material batch.
            for source, target in [("stone", "redstone"), ("stone2", "redstoneedge")]:
                start_v, start_f = before.get(source, (0, 0))
                vertices, faces = G[source]
                if len(vertices) == start_v:
                    continue
                dest_v, dest_f = G[target]
                offset = len(dest_v) - start_v
                dest_v.extend(vertices[start_v:])
                dest_f.extend(tuple(i + offset for i in f) for f in faces[start_f:])
                del vertices[start_v:]
                del faces[start_f:]
    # Baochu is slender: seven small stacked roofs over an octagonal stone shaft.
    x, z = 6, -12
    base = hill(x, z)
    lathe("stone", (x, base, z), [(0, 2.1), (0.7, 2.1), (0.7, 1.60)], 8)
    for level in range(7):
        y = base + 0.7 + level * 2.8
        radius = 1.58 - level * 0.11
        lathe("stoneedge", (x, y, z), [(0, radius), (2.35, radius * 0.93)], 8)
        for side in range(8):
            a = side * math.tau / 8 + math.pi / 8
            px, pz = x + math.cos(a) * radius, z + math.sin(a) * radius
            # Dark narrow openings read distinctly on the pale tower.
            tube("shadow", [(px, y + 0.72, pz), (px, y + 1.58, pz)], 0.14, 5)
        roof(x, y + 2.28, z, radius * 1.33, 0.7, 8, 6)
    lathe(
        "gold",
        (x, base + 21.4, z),
        [(0, 0.43), (0.35, 0.20), (0.6, 0.31), (0.9, 0.17), (1.5, 0.06)],
        16,
    )
    trail = [(-15, 135), (-15, 27), (-12, 13), (-7, -2), (0, -14)]
    path(
        trail,
        2.6,
        lambda i, t: (
            hill(
                trail[i][0] * (1 - t) + trail[i + 1][0] * t,
                trail[i][1] * (1 - t) + trail[i + 1][1] * t,
            )
            + 0.2
        ),
    )
    grove(
        [
            (xx, hill(xx, zz), zz)
            for xx, zz in [
                (-20, -14),
                (-12, -26),
                (20, -16),
                (27, -29),
                (-30, -27),
                (0, -35),
            ]
        ],
        8,
    )
    export("precious-stone")


BUILDERS = [
    bamboo_path,
    osmanthus_rain,
    tiger_spring,
    dragon_well,
    wushan_wind,
    ruan_islet,
    yellow_dragon,
    jade_emperor,
    precious_stone,
]

if __name__ == "__main__":
    # An optional scene slug after -- lets artists rebuild one scene quickly.
    requested = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    for build in BUILDERS:
        if not requested or build.__name__.replace("_", "-") in requested:
            random.seed(1985 + BUILDERS.index(build))
            build()
