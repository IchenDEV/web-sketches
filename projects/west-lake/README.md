# 杭州小景 · 湖山入画

以西湖水墨画为参考的交互式三维湖景。亭桥、柳树主干、岸石、石塔与乌篷船使用三维模型；远山使用绘制背景，柳冠采用绘制贴图，湖岸植被使用三维叶片。水波和柳枝缓慢运动。

## 景点

从底部“游杭州”菜单切换，链接中的片段可直接打开对应景点：

| 景点 | 画境 | 分享链接 |
| --- | --- | --- |
| 三潭印月 | 柳岸亭桥与湖中石塔 | [进入](https://blogs.idevlab.dev/web-sketches/projects/west-lake/#three-pools) |
| 雷峰夕照 | 五层八角塔、夕阳、湖湾与归舟 | [进入](https://blogs.idevlab.dev/web-sketches/projects/west-lake/#leifeng) |
| 断桥残雪 | 覆雪石桥、白堤、冬树与飘雪 | [进入](https://blogs.idevlab.dev/web-sketches/projects/west-lake/#broken-bridge) |
| 九溪烟树 | 林间曲溪、汀步与小瀑布 | [进入](https://blogs.idevlab.dev/web-sketches/projects/west-lake/#nine-creeks) |

新景点按需载入，返回已经看过的景点会复用模型。暂停同时控制水波、树叶、飘雪与溪流。场景为景点意象的艺术化演绎。

## 运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
```

打开终端显示的本地地址。`npm run build` 生成 `dist/`，可用 `npm run preview` 预览。

## 操作

- 拖动：在限定范围内环顾。
- 滚轮／双指缩放：调整远近。
- 暂停光阴：暂停或恢复水波和柳枝。
- 归于画境：恢复初始构图。
- 留一帧：保存不含按钮的 PNG 画面。
- 全屏：切换全屏欣赏。
- H：隐藏或显示界面。

场景尊重系统的减少动态效果设置。宽屏更适合欣赏完整构图。

## 文件

`main.js` 为场景与交互，`style.css` 为界面样式，`public/assets/` 包含本地模型及贴图。素材制作信息见 `ASSETS.md`。

运行中的本地服务可用 `npm test` 检查；该命令需要已安装的 `agent-browser`，可通过 `SCENE_URL` 指定其他地址。
