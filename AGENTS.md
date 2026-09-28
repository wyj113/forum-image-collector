# Project guidance

Read `README.md`, `docs/MAC_HANDOFF.md`, and `docs/ADAPTERS.md` before changing behavior.

This is a Chrome Manifest V3 extension. Work in this public source tree. Keep examples synthetic and domain-neutral; never copy browser credentials, personal paths, real user media, private site screenshots or unrelated archives into it.

Maintain scoped post-body extraction, optional exact-origin permissions, direct-link-only image collection, ordered pagination, bounded concurrency, exact-file deduplication and accurate download completion reporting. Collection precedes user selection and download; do not silently switch to automatic bulk saving.

Run `npm test`, `npm run check`, and `python3 tools/package.py` after relevant changes. Tests use DOM fixtures and API doubles, not real-site automation. Label live-browser and platform verification honestly. Generated `preview/`, `dist/`, and `node_modules/` are ignored.

Do not claim all websites are supported. Add forum-body adapters and tests together. Do not add site-specific templates for image hosts, galleries or file pages; images that link elsewhere stay unsupported. Do not publish, push, create a remote repository or upload a release without a user request to do so.
