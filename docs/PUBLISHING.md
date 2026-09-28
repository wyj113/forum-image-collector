# 发布到 GitHub

本目录是公开源码项目。先上传项目源码，再通过 Release 提供安装 ZIP；不需要把开发依赖、个人下载目录或浏览器资料上传。

## 1. 本地检查

Node.js 22+、Python 3.11+：

```sh
npm ci --ignore-scripts
npm run verify
python3 -m unittest discover -s tests -p 'test_*.py'
python3 tools/package.py
git status --short
```

Windows 如没有 `python3`，使用 `python`。Mac 可用 `bash tools/mac-check.sh`；用 `PYTHON_BIN=python3.12` 选择合适的 Python。

完成 [浏览器检查清单](SMOKE_TEST.md)，将实测范围填入 [验证记录](VALIDATION.md)。保留未验证项的说明。MIT 许可证沿用原项目；如果希望使用其他许可证，在首次公开前调整 `LICENSE`、`package.json` 和 README。

## 2. 建立仓库并推送

在自己的 GitHub 账号创建空仓库，建议名称 `forum-image-collector`。简介可用：

> Collect, preview, filter and download images linked in forum posts. Local-first Chrome extension.

建议 topics：`chrome-extension`、`image-downloader`、`forum`、`manifest-v3`、`javascript`。

在本项目根目录操作。源码 ZIP 不含 Git 历史，可先 `git init -b main`；已有本地仓库无需再次初始化。

```sh
git add .
git diff --cached --stat
git diff --cached
# 若存在尚未提交的改动，使用你自己的 Git 身份提交：
git commit -m "Prepare Forum Image Collector 3.0.0"
# 替换为 GitHub 提供的真实仓库地址：
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

`<YOUR_REPOSITORY_URL>` 是占位符，不能原样运行。若已有 origin，先用 `git remote -v` 核对；不要覆盖不相关仓库。

仓库根目录应该直接出现 README、extension、tests、tools、docs 和 `.github`，而不是再套一层下载文件夹。`dist/`、`node_modules/` 和 `preview/` 已加入忽略列表。

## 3. 检查自动化并生成 Release 草稿

普通 push / pull request 会运行 Linux、macOS、Windows 的 Node 22 测试，以及 Linux 的 Node 24 测试，并检查和打包源码。CI 配置存在不代表它已经在线通过。

仓库默认分支有工作流后，在 **Actions → Prepare draft release → Run workflow** 选择默认分支：

1. 先运行完整跨平台验证矩阵。
2. 通过后为被验证的提交打包，并创建 `v3.0.0` Release **草稿**。
3. 附带扩展、源码、Mac 接续 ZIP 和 `SHA256SUMS.txt`。
4. 打开草稿，核对说明、安装包和验证范围，然后手动点 **Publish release**。

工作流不会因普通 push 而发布。已有同名 tag、Release 或草稿时停止，不会覆盖或重复创建；再次发布前应更新版本。非默认分支触发会跳过任务。

若 Actions 不能创建草稿，检查仓库是否允许工作流申请 `contents: write`。也可以在 GitHub Releases 页面手动创建草稿并上传本地 `dist/` 中的文件。

## 4. 分发文件

| 文件 | 用途 |
| --- | --- |
| `forum-image-collector-v3.0.0.zip` | 用户安装包；解压并加载 `extension/` |
| `forum-image-collector-source-v3.0.0.zip` | 干净完整源码，包括文档、测试和工作流 |
| `forum-image-collector-mac-handoff-v3.0.0.zip` | 源码、Mac 入口说明及安装包 |
| `SHA256SUMS.txt` | 三个 ZIP 的 SHA-256 校验值 |

在 Mac/Linux 的下载目录可运行 `shasum -a 256 -c SHA256SUMS.txt`。打包使用明确的文件清单、固定时间和权限；相同文件内容在同一 Python/zlib 工具链可得到相同 ZIP。不同压缩库版本的字节一致性不在保证范围内。

## 后续版本

同步修改 `extension/manifest.json`、`package.json`、`package-lock.json` 的版本，更新 CHANGELOG、RELEASE_NOTES 和使用文档。添加文件时同步更新 `tools/package.py` 的源码白名单；运行完整测试后重新打包。

参考：[GitHub 手动工作流](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)、[GitHub CLI 创建 Release](https://cli.github.com/manual/gh_release_create)。GitHub 发布与 Chrome Web Store 上架是两件事。
