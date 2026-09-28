# Architecture

The toolbar opens an extension panel. The initial page scan uses `activeTab`; actions requiring additional sites request explicit origin permissions.

`core.js` contains self-contained injected DOM readers and file validation. `workflow.js` reads thread pages in temporary tabs, with expected URL identity, bounded waits and cleanup. `background.js` limits temporary readers across panels to four. `thread.js` reads bounded page windows, buffers out-of-order results and commits them in page order. `permissions.js` constructs exact HTTPS origin patterns and checks access.

`panel.js` owns preview selection, user-gesture permission requests, per-action queues and download completion. `dedup.js` caches SHA-256 results without retaining all image blobs. Concurrent duplicate URL saves share their actual saving promise, so a failed first copy cannot falsely mark other copies complete.

Most tests exercise production DOM and workflow functions with synthetic HTML and API-boundary doubles. Network, browser permission UI and image decoders are mocked where necessary. Tests do not prove compatibility with every real deployment. A release should state which browser-level checks were actually performed.

Preview filters are derived from current item metadata and phase in `panel.js`. Hidden cards retain selection; selection ranges and download/retry queues use the visible subset. Queues are captured before the origin permission request, with filters locked while busy. Deduplication retains whole-list scope. Failures record the operation kind so retry cannot turn a deduplication failure into a download. No persistent storage permission is added.

Packaging uses explicit source lists and stable ZIP entry metadata. Python tests rebuild an extracted source archive, check checksums and ensure unrelated local files are excluded. The manual release workflow runs the reusable CI matrix before building a draft for the tested commit.

`i18n.js` contains bilingual messages, interpolation and UI-boundary translation of known application errors. Panel notes and progress retain message descriptors so changing language can redraw existing state. Task kinds (`download`, `dedup`) are independent of displayed labels. DOM updates use textContent/attributes; source titles and names remain data. The sole persisted setting is language in extension-origin localStorage, with a browser-language fallback when storage is unavailable.
