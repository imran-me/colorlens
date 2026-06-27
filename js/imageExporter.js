import { BRAND, exportCredit, buildReportMeta } from "./brand.js";
import { getLogoDataUrl } from "./logoAsset.js";

/*
    Branded PNG palette export
    Renders the saved colors into a polished, shareable poster image that
    carries the ColorLens logo, a subtle repeating watermark, and Imran's
    author + contact details. This is the "output with logo, info, watermark"
    deliverable. Pure canvas — no external libraries.
*/

const SCALE = 2; // Render at 2x for crisp output on all screens.
const WIDTH = 1000;
const PADDING = 56;
const SWATCH_GAP = 18;
const COLS = 4;

export async function exportPng(state) {
    const colors = state.colors || [];
    if (colors.length === 0) {
        return;
    }

    const logoData = await getLogoDataUrl().catch(() => null);
    const logoImg = logoData?.dataUrl ? await decodeImage(logoData.dataUrl).catch(() => null) : null;

    const rows = Math.ceil(colors.length / COLS);
    const swatchAreaWidth = WIDTH - PADDING * 2;
    const swatchSize = Math.floor((swatchAreaWidth - SWATCH_GAP * (COLS - 1)) / COLS);
    const swatchHeight = swatchSize + 70; // room for name + hex under each swatch

    const headerHeight = 188;
    const footerHeight = 196;
    const gridHeight = rows * swatchHeight + (rows - 1) * SWATCH_GAP;
    const height = headerHeight + gridHeight + footerHeight;

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH * SCALE;
    canvas.height = height * SCALE;
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);
    ctx.textBaseline = "alphabetic";

    paintBackground(ctx, height);
    paintWatermark(ctx, height);
    paintHeader(ctx, logoImg, colors.length, state);
    paintGrid(ctx, colors, headerHeight, swatchSize, swatchHeight);
    paintFooter(ctx, height, footerHeight);

    canvas.toBlob((blob) => {
        if (blob) {
            triggerDownload(blob, "colorlens-palette.png");
        }
    }, "image/png");
}

function paintBackground(ctx, height) {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, height);
    gradient.addColorStop(0, "#0e1116");
    gradient.addColorStop(1, "#191f29");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, height);

    // Top spectrum strip — the ColorLens brand accent.
    const strip = ctx.createLinearGradient(0, 0, WIDTH, 0);
    strip.addColorStop(0, "#ff5a68");
    strip.addColorStop(0.34, "#f5c542");
    strip.addColorStop(0.67, "#20b486");
    strip.addColorStop(1, "#3b82f6");
    ctx.fillStyle = strip;
    ctx.fillRect(0, 0, WIDTH, 6);
}

function paintWatermark(ctx, height) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 26px Inter, Arial, sans-serif";
    const text = `${BRAND.appName} · ${BRAND.author}`;
    const stepX = 360;
    const stepY = 180;
    ctx.translate(0, 0);
    ctx.rotate((-22 * Math.PI) / 180);
    for (let y = -100; y < height + 300; y += stepY) {
        for (let x = -200; x < WIDTH + 400; x += stepX) {
            ctx.fillText(text, x, y);
        }
    }
    ctx.restore();
}

function paintHeader(ctx, logoImg, count, state) {
    const top = 34;

    if (logoImg) {
        const size = 64;
        drawRoundedImage(ctx, logoImg, PADDING, top, size, size, 14);
        writeBrandText(ctx, PADDING + size + 18, top, count, state);
    } else {
        writeBrandText(ctx, PADDING, top, count, state);
    }
}

function writeBrandText(ctx, x, top, count, state) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 34px Inter, Arial, sans-serif";
    ctx.fillText(BRAND.appName, x, top + 34);

    ctx.fillStyle = "#9aa6b8";
    ctx.font = "500 15px Inter, Arial, sans-serif";
    ctx.fillText("Color Palette Report", x, top + 58);

    const report = buildReportMeta();
    const meta = `${count} color${count === 1 ? "" : "s"}  ·  ${report.date} ${report.time}`;
    ctx.font = "500 14px Inter, Arial, sans-serif";
    ctx.fillStyle = "#6f7d92";
    ctx.fillText(meta, x, top + 80);

    const sourceLine = state.imageFileName ? `Source: ${truncate(state.imageFileName, 32)}  ·  ` : "";
    ctx.fillText(`${sourceLine}Report ${report.id}`, x, top + 100);
}

function paintGrid(ctx, colors, headerHeight, swatchSize, swatchHeight) {
    colors.forEach((color, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const x = PADDING + col * (swatchSize + SWATCH_GAP);
        const y = headerHeight + row * (swatchHeight + SWATCH_GAP);

        roundRect(ctx, x, y, swatchSize, swatchSize, 16);
        ctx.fillStyle = color.hex;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.stroke();

        ctx.fillStyle = "#e8edf4";
        ctx.font = "700 15px Inter, Arial, sans-serif";
        ctx.fillText(truncate(color.name, 18), x + 2, y + swatchSize + 26);

        ctx.fillStyle = "#8b97a9";
        ctx.font = "500 13px Inter, Arial, sans-serif";
        ctx.fillText(color.hex, x + 2, y + swatchSize + 46);
    });
}

function paintFooter(ctx, height, footerHeight) {
    const top = height - footerHeight + 8;

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, top);
    ctx.lineTo(WIDTH - PADDING, top);
    ctx.stroke();

    let y = top + 30;

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 16px Inter, Arial, sans-serif";
    ctx.fillText(`Created by ${BRAND.author} — ${BRAND.authorRole}`, PADDING, y);

    y += 26;
    ctx.fillStyle = "#9aa6b8";
    ctx.font = "500 14px Inter, Arial, sans-serif";
    ctx.fillText(`WhatsApp  ${BRAND.contact.whatsappDisplay}     Email  ${BRAND.contact.email}`, PADDING, y);

    y += 22;
    ctx.fillText(`Portfolio  ${BRAND.contact.portfolioUrl}`, PADDING, y);

    y += 30;
    ctx.fillStyle = "#7d8a9e";
    ctx.font = "italic 500 13px Inter, Arial, sans-serif";
    wrapText(ctx, BRAND.supportPitch, PADDING, y, WIDTH - PADDING * 2, 18);

    // Bottom credit line.
    ctx.fillStyle = "#5d6a7d";
    ctx.font = "600 12px Inter, Arial, sans-serif";
    ctx.fillText(exportCredit(), PADDING, height - 18);
}

/* ---------- small canvas helpers ---------- */

function decodeImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", reject);
        img.src = src;
    });
}

function drawRoundedImage(ctx, img, x, y, w, h, r) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.clip();
    try {
        ctx.drawImage(img, x + 4, y + 4, w - 8, h - 8);
    } catch {
        /* image not ready — the white rounded chip still reads as a logo slot */
    }
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let cursorY = y;

    words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, cursorY);
            line = word;
            cursorY += lineHeight;
        } else {
            line = test;
        }
    });

    if (line) {
        ctx.fillText(line, x, cursorY);
    }
}

function truncate(value, max) {
    const text = String(value);
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
