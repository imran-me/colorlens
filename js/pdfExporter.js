import { BRAND, exportCredit, exportContactBlock, buildReportMeta } from "./brand.js";
import { getLogoDataUrl } from "./logoAsset.js";

/*
    Export helpers
    Every export carries ColorLens branding + Imran's author/contact info so the
    output is self-describing and properly credited. PDF additionally embeds the
    logo and a diagonal watermark. PNG export lives in js/imageExporter.js.
*/

export function exportJson(state) {
    const report = buildReportMeta();
    const payload = {
        meta: {
            app: BRAND.appName,
            version: BRAND.version,
            reportId: report.id,
            generatedAt: report.iso,
            sourceImage: state.imageFileName || null,
            colorCount: state.colors.length,
            author: BRAND.author,
            authorRole: BRAND.authorRole,
            contact: {
                whatsapp: BRAND.contact.whatsappDisplay,
                email: BRAND.contact.email,
                portfolio: BRAND.contact.portfolioUrl,
            },
            license: BRAND.authorized,
            support: BRAND.supportPitch,
            credit: exportCredit(),
        },
        colors: buildExportRows(state).map((row) => ({
            name: row.name,
            hex: row.hex,
            rgb: row.rgb,
            hsl: row.hsl,
            hsv: row.hsv,
            cmyk: row.cmyk,
            contrastRatio: row.contrastRatio,
            recommendedText: row.recommendedText,
            aa: row.aa,
            aaa: row.aaa,
        })),
    };

    downloadText("colorlens-palette.json", JSON.stringify(payload, null, 2), "application/json");
}

export function exportCsv(state) {
    const report = buildReportMeta();
    const rows = buildExportRows(state);
    const headers = ["Name", "HEX", "RGB", "HSL", "HSV", "CMYK", "Contrast", "Text", "AA", "AAA"];
    const creditLines = [
        `# ${BRAND.appName} v${BRAND.version} — Color Palette Export`,
        `# Report ID: ${report.id}  ·  Generated: ${report.date} ${report.time}`,
        `# © ${BRAND.year} ${BRAND.author} — Authorized Version`,
        `# Created by ${BRAND.author} | WhatsApp ${BRAND.contact.whatsappDisplay} | ${BRAND.contact.email}`,
        `# Portfolio: ${BRAND.contact.portfolioUrl}`,
    ];

    const csvRows = [
        ...creditLines,
        headers.join(","),
        ...rows.map((row) => [
            row.name,
            row.hex,
            row.rgb,
            row.hsl,
            row.hsv,
            row.cmyk,
            row.contrastRatio,
            row.recommendedText,
            row.aa,
            row.aaa,
        ].map(escapeCsv).join(",")),
    ];

    downloadText("colorlens-palette.csv", csvRows.join("\n"), "text/csv");
}

export function exportTxt(state) {
    const report = buildReportMeta();
    const divider = "=".repeat(56);
    const lines = [
        divider,
        `  ${BRAND.appName} v${BRAND.version} — Color Palette Report`,
        divider,
        `Report ID: ${report.id}`,
        `Date : ${report.date}    Time: ${report.time}`,
        `Image: ${state.imageFileName || "Not attached"}`,
        `Colors: ${state.colors.length}`,
        "",
        ...buildExportRows(state).map((row, index) => [
            `${index + 1}. ${row.name}`,
            `   HEX : ${row.hex}`,
            `   RGB : ${row.rgb}`,
            `   HSL : ${row.hsl}`,
            `   HSV : ${row.hsv}`,
            `   CMYK: ${row.cmyk}`,
            `   A11y: Contrast ${row.contrastRatio}:1 · Text ${row.recommendedText} · AA ${row.aa} · AAA ${row.aaa}`,
        ].join("\n")),
        "",
        divider,
        ...exportContactBlock(),
        divider,
    ];

    downloadText("colorlens-palette.txt", lines.join("\n"), "text/plain");
}

export async function exportPdf(state) {
    const jsPdfNamespace = window.jspdf;

    if (!jsPdfNamespace?.jsPDF) {
        exportTxt(state);
        return;
    }

    const logo = await getLogoDataUrl().catch(() => null);
    const report = buildReportMeta();

    const doc = new jsPdfNamespace.jsPDF({ unit: "pt", format: "a4" });
    const page = { width: doc.internal.pageSize.getWidth(), height: doc.internal.pageSize.getHeight() };
    let y = drawPdfHeader(doc, state, page, logo, report);

    buildExportRows(state).forEach((row) => {
        if (y > page.height - 120) {
            drawPdfFooter(doc, page);
            doc.addPage();
            y = 56;
        }

        drawColorRow(doc, row, y);
        y += 82;
    });

    drawPdfFooter(doc, page);
    doc.save("colorlens-palette.pdf");
}

function buildExportRows(state) {
    return state.colors.map((color) => ({
        name: color.name,
        hex: color.hex,
        rgb: color.formats.rgb,
        hsl: color.formats.hsl,
        hsv: color.formats.hsv,
        cmyk: color.formats.cmyk,
        contrastRatio: color.accessibility.bestRatio,
        recommendedText: color.accessibility.recommendedText,
        aa: color.accessibility.aa ? "Pass" : "Fail",
        aaa: color.accessibility.aaa ? "Pass" : "Fail",
        color,
    }));
}

function drawPdfHeader(doc, state, page, logo, report) {
    doc.setFillColor(14, 17, 22);
    doc.rect(0, 0, page.width, 138, "F");

    // Spectrum accent strip under the header.
    drawSpectrumStrip(doc, page.width, 138);

    let textX = 42;

    if (logo?.dataUrl) {
        try {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(42, 34, 70, 70, 10, 10, "F");
            doc.addImage(logo.dataUrl, "PNG", 48, 40, 58, 58);
            textX = 128;
        } catch {
            textX = 42;
        }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(`${BRAND.appName} Palette Report`, textX, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(170, 180, 195);
    doc.text(`${report.date} ${report.time}  ·  Report ${report.id}`, textX, 82);
    doc.text(`Image: ${state.imageFileName || "Not attached"}  ·  Colors: ${state.colors.length}`, textX, 98);

    if (state.imageDataUrl) {
        try {
            doc.addImage(state.imageDataUrl, getImageType(state.imageDataUrl), page.width - 138, 30, 88, 70);
        } catch {
            /* thumbnail optional */
        }
    }

    drawWatermark(doc, page);

    doc.setTextColor(22, 24, 29);
    return 174;
}

function drawWatermark(doc, page) {
    doc.saveGraphicsState?.();
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(48);
    doc.setFont("helvetica", "bold");
    if (doc.setGState && doc.GState) {
        doc.setGState(new doc.GState({ opacity: 0.06 }));
    }
    for (let yy = 220; yy < page.height - 60; yy += 180) {
        doc.text(`${BRAND.appName} · ${BRAND.author}`, page.width / 2, yy, { align: "center", angle: 24 });
    }
    if (doc.setGState && doc.GState) {
        doc.setGState(new doc.GState({ opacity: 1 }));
    }
    doc.restoreGraphicsState?.();
    doc.setTextColor(22, 24, 29);
}

function drawSpectrumStrip(doc, width, y) {
    const segments = [
        [255, 90, 104],
        [245, 197, 66],
        [32, 180, 134],
        [59, 130, 246],
    ];
    const segWidth = width / segments.length;
    segments.forEach((rgb, index) => {
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(index * segWidth, y - 4, segWidth, 4, "F");
    });
}

function drawColorRow(doc, row, y) {
    const rgb = row.color.rgb;

    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(42, y - 24, 512, 64, 8, 8);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.circle(72, y + 8, 18, "F");
    doc.setTextColor(22, 24, 29);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(row.name, 104, y - 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${row.hex}  |  ${row.rgb}`, 104, y + 15);
    doc.text(`${row.hsl}  |  ${row.hsv}  |  ${row.cmyk}`, 104, y + 29);
    doc.text(`Contrast ${row.contrastRatio}:1 | Text ${row.recommendedText} | AA ${row.aa} | AAA ${row.aaa}`, 320, y - 1);
}

function drawPdfFooter(doc, page) {
    const baseY = page.height - 54;

    doc.setDrawColor(225, 228, 233);
    doc.line(42, baseY - 14, page.width - 42, baseY - 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40, 44, 52);
    doc.text(`Created by ${BRAND.author}`, 42, baseY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 100, 115);
    doc.text(
        `WhatsApp ${BRAND.contact.whatsappDisplay}  ·  ${BRAND.contact.email}  ·  ${BRAND.contact.portfolioUrl}`,
        42,
        baseY + 13
    );

    doc.setFontSize(7.5);
    doc.setTextColor(140, 148, 160);
    doc.text(BRAND.supportPitch, 42, baseY + 26, { maxWidth: page.width - 84 });

    doc.setFontSize(8);
    doc.setTextColor(150, 156, 168);
    const pageLabel = `${exportCredit()}`;
    doc.text(pageLabel, page.width - 42, baseY, { align: "right" });
}

function escapeCsv(value) {
    return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function getImageType(dataUrl) {
    if (dataUrl.startsWith("data:image/png")) {
        return "PNG";
    }

    if (dataUrl.startsWith("data:image/webp")) {
        return "WEBP";
    }

    return "JPEG";
}

function downloadText(fileName, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
