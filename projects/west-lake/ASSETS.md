# 素材

所有素材均保存在项目内，运行时无需访问外部图片或模型服务。三维资产用 Blender 建模；贴图使用内置 ImageGen 生成，未使用 CLI 或外部素材库。

| 文件 | 用途 |
| --- | --- |
| `architecture.glb` | 曲翘檐亭、石拱桥、石塔、宝塔、乌篷船、民居 |
| `willow-trunks.glb` | 弯曲柳树主干、分叉、树皮沟纹 |
| `shore-rocks.glb` | 断层岸石、跨面裂缝及顶点色 |
| `limestone.png` | 自然灰岩及树皮表面变化 |
| `ink-stone.png` | 水墨石材洗染及裂纹 |
| `mountains-v2.png` | 远山、薄雾与林岸背景 |
| `willow-foliage.png` | 水墨柳冠；材质着色器按色度去除中性背景 |

## 图像生成提示词

**limestone.png** — Create a seamless square albedo texture for limestone rocks in a quiet Chinese West Lake garden. Orthographic flat material scan, matte warm grey limestone with subtle pale olive lichen, hairline natural fractures, delicate weathering. Restrained low contrast watercolor-like natural mineral variations matching an elegant pale ink landscape. Entire frame stone surface, no objects, no borders, no text, no lighting gradients, no baked directional shadows. Fine readable mineral texture without noise or dramatic black cracks.

**ink-stone.png** — A square seamless game albedo texture: traditional Chinese ink and watercolor painted weathered pale gray limestone surface. Broad unequal soft gray sage wash patches cover 35% of ivory-gray base. Sparse dark charcoal branching fissures cross the surface with broken variable-width brush lines. Five large unequal wash regions, plenty of light blank areas. No orange/brown, grid, tiny noise, perspective, boulder silhouettes, shadows, text or border.

**mountains-v2.png** — Panoramic Chinese West Lake environment backdrop, delicate traditional watercolor and fine ink wash on warm ivory paper. Recompose only the highest far background mountain: apex around 43% horizontal and 23% vertical. Keep the near wooded hill crest at 52% horizontal and 45% vertical; right peak at 72% horizontal. Layered white mist, soft ink style, desaturated ivory sky, shore and lake. No buildings or towers. Natural slopes, no smeared or warped texture. Panorama 3:1.

**willow-foliage.png** — One rounded weeping willow canopy cluster, isolated foliage texture. Traditional Chinese ink and watercolor botanical painting: arching fine dark gray-green twigs trail down as graceful fronds; pale sage wash masses build airy overlapping volume with selective sparse leaf strokes. Irregular silhouette and gaps, no trunk, ground, sky, text, border or cast shadow. Light desaturated gray-green, dark lines only 10% of coverage, vertical 3:4. Intended transparent background; the runtime material removes the generated neutral background by chroma.
