import { getHsl, hslToRgb } from "./colorConversions.js";

/*
    Color harmony generator
    Given a base RGB color, build classic color-theory relationships.
    Each scheme returns an ordered list of RGB objects (base first) so the
    UI can render swatches and the user can push them into their library.
*/

export const HARMONY_SCHEMES = [
    { id: "complementary", label: "Complementary" },
    { id: "analogous", label: "Analogous" },
    { id: "triadic", label: "Triadic" },
    { id: "tetradic", label: "Tetradic" },
    { id: "split", label: "Split Complementary" },
    { id: "monochromatic", label: "Monochromatic" },
];

export function buildHarmony(baseRgb, schemeId) {
    const base = getHsl(baseRgb);

    switch (schemeId) {
        case "complementary":
            return fromHues(base, [0, 180]);
        case "analogous":
            return fromHues(base, [-30, 0, 30, 60]);
        case "triadic":
            return fromHues(base, [0, 120, 240]);
        case "tetradic":
            return fromHues(base, [0, 90, 180, 270]);
        case "split":
            return fromHues(base, [0, 150, 210]);
        case "monochromatic":
            return monochromatic(base);
        default:
            return fromHues(base, [0, 180]);
    }
}

function fromHues(base, offsets) {
    return offsets.map((offset) => hslToRgb({ h: base.h + offset, s: base.s, l: base.l }));
}

function monochromatic(base) {
    const steps = [-28, -14, 0, 14, 28];
    return steps.map((delta) =>
        hslToRgb({
            h: base.h,
            s: clamp(base.s + delta / 2, 12, 100),
            l: clamp(base.l + delta, 12, 92),
        })
    );
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
