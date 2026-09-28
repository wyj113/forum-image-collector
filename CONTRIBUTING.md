# Contributing

Install Node.js 22+ and Python 3.11+, then run `npm ci --ignore-scripts`, `npm run verify`, and `python3 -m unittest discover -s tests -p 'test_*.py'`.

Keep changes scoped. Add a synthetic regression fixture for a new layout or bug, run the full suite, and update the adapter documentation when support changes. Do not add real user content, browser profiles, personal paths, account names, session tokens or signed production URLs.

For image extraction, prefer explicit post-body boundaries. Do not add site-specific image-host or gallery templates, a whole-document image fallback, silent thumbnail substitution, or anything that bypasses access controls. New host access should use the existing optional permission flow.

Tests must not contact real websites. The static files generated in `preview/` are disposable local fixtures and are excluded from source releases.

Include the problem, resulting behavior, tests run and remaining limitations in pull requests. Browser-level testing should be clearly distinguished from mocked API tests.

When adding a source, test or documentation file, update the explicit file list in `tools/package.py`. Selection/download filter changes must test hidden selections and permission denial. Use the manual checklist in `docs/SMOKE_TEST.md` for browser-level verification.
