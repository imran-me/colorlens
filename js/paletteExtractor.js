import { rgbArrayToObject } from "./colorConversions.js";

/*
    Palette extraction
    Color Thief is preferred. The fallback sampler keeps the app useful if the CDN fails.
    Change quantization settings here if you want more/less aggressive duplicate merging.
*/

const FALLBACK_SAMPLE_STEP = 6;
const MIN_COLOR_DISTANCE = 24;

export async function extractPalette({ image, canvas, count }) {
    const colors = await getPaletteColors(image, canvas, count);
    return removeNearDuplicates(colors).slice(0, count);
}

async function getPaletteColors(image, canvas, count) {
    if (window.ColorThief && image?.complete) {
        try {
            const colorThief = new window.ColorThief();
            return colorThief.getPalette(image, count * 2, 8).map(rgbArrayToObject);
        } catch (error) {
            console.warn("Color Thief failed, using fallback sampler.", error);
        }
    }

    return getFallbackPalette(canvas, count);
}

function getFallbackPalette(canvas, count) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    const buckets = new Map();

    for (let y = 0; y < height; y += FALLBACK_SAMPLE_STEP) {
        for (let x = 0; x < width; x += FALLBACK_SAMPLE_STEP) {
            const index = (y * width + x) * 4;
            const alpha = data[index + 3];

            if (alpha < 160) {
                continue;
            }

            const rgb = {
                r: data[index],
                g: data[index + 1],
                b: data[index + 2],
            };
            const key = `${Math.round(rgb.r / 24) * 24},${Math.round(rgb.g / 24) * 24},${Math.round(rgb.b / 24) * 24}`;
            const bucket = buckets.get(key) || { rgb: { r: 0, g: 0, b: 0 }, count: 0 };
            bucket.rgb.r += rgb.r;
            bucket.rgb.g += rgb.g;
            bucket.rgb.b += rgb.b;
            bucket.count += 1;
            buckets.set(key, bucket);
        }
    }

    return [...buckets.values()]
        .sort((first, second) => second.count - first.count)
        .slice(0, count * 4)
        .map((bucket) => ({
            r: Math.round(bucket.rgb.r / bucket.count),
            g: Math.round(bucket.rgb.g / bucket.count),
            b: Math.round(bucket.rgb.b / bucket.count),
        }));
}

function removeNearDuplicates(colors) {
    const uniqueColors = [];

    colors.forEach((color) => {
        const isDuplicate = uniqueColors.some((savedColor) => getDistance(savedColor, color) < MIN_COLOR_DISTANCE);

        if (!isDuplicate) {
            uniqueColors.push(color);
        }
    });

    return uniqueColors;
}

function getDistance(first, second) {
    return Math.sqrt(
        ((first.r - second.r) ** 2) +
        ((first.g - second.g) ** 2) +
        ((first.b - second.b) ** 2)
    );
}
