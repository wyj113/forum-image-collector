# Privacy and permissions

The extension has no telemetry, advertising SDK, account database, hosted upload service or remotely loaded JavaScript. It does not export browser cookies. Normal browser navigation and credentialed image requests may use the user's existing website session.

## Required permissions

- `activeTab`: inspect the page after the user clicks the extension.
- `scripting`: execute the scoped DOM reader in that page or an authorized temporary tab.
- `downloads`: save selected images and monitor their completion.

## Optional site access

The manifest declares `https://*/*` as an **optional** capability, not mandatory all-site access. Click handlers request only the exact origins needed for the chosen operation. Denial stops that operation. Background page reads and image fetches check the relevant grant.

Image CDNs may use a different origin from the forum and need an additional grant. The download action requests the origins of the selected images; if an origin is still missing, the attempt reports it and another user click can request it. File fetch redirects are rejected. Optional grants remain in Chrome until revoked or the extension is removed; removing site access in Chrome may require granting it again on a future operation.

This design follows the [Chrome permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions), including user-gesture requirements for permission prompts.

## What stays local

Lists of collected items, selection state, file fingerprints and page-resume buffers are held in the open panel's memory. Closing it clears them. The interface language choice (`zh` or `en`) alone is saved in extension-origin localStorage and survives panel closure; it does not store browsing content. Browser language is used only when there is no valid saved preference. No extra extension permission is required. Downloaded files and Chrome download records remain in the user's browser/download location. No persistent browsing-history database is created by the extension.

## Network activity

Source websites and image servers receive ordinary page, preview-image and original-file requests. The preview panel loads thumbnail URLs from the selected source. Background scanning opens temporary tabs that may load a website's own resources. This is not anonymous or offline operation.

Use repository issues with synthetic HTML and neutral example domains. Do not attach private screenshots, session cookies, signed production links or personal media.
