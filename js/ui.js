import { appState, setMode } from "./state.js";
import { isSameColor, normalizeColor } from "./colorConversions.js";
import { exportCsv, exportJson, exportPdf, exportTxt } from "./pdfExporter.js";
import { exportPng } from "./imageExporter.js";
import { BRAND } from "./brand.js";
import { HARMONY_SCHEMES, buildHarmony } from "./harmonies.js";

/*
    UI orchestration
    Central controller: rendering, library actions, exports, harmonies,
    persistence, toasts, undo, view switching, and keyboard shortcuts.
*/

const STORAGE_KEYS = {
    colors: "colorlens-colors",
    view: "colorlens-view",
    theme: "colorlens-theme",
};

let dom = {};
let activeScheme = HARMONY_SCHEMES[0].id;
const undoStack = [];

export function initializeUI() {
    dom = getDom();
    hydrateState();
    syncBrandCopy();
    bindModeButtons();
    bindLibraryControls();
    bindViewToggle();
    bindExportControls();
    bindCopyAll();
    bindDarkMode();
    bindHarmonyStudio();
    bindShortcuts();
    renderColorLibrary();
    renderHarmony();
    setStatus("Ready");
}

/* ---------------- color library ---------------- */

export function addColorFromRgb(rgb, source = "Saved", { silent = false } = {}) {
    const color = normalizeColor(rgb);
    const duplicate = appState.colors.find((existingColor) => isSameColor(existingColor, color));

    if (duplicate) {
        if (!silent) {
            setStatus(`${duplicate.hex} is already in your library`);
        }
        return duplicate;
    }

    appState.colors.unshift(color);
    persistColors();
    renderColorLibrary();

    if (!silent) {
        setStatus(`${source}: ${color.hex} added`);
        toast(`${color.name} (${color.hex}) saved`, "success");
    }
    return color;
}

export function addColorsFromPalette(rgbColors) {
    let addedCount = 0;

    rgbColors.forEach((rgb) => {
        const beforeCount = appState.colors.length;
        addColorFromRgb(rgb, "Palette", { silent: true });
        if (appState.colors.length > beforeCount) {
            addedCount += 1;
        }
    });

    renderColorLibrary();
    setStatus(addedCount > 0 ? `${addedCount} palette colors added` : "No new colors found");
    toast(addedCount > 0 ? `${addedCount} colors added to your library` : "No new colors found", addedCount > 0 ? "success" : "info");
}

export function renderColorLibrary() {
    if (!dom.colorList || !dom.colorTemplate) {
        return;
    }

    const colors = getVisibleColors();
    dom.colorList.innerHTML = "";
    dom.colorList.className = `color-list view-${appState.view}`;

    if (dom.colorCount) {
        dom.colorCount.textContent = String(appState.colors.length);
    }

    const hasColors = appState.colors.length > 0;
    dom.emptyState.hidden = hasColors;

    colors.forEach((color) => dom.colorList.appendChild(createColorCard(color)));

    if (hasColors && colors.length === 0) {
        dom.emptyState.hidden = false;
        dom.emptyState.querySelector("p").textContent = "No colors match your search.";
    } else if (dom.emptyState.querySelector("p")) {
        dom.emptyState.querySelector("p").textContent =
            "Upload an image or try a sample to begin building your color library.";
    }
}

/* ---------------- status + toast ---------------- */

export function setStatus(message) {
    if (dom.statusText) {
        dom.statusText.textContent = message;
    }
}

export function toast(message, type = "info") {
    if (!dom.toastHost) {
        return;
    }

    const icon = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info" }[type] || "fa-circle-info";
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span></span>`;
    node.querySelector("span").textContent = message;
    dom.toastHost.appendChild(node);

    window.setTimeout(() => {
        node.classList.add("is-leaving");
        node.addEventListener("animationend", () => node.remove(), { once: true });
    }, 2600);
}

/* ---------------- inspector readout bridge ---------------- */

export function getPaletteCount() {
    return Number(dom.paletteCount?.value || 10);
}

export function getCanvasElement() {
    return dom.imageCanvas;
}

export function getMagnifierCanvasElement() {
    return dom.magnifierCanvas;
}

export function updateInspectorReadout(color) {
    if (!dom.inspectorReadout) {
        return;
    }
    dom.inspectorReadout.hidden = false;
    dom.currentColorPreview.style.background = color.hex;
    dom.currentHex.textContent = color.hex;
    dom.currentRgb.textContent = color.formats.rgb;
}

export function hideInspectorReadout() {
    if (dom.inspectorReadout) {
        dom.inspectorReadout.hidden = true;
    }
}

/* ---------------- DOM ---------------- */

function getDom() {
    const q = (selector) => document.querySelector(selector);
    return {
        paletteModeBtn: q("#paletteModeBtn"),
        inspectorModeBtn: q("#inspectorModeBtn"),
        darkModeBtn: q("#darkModeBtn"),
        paletteCount: q("#paletteCount"),
        sortColors: q("#sortColors"),
        searchColors: q("#searchColors"),
        viewListBtn: q("#viewListBtn"),
        viewGridBtn: q("#viewGridBtn"),
        exportPng: q("#exportPng"),
        exportPdf: q("#exportPdf"),
        exportCsv: q("#exportCsv"),
        exportJson: q("#exportJson"),
        exportTxt: q("#exportTxt"),
        copyAllBtn: q("#copyAllBtn"),
        clearColors: q("#clearColors"),
        colorList: q("#colorList"),
        colorCount: q("#colorCount"),
        emptyState: q("#emptyState"),
        colorTemplate: q("#colorCardTemplate"),
        statusText: q("#statusText"),
        toastHost: q("#toastHost"),
        imageCanvas: q("#imageCanvas"),
        magnifierCanvas: q("#magnifierCanvas"),
        inspectorReadout: q("#inspectorReadout"),
        currentColorPreview: q("#currentColorPreview"),
        currentHex: q("#currentHex"),
        currentRgb: q("#currentRgb"),
        harmonyBase: q("#harmonyBase"),
        harmonyBaseHex: q("#harmonyBaseHex"),
        harmonySchemes: q("#harmonySchemes"),
        harmonySwatches: q("#harmonySwatches"),
        harmonyAddAll: q("#harmonyAddAll"),
        footerYear: q("#footerYear"),
        footerAuthorized: q("#footerAuthorized"),
        footerSupport: q("#footerSupport"),
    };
}

/* ---------------- persistence ---------------- */

function hydrateState() {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.colors) || "[]");
        if (Array.isArray(stored) && stored.length) {
            // Rebuild colors through normalizeColor so derived fields stay consistent
            // even if the stored shape changes between versions.
            appState.colors = stored
                .filter((item) => item?.rgb)
                .map((item) => ({ ...normalizeColor(item.rgb), favorite: Boolean(item.favorite), createdAt: item.createdAt || Date.now() }));
        }
    } catch {
        appState.colors = [];
    }

    const view = localStorage.getItem(STORAGE_KEYS.view);
    appState.view = view === "grid" ? "grid" : "list";
}

function persistColors() {
    try {
        const slim = appState.colors.map((color) => ({ rgb: color.rgb, favorite: color.favorite, createdAt: color.createdAt }));
        localStorage.setItem(STORAGE_KEYS.colors, JSON.stringify(slim));
    } catch {
        /* storage may be unavailable (private mode) — app still works in-memory */
    }
}

function pushUndo() {
    undoStack.push(appState.colors.map((color) => ({ ...color })));
    if (undoStack.length > 20) {
        undoStack.shift();
    }
}

function undo() {
    if (!undoStack.length) {
        toast("Nothing to undo", "info");
        return;
    }
    appState.colors = undoStack.pop();
    persistColors();
    renderColorLibrary();
    toast("Last action undone", "success");
}

/* ---------------- brand copy ---------------- */

function syncBrandCopy() {
    if (dom.footerYear) dom.footerYear.textContent = String(BRAND.year);
    if (dom.footerAuthorized) dom.footerAuthorized.textContent = BRAND.authorized;
    if (dom.footerSupport) dom.footerSupport.textContent = BRAND.supportPitch;
}

/* ---------------- bindings ---------------- */

function bindModeButtons() {
    dom.paletteModeBtn?.addEventListener("click", () => activateMode("palette"));
    dom.inspectorModeBtn?.addEventListener("click", () => activateMode("inspector"));
}

function activateMode(mode) {
    setMode(mode);
    const isPalette = mode === "palette";
    dom.paletteModeBtn?.classList.toggle("is-active", isPalette);
    dom.inspectorModeBtn?.classList.toggle("is-active", !isPalette);
    dom.paletteModeBtn?.setAttribute("aria-pressed", String(isPalette));
    dom.inspectorModeBtn?.setAttribute("aria-pressed", String(!isPalette));
    document.body.classList.toggle("inspector-mode", !isPalette);
    setStatus(isPalette ? "Palette mode active" : "Inspector mode — click the image to pick pixels");
}

function bindLibraryControls() {
    dom.searchColors?.addEventListener("input", (event) => {
        appState.searchTerm = event.target.value.trim().toLowerCase();
        renderColorLibrary();
    });

    dom.sortColors?.addEventListener("change", (event) => {
        appState.sortMode = event.target.value;
        renderColorLibrary();
    });

    dom.clearColors?.addEventListener("click", () => {
        if (appState.colors.length === 0) {
            toast("Library is already empty", "info");
            return;
        }
        pushUndo();
        appState.colors = [];
        persistColors();
        renderColorLibrary();
        setStatus("Color library cleared");
        toast("Library cleared — press Ctrl+Z to undo", "info");
    });
}

function bindViewToggle() {
    applyView(appState.view);
    dom.viewListBtn?.addEventListener("click", () => applyView("list"));
    dom.viewGridBtn?.addEventListener("click", () => applyView("grid"));
}

function applyView(view) {
    appState.view = view;
    localStorage.setItem(STORAGE_KEYS.view, view);
    dom.viewListBtn?.classList.toggle("is-active", view === "list");
    dom.viewGridBtn?.classList.toggle("is-active", view === "grid");
    dom.viewListBtn?.setAttribute("aria-pressed", String(view === "list"));
    dom.viewGridBtn?.setAttribute("aria-pressed", String(view === "grid"));
    renderColorLibrary();
}

function bindExportControls() {
    dom.exportPng?.addEventListener("click", () => exportWithGuard(exportPng, "PNG"));
    dom.exportPdf?.addEventListener("click", () => exportWithGuard(exportPdf, "PDF"));
    dom.exportCsv?.addEventListener("click", () => exportWithGuard(exportCsv, "CSV"));
    dom.exportJson?.addEventListener("click", () => exportWithGuard(exportJson, "JSON"));
    dom.exportTxt?.addEventListener("click", () => exportWithGuard(exportTxt, "TXT"));
}

function bindCopyAll() {
    dom.copyAllBtn?.addEventListener("click", async () => {
        if (appState.colors.length === 0) {
            toast("Add colors before copying", "info");
            return;
        }
        const hexes = appState.colors.map((color) => color.hex).join(", ");
        await copyToClipboard(hexes);
        setStatus(`${appState.colors.length} HEX values copied`);
        toast(`${appState.colors.length} HEX values copied`, "success");
    });
}

function bindDarkMode() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (savedTheme === "dark") {
        document.body.classList.add("theme-dark");
    }
    updateDarkModeIcon(document.body.classList.contains("theme-dark"));

    dom.darkModeBtn?.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("theme-dark");
        localStorage.setItem(STORAGE_KEYS.theme, isDark ? "dark" : "light");
        updateDarkModeIcon(isDark);
        setStatus(isDark ? "Dark mode enabled" : "Light mode enabled");
    });
}

function updateDarkModeIcon(isDark) {
    if (dom.darkModeBtn) {
        dom.darkModeBtn.innerHTML = `<i class="fa-solid fa-${isDark ? "sun" : "moon"}" aria-hidden="true"></i>`;
    }
}

async function exportWithGuard(exporter, label) {
    if (appState.colors.length === 0) {
        setStatus("Add at least one color before exporting");
        toast("Add at least one color before exporting", "info");
        return;
    }

    try {
        setStatus(`Preparing ${label} export…`);
        await exporter(appState);
        setStatus(`${label} export ready`);
        toast(`${label} export downloaded`, "success");
    } catch (error) {
        console.error(error);
        setStatus(`${label} export failed`);
        toast(`${label} export failed`, "error");
    }
}

/* ---------------- harmony studio ---------------- */

function bindHarmonyStudio() {
    if (!dom.harmonySchemes) {
        return;
    }

    HARMONY_SCHEMES.forEach((scheme) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `scheme-btn${scheme.id === activeScheme ? " is-active" : ""}`;
        button.textContent = scheme.label;
        button.dataset.scheme = scheme.id;
        button.addEventListener("click", () => {
            activeScheme = scheme.id;
            dom.harmonySchemes.querySelectorAll(".scheme-btn").forEach((btn) => {
                btn.classList.toggle("is-active", btn.dataset.scheme === scheme.id);
            });
            renderHarmony();
        });
        dom.harmonySchemes.appendChild(button);
    });

    dom.harmonyBase?.addEventListener("input", () => {
        if (dom.harmonyBaseHex) {
            dom.harmonyBaseHex.textContent = dom.harmonyBase.value.toUpperCase();
        }
        renderHarmony();
    });

    dom.harmonyAddAll?.addEventListener("click", () => {
        const colors = currentHarmonyColors();
        addColorsFromPalette(colors);
    });
}

function currentHarmonyColors() {
    const baseRgb = hexToRgb(dom.harmonyBase?.value || "#1976d2");
    return buildHarmony(baseRgb, activeScheme);
}

function renderHarmony() {
    if (!dom.harmonySwatches) {
        return;
    }

    const colors = currentHarmonyColors().map((rgb) => normalizeColor(rgb));
    dom.harmonySwatches.innerHTML = "";

    colors.forEach((color) => {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "harmony-swatch";
        swatch.innerHTML = `
            <span class="chip" style="background:${color.hex}"></span>
            <span class="meta">
                <span class="name"></span>
                <span class="hex"></span>
                <span class="add-hint">click to save</span>
            </span>`;
        swatch.querySelector(".name").textContent = color.name;
        swatch.querySelector(".hex").textContent = color.hex;
        swatch.addEventListener("click", () => addColorFromRgb(color.rgb, "Harmony"));
        dom.harmonySwatches.appendChild(swatch);
    });
}

/* ---------------- keyboard shortcuts ---------------- */

function bindShortcuts() {
    document.addEventListener("keydown", (event) => {
        const target = event.target;
        const typing = target instanceof HTMLElement &&
            (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA");

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
            event.preventDefault();
            undo();
            return;
        }

        if (typing) {
            return;
        }

        switch (event.key.toLowerCase()) {
            case "u":
                document.querySelector("#imageInput")?.click();
                break;
            case "p":
                activateMode("palette");
                break;
            case "i":
                activateMode("inspector");
                break;
            case "d":
                dom.darkModeBtn?.click();
                break;
            case "g":
                applyView(appState.view === "grid" ? "list" : "grid");
                break;
            case "/":
                event.preventDefault();
                dom.searchColors?.focus();
                break;
            default:
                break;
        }
    });
}

/* ---------------- visible colors ---------------- */

function getVisibleColors() {
    const filteredColors = appState.colors.filter(matchesSearch);
    return filteredColors.toSorted ? filteredColors.toSorted(sortColors) : [...filteredColors].sort(sortColors);
}

function matchesSearch(color) {
    const term = appState.searchTerm;
    if (!term) {
        return true;
    }
    return [color.name, color.hex, color.formats.rgb, color.formats.hsl, color.formats.cmyk]
        .some((value) => value.toLowerCase().includes(term));
}

function sortColors(first, second) {
    if (first.favorite !== second.favorite) {
        return first.favorite ? -1 : 1;
    }
    if (appState.sortMode === "oldest") {
        return first.createdAt - second.createdAt;
    }
    if (appState.sortMode === "brightness") {
        return second.brightness - first.brightness;
    }
    if (appState.sortMode === "hue") {
        return first.hue - second.hue;
    }
    if (appState.sortMode === "name") {
        return first.name.localeCompare(second.name);
    }
    return second.createdAt - first.createdAt;
}

/* ---------------- card rendering ---------------- */

function createColorCard(color) {
    const fragment = dom.colorTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".color-card");
    const circle = fragment.querySelector(".color-circle");
    const favoriteBtn = fragment.querySelector(".favoriteBtn");

    card.dataset.colorId = color.id;
    circle.style.background = color.hex;
    fragment.querySelector(".color-name").textContent = color.name;
    fragment.querySelector(".hex").textContent = color.hex;
    fragment.querySelector(".rgb").textContent = color.formats.rgb;
    fragment.querySelector(".hsl").textContent = color.formats.hsl;
    fragment.querySelector(".hsv").textContent = color.formats.hsv;
    fragment.querySelector(".cmyk").textContent = color.formats.cmyk;
    fragment.querySelector(".contrast-ratio").textContent = `Contrast ${color.accessibility.bestRatio}:1`;
    fragment.querySelector(".text-recommendation").textContent = `Text: ${color.accessibility.recommendedText}`;

    const aaBadge = fragment.querySelector(".aa-badge");
    const aaaBadge = fragment.querySelector(".aaa-badge");
    aaBadge.textContent = color.accessibility.aa ? "AA Pass" : "AA Fail";
    aaaBadge.textContent = color.accessibility.aaa ? "AAA Pass" : "AAA Fail";
    aaBadge.classList.add(color.accessibility.aa ? "is-pass" : "is-fail");
    aaaBadge.classList.add(color.accessibility.aaa ? "is-pass" : "is-fail");

    favoriteBtn.classList.toggle("is-favorite", color.favorite);
    favoriteBtn.innerHTML = `<i class="fa-${color.favorite ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`;
    favoriteBtn.addEventListener("click", () => toggleFavorite(color.id));

    // In grid view the whole circle is a quick-copy target.
    circle.style.cursor = "pointer";
    circle.title = `Copy ${color.hex}`;
    fragment.querySelector(".color-swatch").addEventListener("click", async () => {
        await copyToClipboard(color.hex);
        setStatus(`${color.hex} copied`);
        toast(`${color.hex} copied`, "success");
    });

    fragment.querySelector(".deleteBtn").addEventListener("click", () => deleteColor(color.id));
    fragment.querySelectorAll(".copyBtn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            copyColorValue(button, color);
        });
    });

    return fragment;
}

function toggleFavorite(colorId) {
    const color = appState.colors.find((item) => item.id === colorId);
    if (!color) {
        return;
    }
    color.favorite = !color.favorite;
    persistColors();
    renderColorLibrary();
    setStatus(color.favorite ? `${color.hex} favorited` : `${color.hex} removed from favorites`);
}

function deleteColor(colorId) {
    const color = appState.colors.find((item) => item.id === colorId);
    pushUndo();
    appState.colors = appState.colors.filter((item) => item.id !== colorId);
    persistColors();
    renderColorLibrary();
    setStatus(color ? `${color.hex} deleted` : "Color deleted");
    toast("Color deleted — press Ctrl+Z to undo", "info");
}

async function copyColorValue(button, color) {
    const format = button.dataset.copyFormat;
    const value = color.formats[format] || color.hex;
    await copyToClipboard(value);
    showCopiedState(button);
    setStatus(`${value} copied`);
}

async function copyToClipboard(value) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch {
            /* fall through to legacy path */
        }
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
}

function showCopiedState(button) {
    const originalText = button.textContent;
    button.textContent = "Copied";
    button.classList.add("is-copied");
    window.setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("is-copied");
    }, 900);
}

/* ---------------- color helpers ---------------- */

function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const value = parseInt(full, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
