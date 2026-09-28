# 常见问题 / Troubleshooting

## 切换界面语言 / Change language

在右上角“界面语言 / Language”选择简体中文或 English。首次显示语言跟随浏览器（中文浏览器显示中文，其余显示英文），手动选择会在本机记住。如果浏览器禁止本地存储，当前面板仍可切换，但下次打开会重新跟随浏览器。网站标题、原文件名和保存路径不会被翻译；不认识的浏览器／服务器错误保留原文。

Choose English or 简体中文 from **Language** at the top right. Your explicit preference is saved locally when storage is available. Changing language does not restart work or alter source titles, filenames or save paths.

## 没有找到图片

确认在 HTTPS 论坛帖子页面点击扩展，并正常登录、等待正文加载。当前支持依赖页面结构；Discourse 虚拟列表只读取已加载的帖子。先查看 [适配范围](ADAPTERS.md)。如果布局不支持，请提供小型合成 HTML 示例用于添加适配，不要提交私人页面、Cookie 或原始截图。

## 图片标为“暂不支持”

只收集正文中直接链接的图片文件或论坛附件。指向图片查看页、相册或其他图床的链接会标为暂不支持，扩展不会打开这些页面，也不会用缩略图代替。“重试失败下载”只处理下载失败；去重失败请再次点“筛除重复图片”。

## 未获得权限 / 新的 CDN 需要访问权限

点击对应操作，在 Chrome 提示中允许所需站点。拒绝不会开始该批操作。图片可能来自与论坛不同的 CDN；首次报告缺少权限后，再点下载可请求该地址权限。浏览器设置里撤销过的站点访问，也需要重新授权。不要手动填入 Cookie。

## 筛选后有图片没有下载

这是预期行为：下载和重试只处理**当前显示且已选**的图片。界面会显示“隐藏已选”数量；清除筛选可以查看。全选、取消选择、普通点击和 Shift 连选也只影响当前显示的图片。解析和去重仍处理完整列表。新扫描会清除筛选；继续未完成的整帖扫描会保留筛选。

## 去重后仍有相似图片

SHA-256 比较文件字节，不判断视觉相似。同一画面经过重新压缩、改尺寸或更改元数据，可能仍是不同文件。去重需要读取原图，之后下载还会再读一次。它不检查磁盘上以前保存的文件。

## 下载失败、文件不完整或没有保存

以卡片的“已保存”和 Chrome 下载记录为准。网络失败、权限不足、被取消或被浏览器中断都不会视为成功。检查来源后，勾选失败项并点“重试失败下载”。已完成项不会再次排入同一面板的下载队列。文件先检查 MIME、图片解码以及宽高至少 80 像素；登录页、错误页和过小图片会被拒绝。

## 停止后还在处理

“停止排队”不取消已经发出的网络请求，而是停止安排后续任务。当前图片或页面结束后停止。同一面板可以继续整帖扫描；关闭面板后进度消失。

## 保存到哪里

Chrome 默认下载目录下的 `帖子图片/<保存子文件夹>/`。若 Chrome 设置了“下载前询问每个文件的保存位置”，浏览器设置可能影响体验；先检查 Chrome 下载设置和下载记录。

## Mac 开发检查提示 Python 版本过低

系统 Python 可能低于项目要求。安装或选择 Python 3.11+ 后运行：

```sh
PYTHON_BIN=python3.12 bash tools/mac-check.sh
```

也可以把 `PYTHON_BIN` 设为已有 Python 3.11+ 的可执行文件路径。此脚本不会安装系统工具或修改浏览器配置。只安装和使用扩展不需要 Python。

## English quick help

- Empty list: check HTTPS, login, loaded post bodies and supported layouts.
- Unsupported card: the image links to a viewer page, gallery or other host; these are never opened or guessed.
- Missing permission: click the action again and allow the requested origin; a new CDN may need its own grant.
- Hidden selections: only visible selected cards enter download/retry queues; clear filters to see the rest.
- Similar duplicates: only identical file bytes are deduplicated.
- Stopped tasks: in-flight work finishes before stopping. Closing the panel loses progress.
