import bpy, math, random, os
from mathutils import Vector
from collections import defaultdict

random.seed(73)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
G = defaultdict(lambda: [[], []])
COLORS = {
    "roof": (0.20, 0.235, 0.22),
    "ridge": (0.29, 0.32, 0.28),
    "wood": (0.30, 0.24, 0.16),
    "woodlight": (0.43, 0.35, 0.23),
    "wooddark": (0.19, 0.18, 0.14),
    "stone": (0.63, 0.60, 0.48),
    "stoneedge": (0.72, 0.68, 0.55),
    "stone2": (0.55, 0.55, 0.45),
    "shadow": (0.22, 0.27, 0.23),
    "plaster": (0.83, 0.82, 0.72),
    "boat": (0.30, 0.24, 0.15),
    "cloth": (0.49, 0.45, 0.32),
    "gold": (0.55, 0.43, 0.24),
    "mortar": (0.35, 0.36, 0.30),
}


def mesh(mat, verts, faces):
    v, f = G[mat]
    n = len(v)
    v.extend([(x, -z, y) for x, y, z in verts])
    f.extend([tuple(i + n for i in ff) for ff in faces])


def box(mat, c, s):
    x, y, z = c
    a, b, d = [q / 2 for q in s]
    mesh(
        mat,
        [
            (x + i * a, y + j * b, z + k * d)
            for i, j, k in [
                (-1, -1, -1),
                (-1, -1, 1),
                (-1, 1, -1),
                (-1, 1, 1),
                (1, -1, -1),
                (1, -1, 1),
                (1, 1, -1),
                (1, 1, 1),
            ]
        ],
        [
            (0, 4, 6, 2),
            (5, 1, 3, 7),
            (1, 0, 2, 3),
            (4, 5, 7, 6),
            (2, 6, 7, 3),
            (1, 5, 4, 0),
        ],
    )


def tube(mat, pts, r=0.05, n=6):
    vs = []
    for i, p in enumerate(pts):
        tangent = Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])
        if tangent.length < 1e-6:
            tangent = Vector((0, 1, 0))
        tangent.normalize()
        ref = Vector((0, 1, 0)) if abs(tangent.y) < 0.95 else Vector((1, 0, 0))
        u = tangent.cross(ref).normalized()
        w = tangent.cross(u).normalized()
        for j in range(n):
            vs.append(
                tuple(
                    Vector(p)
                    + r
                    * (u * math.cos(j * math.tau / n) + w * math.sin(j * math.tau / n))
                )
            )
    fs = []
    for i in range(len(pts) - 1):
        for j in range(n):
            fs.append(
                (
                    i * n + j,
                    i * n + (j + 1) % n,
                    (i + 1) * n + (j + 1) % n,
                    (i + 1) * n + j,
                )
            )
    fs.extend(
        [tuple(range(n - 1, -1, -1)), tuple((len(pts) - 1) * n + j for j in range(n))]
    )
    mesh(mat, vs, fs)


def lathe(mat, c, profile, n=24):
    x, y, z = c
    vs = [
        (x + r * math.cos(a * math.tau / n), y + h, z + r * math.sin(a * math.tau / n))
        for h, r in profile
        for a in range(n)
    ]
    fs = []
    for j in range(len(profile) - 1):
        for a in range(n):
            fs.append(
                (
                    j * n + a,
                    (j + 1) * n + a,
                    (j + 1) * n + (a + 1) % n,
                    j * n + (a + 1) % n,
                )
            )
    mesh(mat, vs, fs)


def roof(cx, cy, cz, r, h, sides=6, tiles=14):
    # Each roof face is a bowed ruled surface; corner hips lift at the eaves.
    def point(face, t, v):
        a = face * math.tau / sides + math.pi / 6
        b = (face + 1) * math.tau / sides + math.pi / 6
        ex = ((1 - t) * math.cos(a) + t * math.cos(b)) * r
        ez = ((1 - t) * math.sin(a) + t * math.sin(b)) * r
        lift = 0.34 + (0.43 * abs(2 * t - 1) ** 3)
        return (cx + ex * v, cy + h * (1 - v) ** 1.65 + lift * v**9, cz + ez * v)

    for face in range(sides):
        seg = tiles
        rows = 16
        vs = [
            point(face, i / seg, j / rows)
            for j in range(rows + 1)
            for i in range(seg + 1)
        ]
        fs = [
            (
                j * (seg + 1) + i,
                j * (seg + 1) + i + 1,
                (j + 1) * (seg + 1) + i + 1,
                (j + 1) * (seg + 1) + i,
            )
            for j in range(rows)
            for i in range(seg)
        ]
        mesh("roof", vs, fs)
        for i in range(seg + 1):
            tube(
                "ridge",
                [
                    tuple(
                        q + (0.025 if d == 1 else 0)
                        for d, q in enumerate(
                            point(face, i / seg, 0.10 + 0.90 * j / 24)
                        )
                    )
                    for j in range(25)
                ],
                0.040 if r > 3 else 0.024,
                5,
            )
        for v in [0.25, 0.40, 0.55, 0.70, 0.83, 0.94, 1.0]:
            tube("ridge", [point(face, i / 32, v) for i in range(33)], 0.018, 4)
        edge = [point(face, i / 32, 1) for i in range(33)]
        tube(
            "wooddark",
            [(x, y - 0.1, z) for x, y, z in edge],
            0.095 if r > 3 else 0.055,
            6,
        )
        tube(
            "ridge",
            [point(face, 0, v / 30) for v in range(31)],
            0.08 if r > 3 else 0.045,
            7,
        )
    lathe(
        "ridge",
        (cx, cy + h, cz),
        [
            (0, 0.16),
            (0.15, 0.14),
            (0.28, 0.20),
            (0.42, 0.13),
            (0.57, 0.11),
            (0.70, 0.02),
        ],
        16,
    )


COLORS.update(
    {
        "earth": (0.24, 0.30, 0.20),
        "bark": (0.16, 0.19, 0.15),
        "leaf0": (0.23, 0.32, 0.19),
        "leaf1": (0.34, 0.40, 0.25),
        "leaf2": (0.42, 0.43, 0.28),
        "snow": (0.88, 0.91, 0.88),
        "crown0": (0.3, 0.4, 0.25),
        "crown1": (0.35, 0.43, 0.28),
        "crown2": (0.43, 0.41, 0.23),
        "snowshade": (0.67, 0.74, 0.74),
        "waterfall": (0.52, 0.72, 0.68),
        "ember": (0.36, 0.13, 0.09),
    }
)
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/assets"))


def rock(x, y, z, s=1, flat=False):
    rings = []
    n = 9
    for level, rr in [(0, 0.72), (0.2, 1), (0.73, 0.86), (1, 0.37)]:
        ring = []
        for j in range(n):
            a = math.tau * j / n
            r = rr * (1 + 0.15 * math.sin(j * 5.1 + x) + 0.1 * math.sin(j * 2.2 + z))
            ring.append(
                (
                    x + math.cos(a) * r * s,
                    y
                    + level * s * (0.52 if flat else 0.78)
                    + 0.07 * s * math.sin(j * 2.7),
                    z + math.sin(a) * r * s * 0.8,
                )
            )
        rings.extend(ring)
    fs = [tuple(range(n - 1, -1, -1)), tuple(3 * n + j for j in range(n))]
    fs += [
        (k * n + j, k * n + (j + 1) % n, (k + 1) * n + (j + 1) % n, (k + 1) * n + j)
        for k in range(3)
        for j in range(n)
    ]
    mesh("stone" if random.random() < 0.6 else "stone2", rings, fs)
    for j in [2, 6]:
        p = rings[n + j]
        q = rings[2 * n + j]
        tube(
            "shadow",
            [p, ((p[0] + q[0]) * 0.5 + 0.06 * s, (p[1] + q[1]) * 0.5, p[2] + 0.03), q],
            0.013 * s,
            4,
        )


def terrain(cx, cz, rx, rz, h, mat="earth"):
    vs = []
    fs = []
    rings = 18
    around = 70
    for i in range(rings + 1):
        r = i / rings
        for j in range(around):
            a = j * math.tau / around
            f = 1 + 0.035 * math.sin(a * 13) + 0.025 * math.cos(a * 21)
            x = cx + math.cos(a) * rx * r * f
            z = cz + math.sin(a) * rz * r * f
            y = (
                -0.15
                + h * (max(0, 1 - r * r) ** 0.7)
                + 0.09 * math.sin(x * 1.3 + z * 1.6) * (1 - r)
            )
            vs.append((x, y, z))
    for i in range(rings):
        for j in range(around):
            fs.append(
                (
                    i * around + j,
                    i * around + (j + 1) % around,
                    (i + 1) * around + (j + 1) % around,
                    (i + 1) * around + j,
                )
            )
    mesh(mat, vs, fs)


def foliage(cx, cy, cz, r, mat):
    for i in range(3):
        a = i * math.pi / 3 + random.uniform(-0.2, 0.2)
        dx = math.cos(a) * r * 1.15
        dz = math.sin(a) * r * 1.15
        x = cx + random.uniform(-0.2, 0.2) * r
        y = cy + random.uniform(-0.1, 0.1) * r
        z = cz + random.uniform(-0.2, 0.2) * r
        mesh(
            "crown" + mat[-1],
            [
                (x - dx, y - r * 0.8, z - dz),
                (x + dx, y - r * 0.8, z + dz),
                (x + dx, y + r * 0.8, z + dz),
                (x - dx, y + r * 0.8, z - dz),
            ],
            [(0, 1, 2, 3)],
        )


def curved_branch(mat, anchors, r, n=7):
    pts = []
    for j in range(25):
        t = j / 24
        if len(anchors) == 3:
            weights = [(1 - t) ** 2, 2 * t * (1 - t), t * t]
        else:
            weights = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t**3]
        pts.append(
            tuple(sum(p[k] * w for p, w in zip(anchors, weights)) for k in range(3))
        )
    vs = []
    for i, p in enumerate(pts):
        tangent = (
            Vector(pts[min(i + 1, 24)]) - Vector(pts[max(i - 1, 0)])
        ).normalized()
        ref = Vector((0, 1, 0)) if abs(tangent.y) < 0.95 else Vector((1, 0, 0))
        u = tangent.cross(ref).normalized()
        v = tangent.cross(u).normalized()
        radius = r * (1 - 0.89 * (i / 24) ** 0.8)
        for j in range(n):
            vs.append(
                tuple(
                    Vector(p)
                    + radius
                    * (u * math.cos(j * math.tau / n) + v * math.sin(j * math.tau / n))
                )
            )
    fs = [
        (i * n + j, i * n + (j + 1) % n, (i + 1) * n + (j + 1) % n, (i + 1) * n + j)
        for i in range(24)
        for j in range(n)
    ]
    mesh(mat, vs, fs)


def tree(x, y, z, h=6, winter=False):
    lean = random.uniform(-1, 1) * h * 0.12
    trunk = [
        (x, y, z),
        (x + lean * 0.25, y + h * 0.28, z + 0.1),
        (x + lean * 0.7, y + h * 0.54, z),
        (x + lean, y + h * 0.78, z - 0.1),
    ]
    curved_branch("bark", trunk, h * 0.035, 8)
    for j in range(9):
        a = j * 2.4 + random.random()
        r = h * random.uniform(0.22, 0.47)
        yy = y + h * random.uniform(0.5, 0.91)
        ex = x + lean + math.cos(a) * r
        ez = z + math.sin(a) * r
        pts = [
            (x + lean * 0.4, y + h * (0.3 + j * 0.033), z),
            (x + math.cos(a) * r * 0.4, y + h * 0.64, z + math.sin(a) * r * 0.4),
            (ex, yy, ez),
        ]
        curved_branch("bark", pts, h * 0.016, 6)
        for k in range(3):
            dx = random.uniform(-0.8, 0.8) * h * 0.2
            dz = random.uniform(-0.8, 0.8) * h * 0.2
            end = (ex + dx, yy + h * 0.12, ez + dz)
            curved_branch("bark", [pts[1], (ex, yy, ez), end], h * 0.006, 5)
            if winter:
                if k == 0:
                    curved_branch(
                        "snow",
                        [(p[0], p[1] + h * 0.012, p[2]) for p in pts],
                        h * 0.009,
                        5,
                    )
                for twig in range(3):
                    t = 0.4 + twig * 0.2
                    px = ex * (1 - t) + end[0] * t
                    py = yy * (1 - t) + end[1] * t
                    pz = ez * (1 - t) + end[2] * t
                    curved_branch(
                        "bark",
                        [
                            (px, py, pz),
                            (px + dx * 0.15, py + h * 0.04, pz + dz * 0.15),
                            (
                                px + random.uniform(-0.11, 0.11) * h,
                                py + h * 0.11,
                                pz + random.uniform(-0.1, 0.1) * h,
                            ),
                        ],
                        h * 0.0025,
                        4,
                    )
            else:
                foliage(end[0], end[1], end[2], h * 0.19, "leaf" + str((j + k) % 3))


# Retain the authored boat topology, translated for the evening scene.
def boat(x, z):
    sections = [
        (-2.9, 0.04, 0.66),
        (-2.5, 0.48, 0.28),
        (-1.8, 0.77, 0.1),
        (0, 0.89, 0.05),
        (1.8, 0.75, 0.10),
        (2.5, 0.40, 0.33),
        (2.85, 0.02, 0.79),
    ]
    vs = []
    for xx, w, yy in sections:
        vs.extend(
            [
                (x + xx, yy, z - w),
                (x + xx, 0.10, z - w * 0.4),
                (x + xx, 0.10, z + w * 0.4),
                (x + xx, yy, z + w),
                (x + xx, yy + 0.28, z + w),
                (x + xx, yy + 0.28, z - w),
            ]
        )
    mesh(
        "boat",
        vs,
        [
            (i * 6 + j, i * 6 + (j + 1) % 6, (i + 1) * 6 + (j + 1) % 6, (i + 1) * 6 + j)
            for i in range(6)
            for j in range(6)
        ],
    )
    for side in [-1, 1]:
        for h in [0.1, 0.22, 0.3]:
            tube(
                "woodlight",
                [(x + xx, yy + h, z + side * w) for xx, w, yy in sections],
                0.025,
                5,
            )
    for xx in [-1.3, -0.4, 0.5, 1.3]:
        tube(
            "wood",
            [
                (x + xx, 0.5, z - 0.64),
                (x + xx, 1.5, z - 0.64),
                (x + xx, 1.8, z),
                (x + xx, 1.5, z + 0.64),
                (x + xx, 0.5, z + 0.64),
            ],
            0.05,
            6,
        )
    vs = [
        (
            x + xx,
            1.5 + 0.3 * math.sin(j * math.pi / 16),
            z + 0.74 * math.cos(j * math.pi / 16),
        )
        for xx in [-1.6, 1.6]
        for j in range(17)
    ]
    mesh("cloth", vs, [(j, j + 1, j + 18, j + 17) for j in range(16)])


def export(name):
    for key, (verts, faces) in G.items():
        if not faces:
            continue
        data = bpy.data.meshes.new(key)
        data.from_pydata(verts, [], faces)
        data.update()
        obj = bpy.data.objects.new(key, data)
        bpy.context.collection.objects.link(obj)
        uv = data.uv_layers.new(name="UVMap")
        for face in data.polygons:
            axis = max(range(3), key=lambda i: abs(face.normal[i]))
            axes = [i for i in range(3) if i != axis]
            for loop in face.loop_indices:
                co = data.vertices[data.loops[loop].vertex_index].co
                uv.data[loop].uv = (co[axes[0]] * 0.2, co[axes[1]] * 0.2)
            if key.startswith("crown"):
                for loop, uvco in zip(
                    face.loop_indices, [(0, 0), (1, 0), (1, 1), (0, 1)]
                ):
                    uv.data[loop].uv = uvco
            face.use_smooth = key not in [
                "stone",
                "stone2",
                "stoneedge",
                "plaster",
                "snow",
            ]
        mat = bpy.data.materials.new(key)
        mat.use_nodes = True
        mat.diffuse_color = (*COLORS[key], 1)
        bs = mat.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value = (*COLORS[key], 1)
        bs.inputs["Roughness"].default_value = 1
        obj.data.materials.append(mat)
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    print(
        "LANDMARK",
        name,
        len(G),
        "materials",
        sum(len(v) for v, f in G.values()),
        "vertices",
        os.path.getsize(path),
        "bytes",
    )
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    G.clear()
