# MONOCHROME loader options

Three intro loaders from the fictional Monochrome Bureau. Pick one.

| Concept | What happens | Runs |
| --- | --- | --- |
| **THE VAULT** (`vault/`) | A thumbprint scan grants access, the wheel spins, eight bolts clunk back with a screen shake, and the chrome door swings open in 3D. Light floods out and the camera flies through to the site. | 3.35 s |
| **IDENTITY CHECK** (`identity/`) | An iris scan with sweeping scan lines. AGENT ID, CLEARANCE L5 and MATCH 99.7% type out, a red ACCESS GRANTED stamp thunks down, and hazard-edged blast doors split open. | 3.03 s |
| **TOP SECRET FILE** (`file/`) | Redaction bars burn off a TOP SECRET folder to reveal "MONOCHROME — THE COLLECTION". A red DECLASSIFIED stamp slams down and the cover flips open in 3D. | 3.10 s |

- **Watch:** `<key>-phone.mp4` (390×844 at 2x), `<key>-desktop.mp4` (1440×900) and `<key>-sheet.png` (6 key frames). Each video ends with a 2 s hold on the revealed site.
- **Try:** open `<key>/index.html` in a browser. Use **Replay**, or add `?replay` to the URL, to see it again (it plays once per session). The page behind is a screenshot of the new home page (`bg/`).
- **Install:** copy `<key>/mc-loader-<key>.liquid` to `snippets/` and add `{% render 'mc-loader-<key>' %}` straight after `<body>` in `layout/theme.liquid`.
  - Each snippet is one file of markup, CSS and vanilla JS, about 10 to 15 KB.
  - Skip: any tap, click, key or the Skip button.
  - No JS, no loader. Reduced motion gets a 300 ms fade.
  - When it finishes it fires `mcl:done` on `document`.
