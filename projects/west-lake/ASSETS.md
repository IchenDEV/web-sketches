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


## 杭州景点扩展

`leifeng.glb`、`broken-bridge.glb`、`nine-creeks.glb` 为 Blender 创建的独立地形、建筑、树木和岸石模型。雷峰塔采用五层八角楼阁轮廓，断桥采用单孔低拱与白堤构图，九溪采用曲折溪谷与汀步构图。参考资料：[杭州文保平台雷峰塔遗址](https://wbdl.hzwbzx.cn/house?id=85)、[杭州市档案馆“建筑”](https://www.hzarchives.org.cn/info/6791)。

模型使用 Draco 压缩；`draco/` 中的本地解码器来自 Three.js 0.180.0 随附的 Google Draco，许可证见 `draco/LICENSE.txt`。运行时不依赖外部 CDN。

新增贴图使用内置 ImageGen 生成：

- **jiuxi-backdrop.png**：3:1 panoramic Chinese ink and transparent watercolor forest-valley backdrop for Jiuxi, layered moss-green and blue-green wooded slopes framing a central opening, ivory haze, distant trees dissolving into mist, hints of a narrow stream. No foreground landmarks, buildings or text.
- **woodland-canopy.png**：Isolated broadleaf canopy cluster on neutral white, rounded irregular overlapping sage-green wash masses, fine charcoal-green twig and leaf-edge marks, restrained ochre leaves, organic lobes and gaps. No trunk, ground, checkerboard or text. Color-keyed by the foliage shader.

## 西湖三十景

三代名单采用南宋旧十景、1985 新十景与 2007 三评西湖十景（新新十景），共 30 景。[新华社 2007-10-28 名单报道](https://news.cctv.com/china/20071028/100288.shtml)；[新十景名单与图示：杭州网／西湖景区管委会](https://ywhz.hangzhou.com.cn/hssj/content/content_6219183.htm)。

新增 26 个独立 GLB 均为本项目在 Blender 中建模，未下载第三方模型。可重建脚本在 `scripts/models/`：`common.py` 为曲面瓦顶、曲枝、石岸等共享几何，`classic.py` 补齐 7 个旧十景，`new.py` 补齐 9 个新十景，`third.py` 完成 10 个三评十景。按材质合并网格、使用本地 Draco 压缩与解码。亭廊屋面、石桥、茶垄、竹节、红鱼、石虎、龙首、碑坊与街屋均为三维几何；树冠与远山延续原有手绘贴图。

建筑特征参考：[灵隐与飞来峰](https://wgly.hangzhou.gov.cn/art/2023/12/1/art_1229734028_58951314.html)、[六和塔](https://wgly.hangzhou.gov.cn/art/2013/7/7/art_1229495371_58931730.html)、[钱祠表忠](https://westlake.hangzhou.gov.cn/art/2024/4/30/art_1643937_59046981.html)。场景是水墨意象复刻，地形、间距与建筑比例为画面适度调整。

`hillside-ink.png` 由内置 ImageGen 为本项目生成：灰绿苔石与密林小笔触的可重复水墨纹理，用于山坡表面，保留几何山脊与真实受光。无第三方照片或模型。提示要点：平面材质、无地平线、细小林冠与苔石、灰绿矿物色、无白纸空洞、低方向性光照。

首景的 `architecture.glb` 已用 glTF Transform 4.5 的 Draco 编码压缩（位置16位、法线12位、UV14位），从9.95MB降至1.16MB。保留材质名称和网格结构；同相机静止截图对比确认外观保持。
