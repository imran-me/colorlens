# ColorLens

ColorLens is a fast, private, browser-based color tool. Extract palettes from images, inspect
pixels with a magnifier, generate color-theory harmonies, and export professional, **branded**
reports — all 100% client-side. No uploads, no servers, no tracking.

Built with HTML5, CSS3, and vanilla JavaScript (ES modules). GitHub Pages friendly.

## Features

- **Palette extraction** — dominant colors via Color Thief (with a built-in fallback sampler).
- **Pixel inspector** — Photoshop-style magnifier + click-to-save eyedropper.
- **Harmony Studio** — complementary, analogous, triadic, tetradic, split-complementary &
  monochromatic schemes from any base color.
- **Color library** — search, sort (newest/oldest/brightness/hue/name), favorites, list & grid views.
- **Rich color data** — HEX, RGB, HSL, HSV, CMYK, nearest color name, and WCAG AA/AAA contrast.
- **Branded exports** — PNG poster, PDF report, CSV, JSON, TXT. Every output carries the logo,
  a subtle watermark, a unique report ID, date/time, version, and author + contact details.
- **Auto-save** — your library persists in `localStorage` between sessions.
- **Polish** — toasts, undo (Ctrl+Z), keyboard shortcuts, dark mode, demo image, PWA manifest,
  reduced-motion support, and full keyboard/screen-reader accessibility.

### Keyboard shortcuts

`U` upload · `E` eyedropper tool · `H` hand/pan tool · `G` toggle grid/list · `D` dark mode ·
`/` focus search · `Ctrl/Cmd+Z` undo.

## Project structure

- `index.html` — application shell & templates.
- `manifest.webmanifest` — PWA metadata.
- `css/style.css` — design tokens, components, layout.
- `css/responsive.css` — breakpoint rules (mobile → ultra-wide).
- `js/`
  - `app.js` — entry point wiring modules together.
  - `brand.js` — single source of truth for author/contact info & export metadata.
  - `state.js` — shared app state.
  - `ui.js` — UI orchestration: rendering, library, exports, harmonies, toasts, undo, shortcuts.
  - `imageLoader.js` — upload, drag-and-drop & demo loading.
  - `demoImage.js` — generated sample image for instant try-out.
  - `inspector.js` — magnifier & eyedropper.
  - `paletteExtractor.js` — palette extraction + duplicate merging.
  - `colorConversions.js` — color math (RGB/HSL/HSV/CMYK, contrast, names).
  - `colorNames.js` — nearest CSS color-name lookup.
  - `harmonies.js` — color-theory scheme generator.
  - `pdfExporter.js` — branded PDF/CSV/JSON/TXT exporters.
  - `imageExporter.js` — branded PNG palette poster.
  - `logoAsset.js` — logo loader/cache for embedding in exports.
- `assets/` — static assets (logo).

## Credits

Created by **Imran** — independent developer & open-resource builder.
If ColorLens helped you, consider supporting more free public tools.

- WhatsApp: +880 1972-037650
- Email: me.imran.personal@gmail.com
- Portfolio: https://imran-me.github.io/OppTracker/
