# Layout adapters

Adapters match forum structure rather than a deployment hostname. They are narrow templates, not a universal crawler.

## Forum bodies

`scanPage` in `extension/core.js` is self-contained because Chrome serializes it into the source tab.

| Post | Body |
| --- | --- |
| `article.message--post` | `.message-body .bbWrapper` |
| `.post[id]` | `.postbody .content` |
| `article[data-post-id]` | `.cooked` |

Images must be inside one of those bodies. Quote blocks, signature/user areas, common avatar/emoji/reaction classes, media wrappers, iframes and explicit advertisement containers are excluded. Human-posted ads can still look like normal post content; preview selection remains necessary.

Whole-thread scanning requires `/threads/<topic>/` and `/threads/<topic>/page-N`, `.pageNav-main` page links and valid next-page controls. Every result must belong to the same origin, topic and page number. Other forum layouts collect only currently loaded DOM content; virtualized or infinite-scroll posts are not automatically loaded.

## Linked images

Inside a supported body, an image is collected when it is a direct HTTPS image (an image file extension, or a forum `/attachments/` path), either on its own or linked to such a file. If the image links to anything else, such as an image-viewer page, a gallery or another host, it is listed as **unsupported**. The extension does not open those pages, guess an original, or substitute the thumbnail.

Site-specific templates for image viewers, galleries or file hosts are out of scope for this project.

## Extending support

New forum body layouts are welcome. Create a small synthetic page fixture first, then add the scoped selectors and tests together. Preserve HTTPS and credential rejection, expected-document identity, excluded content, per-origin permission checks and file validation.

URL extension checks identify candidate images, not trustworthy file content. MIME, image decoding and minimum dimensions are validated later. Do not broaden the scanner to all page images to make an unsupported site appear supported.
