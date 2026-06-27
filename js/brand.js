/*
    ColorLens — Brand & Author metadata
    Single source of truth for creator info, contact links, and support copy.
    Change anything here and it updates the footer, exports (PDF/PNG/TXT/JSON),
    and watermarks everywhere at once.
*/

export const BRAND = {
    appName: "ColorLens",
    tagline: "Extract, inspect & export color — right in your browser.",
    version: "2.0",
    author: "Imran",
    authorRole: "Independent developer & open resource builder",
    year: new Date().getFullYear(),

    // Logo lives in /assets. Used for the on-screen brand and inside exports.
    logoPath: "assets/colorlens-logo.png",

    // Usage / authorization notice shown in the footer and embedded in exports.
    authorized: "Authorized Version — created using ColorLens. Free for personal, educational & commercial color work. Please keep this credit intact.",

    // Short ask that invites people to support more free public resources.
    supportPitch:
        "If this project has helped you, please consider supporting Imran's work so more high-quality tools " +
        "and public resources can remain freely available for everyone.",

    contact: {
        whatsappDisplay: "+880 1972-037650",
        whatsappUrl: "https://wa.me/8801972037650",
        email: "me.imran.personal@gmail.com",
        emailUrl: "mailto:me.imran.personal@gmail.com?subject=ColorLens%20—%20Hello%20Imran",
        portfolioLabel: "imran-me.github.io/OppTracker",
        portfolioUrl: "https://imran-me.github.io/OppTracker/",
    },
};

/* Compact one-line credit used as a watermark/footer string inside exports. */
export function exportCredit() {
    return `${BRAND.appName} v${BRAND.version} · by ${BRAND.author} · ${BRAND.contact.portfolioLabel}`;
}

/*
    Build a per-export metadata stamp: unique report id, date, time, version.
    Used by every exporter so each output is uniquely identifiable and dated.
*/
export function buildReportMeta() {
    const now = new Date();
    const random = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID().split("-")[0].toUpperCase()
        : Math.random().toString(36).slice(2, 8).toUpperCase();
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

    return {
        id: `CL-${stamp}-${random}`,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        iso: now.toISOString(),
        version: BRAND.version,
    };
}

function pad(value) {
    return String(value).padStart(2, "0");
}

/* Multi-line block of author + contact details for text-based exports. */
export function exportContactBlock() {
    return [
        `© ${BRAND.year} ${BRAND.author} · Authorized Version`,
        `Created by ${BRAND.author} — ${BRAND.authorRole}`,
        `WhatsApp : ${BRAND.contact.whatsappDisplay}`,
        `Email    : ${BRAND.contact.email}`,
        `Portfolio: ${BRAND.contact.portfolioUrl}`,
        "",
        BRAND.authorized,
        BRAND.supportPitch,
    ];
}
