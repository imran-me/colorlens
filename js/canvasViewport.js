import { appState } from "./state.js";

/*
    Canvas viewport
    Owns zoom + pan of the image stage and a "hand" (pan) toggle. Picking is
    driven by the app mode (Palette / Inspector) in inspector.js; when the hand
    tool is active, panning takes over and picking is suspended.
    Pixel sampling still works because it reads the canvas's live bounding rect.
*/

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

let zoom = 1;
let panX = 0;
let panY = 0;
let handActive = false;

let els = {};
let drag = null;

export function isHandActive() {
    return handActive;
}

export function initializeCanvasViewport() {
    els = {
        wrapper: document.querySelector(".canvas-wrapper"),
        stage: document.querySelector("#canvasStage"),
        tools: document.querySelector("#canvasTools"),
        zoomIn: document.querySelector("#zoomInBtn"),
        zoomOut: document.querySelector("#zoomOutBtn"),
        zoomReset: document.querySelector("#zoomResetBtn"),
        zoomLevel: document.querySelector("#zoomLevel"),
        panBtn: document.querySelector("#panToolBtn"),
    };

    if (!els.wrapper || !els.stage) {
        return;
    }

    els.zoomIn?.addEventListener("click", () => zoomByCenter(1.25));
    els.zoomOut?.addEventListener("click", () => zoomByCenter(0.8));
    els.zoomReset?.addEventListener("click", resetView);
    els.panBtn?.addEventListener("click", toggleHand);

    els.wrapper.addEventListener("wheel", handleWheel, { passive: false });
    els.stage.addEventListener("pointerdown", handlePanStart);
    window.addEventListener("pointermove", handlePanMove);
    window.addEventListener("pointerup", handlePanEnd);

    refreshCursor();
    applyTransform();
}

/* Reveal tools and reset the view whenever a fresh image is drawn. */
export function handleImageReady() {
    els.tools?.removeAttribute("hidden");
    handActive = false;
    els.panBtn?.classList.remove("is-active");
    els.panBtn?.setAttribute("aria-pressed", "false");
    resetView();
    refreshCursor();
}

/* Sync the wrapper cursor with the current mode + hand state. */
export function refreshCursor() {
    if (!els.wrapper) {
        return;
    }
    const tool = handActive ? "pan" : (appState.mode === "inspector" ? "pick" : "view");
    els.wrapper.setAttribute("data-tool", tool);
}

function toggleHand() {
    handActive = !handActive;
    els.panBtn?.classList.toggle("is-active", handActive);
    els.panBtn?.setAttribute("aria-pressed", String(handActive));
    refreshCursor();
}

function zoomByCenter(factor) {
    const rect = els.wrapper.getBoundingClientRect();
    applyZoom(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function handleWheel(event) {
    if (!document.body.classList.contains("has-image")) {
        return;
    }
    event.preventDefault();
    applyZoom(event.deltaY < 0 ? 1.12 : 0.89, event.clientX, event.clientY);
}

function applyZoom(factor, clientX, clientY) {
    const previous = zoom;
    zoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const ratio = zoom / previous;

    if (zoom <= MIN_ZOOM) {
        panX = 0;
        panY = 0;
    } else {
        const rect = els.stage.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        panX += (clientX - centerX) * (1 - ratio);
        panY += (clientY - centerY) * (1 - ratio);
    }

    applyTransform();
}

function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
}

function applyTransform() {
    if (els.stage) {
        els.stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
    if (els.zoomLevel) {
        els.zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
    }
}

function handlePanStart(event) {
    if (!handActive || !document.body.classList.contains("has-image")) {
        return;
    }
    drag = { startX: event.clientX, startY: event.clientY, baseX: panX, baseY: panY };
    els.wrapper?.classList.add("is-panning");
    els.stage.setPointerCapture?.(event.pointerId);
}

function handlePanMove(event) {
    if (!drag) {
        return;
    }
    panX = drag.baseX + (event.clientX - drag.startX);
    panY = drag.baseY + (event.clientY - drag.startY);
    applyTransform();
}

function handlePanEnd() {
    if (!drag) {
        return;
    }
    drag = null;
    els.wrapper?.classList.remove("is-panning");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
