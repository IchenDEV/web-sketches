# 小景 · Web Sketches

小场景、小页面与交互实验合集。每个作品独立保存源码，由一个 GitHub Actions 工作流构建并发布到 GitHub Pages。

[打开合集](https://blogs.idevlab.dev/web-sketches/) · [进入湖山入画](https://blogs.idevlab.dev/web-sketches/projects/west-lake/)

| 作品 | 说明 | 源码 |
| --- | --- | --- |
| 杭州小景 | 旧十景、新十景与新新十景，共三十处交互水墨画境，可逐景游览与分享 | [projects/west-lake](projects/west-lake) |

## 本地开发

Node.js 24+：

```sh
npm ci
npm run dev:west-lake
```

构建和检查完整站点：

```sh
npm run build
npm test
python3 -m http.server 8080 --directory _site
```

`_site/` 是唯一发布目录。入口页位于根路径，各作品位于 `projects/<slug>/`，所有站内链接和资源路径兼容 GitHub Pages 项目子路径。

## 添加新作品

1. 放到 `projects/<slug>/`，目录名使用小写字母、数字和连字符。
2. 有构建工具的作品提供 `package.json` 与 `build` 脚本，将完整静态产物输出到自己的 `dist/`，并使用相对资源路径。运行根目录 `npm install` 更新统一锁文件。纯 HTML 作品直接提供 `index.html` 和所需资源即可。
3. 在根目录 `index.html` 添加入口，预览图放到 `previews/`。
4. 运行 `npm run build && npm test`，推送到 `main` 后自动部署。

每个作品的素材来源、操作说明和专项测试保留在其目录中。勿将密钥、环境文件或本地调试记录放入作品目录。

## 部署

使用 GitHub Pages 的 GitHub Actions 发布方式。工作流构建所有作品、检查入口和资源，再发布 `_site/`。线上地址以仓库 Pages 设置及 Actions 的部署输出为准。
