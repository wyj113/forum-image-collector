# Forum Image Collector 3.0.0

论坛帖子图片收集扩展：先预览筛选，再下载。

## 本次更新

- 支持范围收窄为**论坛正文中直接链接的图片**。移除了图片查看页、相册与文件页模板、相册展开，以及单独的“解析原图”步骤；这类链接现在标为“暂不支持”。
- 流程更简单：收集 → 可选去重 → 筛选勾选 → 下载。
- 保留中英文界面、整帖扫描、关键词／状态筛选、文件去重和失败下载重试；不增加扩展权限。

## 安装

下载 `forum-image-collector-v3.0.0.zip`，解压，在 Chrome 扩展管理页开启开发者模式，选择“加载已解压的扩展程序”，加载其中的 `extension/`。

开发者可使用 `forum-image-collector-source-v3.0.0.zip`；Mac 接续包额外附带安装 ZIP。`SHA256SUMS.txt` 提供下载校验值。

## 验证与限制

验证范围见仓库的 `docs/VALIDATION.md`。合成测试和界面截图不代表真实论坛的登录、权限弹窗或整帖下载已验证。只支持已列出的论坛结构；面板关闭后不保留进度；去重比较文件字节。此包不是 Chrome Web Store 上架版本。

## English

Narrows the scope to images linked directly in forum posts. Image-viewer, gallery and file-page templates, gallery expansion and the separate "resolve originals" step were removed; such links are now listed as unsupported. The bilingual interface, whole-thread scanning, filters, exact-file deduplication and download retry are unchanged, and no permissions were added. See `docs/VALIDATION.md` for the verification scope.
