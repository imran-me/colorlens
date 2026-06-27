import { BRAND } from "./brand.js";

/*
    Logo asset loader
    The brand logo is a PNG on disk. Exports (PDF + PNG) need it as a data URL.
    We load it once, downscale it to a sensible size, and cache the result so
    repeated exports stay fast. Returns null if the logo can't be loaded so the
    exporters can fall back to a text-only brand mark.
*/

let cachedLogo = null;
let pendingLoad = null;

const LOGO_MAX_SIDE = 240;

export function getLogoDataUrl() {
    if (cachedLogo !== null) {
        return Promise.resolve(cachedLogo);
    }

    if (pendingLoad) {
        return pendingLoad;
    }

    pendingLoad = loadAndCache();
    return pendingLoad;
}

function loadAndCache() {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";

        image.addEventListener("load", () => {
            try {
                cachedLogo = toDataUrl(image);
            } catch (error) {
                console.warn("Logo could not be rasterized for export.", error);
                cachedLogo = null;
            }
            resolve(cachedLogo);
        });

        image.addEventListener("error", () => {
            console.warn("Logo asset failed to load for export.");
            cachedLogo = null;
            resolve(null);
        });

        image.src = BRAND.logoPath;
    });
}

function toDataUrl(image) {
    const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);

    return { dataUrl: canvas.toDataURL("image/png"), width, height };
}
