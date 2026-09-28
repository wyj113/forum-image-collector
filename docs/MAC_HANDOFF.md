# Mac 接续入口

项目：**Forum Image Collector 3.0.0**。这是源码、开发文档和扩展安装包的接续归档，不包含浏览器会话、Cookie、下载照片或开发依赖。

## 只使用扩展

解压 `install/forum-image-collector-v3.0.0.zip`，打开 Chrome 的 `chrome://extensions`，开启开发者模式，加载其中的 `extension/` 文件夹。也可直接加载源码目录下的 `extension/`。使用扩展不需要 Node.js 或 Python。

正常登录需要的网站，打开已加载的 HTTPS 论坛帖子后点击扩展。先收集、筛选，再下载；按需要申请对应站点权限。关闭面板后选择和扫描进度清除。

## 继续开发

在开发工具中打开 `forum-image-collector` 文件夹。安装 Node.js 22+、npm、Python 3.11+ 后，在项目根目录运行：

```sh
bash tools/mac-check.sh
```

若默认 Python 版本不足，可指定已有的解释器：

```sh
PYTHON_BIN=python3.12 bash tools/mac-check.sh
```

脚本恢复锁定的开发依赖，运行 JavaScript 测试、公开源码检查、Python 打包测试并生成 ZIP；不会安装系统工具、改变 Chrome 设置或上传文件。首次恢复依赖需要网络。

## 当前状态

3.0.0 将支持范围收窄为论坛正文中直接链接的图片，移除了相册与“解析原图”步骤。保留中英文界面、预览关键词／状态筛选、可见图片范围内的选择和下载、失败下载专用重试，以及英文说明、故障排查、浏览器检查清单和手动 Release 草稿工作流。

项目自动检查与仍未验证的范围见项目内的 `docs/VALIDATION.md`。文档中的工作流配置不代表 GitHub Actions 已在线运行，合成界面截图不代表真实网站权限和登录已经验证。

## 文件导航

- 使用与安装：`README.md` / `README.en.md`
- 行为约束：`AGENTS.md`
- 页面支持和扩展适配：`docs/ADAPTERS.md`
- 人工浏览器检查：`docs/SMOKE_TEST.md`
- 发布流程：`docs/PUBLISHING.md`
- 界面、筛选与批任务：`extension/panel.js`
- 正文与原图提取：`extension/core.js`
- 临时标签、整帖与权限：`extension/workflow.js`、`thread.js`、`permissions.js`
- 打包：`tools/package.py`

源码包未配置 GitHub 账号或远程地址。MIT 许可证沿用原项目；首次公开前可按维护者选择调整。源码内的测试、示例与截图保持合成和中性，不应加入私人页面或登录凭证。
