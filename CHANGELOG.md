# Changelog

## 3.0.0 — Forum posts only

- Scope narrowed to images linked directly in forum posts. The image-viewer, gallery and file-page templates, gallery expansion and the separate "resolve originals" step were removed; such links are now listed as unsupported.
- The download workflow is simpler: collect → optionally deduplicate → filter/select → download.
- Tests, documentation and screenshots updated for the reduced scope.

## 2.2.0 — English and Chinese interface

- English / Simplified Chinese selector, browser-language default and locally remembered preference without additional permissions.
- Live translation of controls, summaries, image states, progress, accessible labels and application errors without resetting queues or selection.
- Language-independent task identifiers preserve concurrency and retry behavior across language changes.
- Source titles, filenames and save paths stay unchanged; unknown browser/server diagnostics are retained.
- English and Chinese synthetic previews, localization regression coverage and updated release packages.

## 2.1.0 — Filters and release preparation

- Keyword/status preview filters with visible-only selection, range selection and downloads; hidden selections are retained.
- Explicit retry for selected visible download failures, excluding resolution/deduplication failures and completed files.
- English README, synthetic interface preview, troubleshooting, browser verification checklist and release notes.
- Linux/macOS/Windows CI configuration, manual draft-release workflow and dependency-update configuration.
- Stable ZIP metadata, checksum verification and source-archive rebuild tests; configurable Python executable for Mac checks.

## 2.0.0 — Public edition

- Domain-independent forum and image-host template adapters.
- Current-page extraction for XenForo, phpBB and Discourse-style post bodies.
- Whole-thread collection for the supported XenForo URL and pagination layout.
- Optional HTTPS origin access requested from user actions, with checks before background reads and file fetches.
- Preview selection, modifier-key ranges, exact-file fingerprints, bounded concurrency, stop and retry.
- Neutral synthetic test data, public documentation, repository checks and release packaging.

This is the first public edition. Live-site compatibility is not guaranteed by synthetic tests.
