# Security

Do not put credentials, cookies, private photographs or signed download URLs in public issues. Use synthetic HTML and `.example` domains when possible.

For a suspected vulnerability, use GitHub's private vulnerability reporting feature **if the repository owner has enabled it**. Otherwise contact the owner through a private channel they have explicitly listed; do not publish exploit details in an ordinary issue.

Security-sensitive boundaries include URL identity checks, exact-origin permission requests, redirect rejection, DOM extraction scope and download filename handling. Reports should identify a reproducible affected boundary without exposing third-party private data.

This project has no hosted data service. See `docs/PRIVACY.md` for network and permission behavior.
