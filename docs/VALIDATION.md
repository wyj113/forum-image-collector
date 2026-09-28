# Verification status / 验证状态

Release: **3.0.0**.

This document records project checks only. It contains no maintainer identity, personal path, device details or local machine configuration.

## Automated checks

- JavaScript regression suite: **47 passed**, including extraction, origin permissions, ordered thread collection, selection, exact-file deduplication, bounded concurrency, download completion, filtering and retries.
- Localization tests cover browser-language defaults, saved preferences, unavailable local storage, nested progress/errors, accessible labels, image-type labels and language changes during active downloads. Source titles and filenames remain unchanged.
- Source checks validate extension permissions, matching versions, module syntax and required documents, and scan for personal-path/private-key markers. This is not a complete security audit.
- Python suite: **2 passed**, covering stable packaging, source-archive rebuilding, checksums, exclusion of unrelated files, and draft-release behavior with mocked external CLI boundaries.
- Chinese and English previews use synthetic data. Desktop and narrow layouts are checked for overflow. Preview rendering is not a live-extension end-to-end test.

## Release artifacts

The extension, source and optional Mac handoff archives are built from explicit file lists. Generated packages exclude Git metadata, installed dependencies, local previews, browser profiles, downloaded media and unrelated files. Stable ZIP metadata avoids embedding original filesystem timestamps or permissions.

Identical input bytes are reproducible within the same Python/zlib toolchain; byte identity across different compression-library versions is not guaranteed.

## Not verified or executed

- Real Chrome permission prompts, cross-origin login sessions and production-site full-thread downloads still require the [manual browser checklist](SMOKE_TEST.md).
- For online cross-platform results, see the repository’s Actions history. The local checks above do not imply every cloud run has passed.
- GitHub publication and Chrome Web Store approval are separate. No Chrome Web Store submission has been performed.
- Layout support remains limited to the documented forum adapters and directly linked images. Closing the panel does not preserve collection progress; only the interface-language preference persists.

## 中文说明

本记录只说明项目测试结果，不记录维护者身份、个人路径、设备或本机配置。自动化测试与合成截图不能代替真实网站的登录、权限和下载验证。公开包不包含本地运行日志、浏览器资料或私人图片。
