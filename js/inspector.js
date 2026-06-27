import { appState } from "./state.js";
import { normalizeColor } from "./colorConversions.js";
import { isHandActive } from "./canvasViewport.js";
import {
    addColorFromRgb,
    getCanvasElement,
    getMagnifierCanvasElement,
    hideInspectorReadout,
    setStatus,
    updateInspectorReadout,
} from "./ui.js";

/*
    Inspector / eyedropper
    Hover previews the pixel under the cursor; click saves it to the library.
    Active only when the canvas "pick" tool is selected (see canvasViewport.js).
*/

const MAGNIFIER_ZOOM = 15;
const MAGNIFIER_SIZE = 160;
const SAMPLE_SIZE = Math.ceil(MAGNIFIER_SIZE / MAGNIFIER_ZOOM);

let lastHoverRgb = null;

export function initializeInspector() {
    const canvas = getCanvasElement();
    if (!canvas) {
        return;
    }

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("click", handleCanvasClick);

    document.querySelector("#lockColorBtn")?.addEventListener("click", saveCurrentColor);
    document.querySelector("#readoutSaveBtn")?.addEventListener("click", saveCurrentColor);
}

function handlePointerMove(event) {
    if (!canInspect()) {
        return;
    }

    const canvas = getCanvasElement();
    const point = getCanvasPoint(event, canvas);
    const rgb = getPixelColor(canvas, point);
    lastHoverRgb = rgb;
    const color = normalizeColor(rgb);

    updateInspectorReadout(color);
    drawMagnifier(canvas, point, event);
}

function handlePointerLeave() {
    hideMagnifier();
    hideInspectorReadout();
}

function handleCanvasClick(event) {
    if (!canInspect()) {
        if (isHandActive()) {
            return;
        }
        setStatus(appState.image ? "Switch to Inspector mode to pick colors" : "Upload an image first");
        return;
    }

    const canvas = getCanvasElement();
    const point = getCanvasPoint(event, canvas);
    addColorFromRgb(getPixelColor(canvas, point), "Picked");
}

function saveCurrentColor() {
    if (!appState.image) {
        setStatus("Upload an image first");
        return;
    }
    if (!lastHoverRgb) {
        setStatus("Hover over the image, then save");
        return;
    }
    addColorFromRgb(lastHoverRgb, "Picked");
}

function canInspect() {
    return Boolean(appState.image) && appState.mode === "inspector" && !isHandActive();
}

function getCanvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) * scaleX))),
        y: Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) * scaleY))),
    };
}

function getPixelColor(canvas, point) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const pixel = context.getImageData(point.x, point.y, 1, 1).data;
    return { r: pixel[0], g: pixel[1], b: pixel[2] };
}

function drawMagnifier(sourceCanvas, point, event) {
    const magnifier = getMagnifierCanvasElement();
    const context = magnifier.getContext("2d");
    const sourceX = Math.max(0, Math.min(sourceCanvas.width - SAMPLE_SIZE, point.x - Math.floor(SAMPLE_SIZE / 2)));
    const sourceY = Math.max(0, Math.min(sourceCanvas.height - SAMPLE_SIZE, point.y - Math.floor(SAMPLE_SIZE / 2)));

    magnifier.width = MAGNIFIER_SIZE;
    magnifier.height = MAGNIFIER_SIZE;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
    context.drawImage(sourceCanvas, sourceX, sourceY, SAMPLE_SIZE, SAMPLE_SIZE, 0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
    drawCrosshair(context);
    positionMagnifier(magnifier, event);
}

function drawCrosshair(context) {
    const center = MAGNIFIER_SIZE / 2;

    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(center, 0);
    context.lineTo(center, MAGNIFIER_SIZE);
    context.moveTo(0, center);
    context.lineTo(MAGNIFIER_SIZE, center);
    context.stroke();

    context.strokeStyle = "rgba(0, 0, 0, 0.5)";
    context.strokeRect(center - 8, center - 8, 16, 16);
}

function positionMagnifier(magnifier, event) {
    const wrapper = magnifier.parentElement.getBoundingClientRect();
    const x = event.clientX - wrapper.left + 22;
    const y = event.clientY - wrapper.top + 22;

    magnifier.style.display = "block";
    magnifier.style.left = `${Math.min(x, wrapper.width - MAGNIFIER_SIZE - 8)}px`;
    magnifier.style.top = `${Math.min(y, wrapper.height - MAGNIFIER_SIZE - 8)}px`;
}

function hideMagnifier() {
    const magnifier = getMagnifierCanvasElement();
    if (magnifier) {
        magnifier.style.display = "none";
    }
}
