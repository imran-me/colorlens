import { getNearestColorName } from "./colorNames.js";

/*
    Color conversion utilities
    Change formatting strings here if you want cards and exports to display values differently.
*/

export function normalizeColor(inputRgb) {
    const rgb = {
        r: clampChannel(inputRgb.r),
        g: clampChannel(inputRgb.g),
        b: clampChannel(inputRgb.b),
    };
    const hex = rgbToHex(rgb);
    const hsl = rgbToHsl(rgb);
    const hsv = rgbToHsv(rgb);
    const cmyk = rgbToCmyk(rgb);
    const accessibility = getAccessibility(rgb);

    return {
        id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        createdAt: Date.now(),
        favorite: false,
        name: getNearestColorName(rgb),
        rgb,
        hex,
        hsl,
        hsv,
        cmyk,
        brightness: getBrightness(rgb),
        hue: hsl.h,
        accessibility,
        formats: {
            hex,
            rgb: formatRgb(rgb),
            hsl: formatHsl(hsl),
            hsv: formatHsv(hsv),
            cmyk: formatCmyk(cmyk),
        },
    };
}

export function rgbArrayToObject(rgb) {
    return { r: rgb[0], g: rgb[1], b: rgb[2] };
}

/*
    HSL -> RGB. Used by the harmony generator to rotate hue / shift lightness
    and turn the result back into a paintable RGB color.
*/
export function hslToRgb({ h, s, l }) {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(100, s)) / 100;
    const light = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light - c / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (hue < 60) {
        [r, g, b] = [c, x, 0];
    } else if (hue < 120) {
        [r, g, b] = [x, c, 0];
    } else if (hue < 180) {
        [r, g, b] = [0, c, x];
    } else if (hue < 240) {
        [r, g, b] = [0, x, c];
    } else if (hue < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
    };
}

/* Expose the internal RGB->HSL so feature modules can read hue/sat/light. */
export function getHsl(rgb) {
    return rgbToHsl(rgb);
}

export function rgbToHex(rgb) {
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export function formatRgb(rgb) {
    return `RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function formatHsl(hsl) {
    return `HSL(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

export function formatHsv(hsv) {
    return `HSV(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
}

export function formatCmyk(cmyk) {
    return `CMYK(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
}

export function isSameColor(first, second) {
    return first.hex.toUpperCase() === second.hex.toUpperCase();
}

export function getBrightness(rgb) {
    return Math.round((rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000);
}

function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
}

function toHex(channel) {
    return clampChannel(channel).toString(16).padStart(2, "0");
}

function rgbToHsl(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        h = getHue(r, g, b, max, delta);
    }

    return {
        h: Math.round(h),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

function rgbToHsv(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const h = delta === 0 ? 0 : getHue(r, g, b, max, delta);
    const s = max === 0 ? 0 : delta / max;

    return {
        h: Math.round(h),
        s: Math.round(s * 100),
        v: Math.round(max * 100),
    };
}

function rgbToCmyk(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const k = 1 - Math.max(r, g, b);

    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }

    return {
        c: Math.round(((1 - r - k) / (1 - k)) * 100),
        m: Math.round(((1 - g - k) / (1 - k)) * 100),
        y: Math.round(((1 - b - k) / (1 - k)) * 100),
        k: Math.round(k * 100),
    };
}

function getHue(r, g, b, max, delta) {
    if (max === r) {
        return (((g - b) / delta) % 6) * 60 + (((g - b) / delta) < 0 ? 360 : 0);
    }

    if (max === g) {
        return (((b - r) / delta) + 2) * 60;
    }

    return (((r - g) / delta) + 4) * 60;
}

function getAccessibility(rgb) {
    const whiteRatio = getContrastRatio(rgb, { r: 255, g: 255, b: 255 });
    const blackRatio = getContrastRatio(rgb, { r: 0, g: 0, b: 0 });
    const recommendedText = whiteRatio >= blackRatio ? "White" : "Black";
    const bestRatio = Math.max(whiteRatio, blackRatio);

    return {
        whiteRatio,
        blackRatio,
        bestRatio,
        recommendedText,
        aa: bestRatio >= 4.5,
        aaa: bestRatio >= 7,
    };
}

function getContrastRatio(first, second) {
    const lighter = Math.max(getRelativeLuminance(first), getRelativeLuminance(second));
    const darker = Math.min(getRelativeLuminance(first), getRelativeLuminance(second));
    return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function getRelativeLuminance(rgb) {
    const values = [rgb.r, rgb.g, rgb.b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    });

    return (0.2126 * values[0]) + (0.7152 * values[1]) + (0.0722 * values[2]);
}
