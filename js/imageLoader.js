import { setImage } from "./state.js";
import { getCanvasElement, setStatus } from "./ui.js";

/*
    Image loader
    Change accepted file validation, max canvas size, or drag/drop behavior here.
*/

const MAX_CANVAS_SIDE = 1800;

export function initializeImageLoader({ onImageLoaded } = {}) {
    const input = document.querySelector("#imageInput");
    const dropZone = document.querySelector("#dropZone");
    const uploadNewImageBtn = document.querySelector("#uploadNewImageBtn");

    input?.addEventListener("change", () => handleFile(input.files?.[0], onImageLoaded));
    uploadNewImageBtn?.addEventListener("click", () => input?.click());
    bindDropZone(dropZone, onImageLoaded);
}

/*
    Load an already-prepared data URL (used by the "Try a sample" demo) through
    the same draw + state pipeline a real upload uses.
*/
export async function loadFromDataUrl(dataUrl, fileName, onImageLoaded) {
    try {
        setStatus("Loading sample…");
        const image = await loadImage(dataUrl);
        const canvas = getCanvasElement();
        const previewDataUrl = drawImageToCanvas(image, canvas);

        setImage({ image, fileName, dataUrl: previewDataUrl });
        document.body.classList.add("has-image");
        setStatus(`${fileName} loaded`);
        onImageLoaded?.({ image, canvas });
    } catch (error) {
        console.error(error);
        setStatus("Sample could not be loaded");
    }
}

function bindDropZone(dropZone, onImageLoaded) {
    if (!dropZone) {
        return;
    }

    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add("is-dragging");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("is-dragging");
        });
    });

    dropZone.addEventListener("drop", (event) => {
        handleFile(event.dataTransfer?.files?.[0], onImageLoaded);
    });

    dropZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            document.querySelector("#imageInput")?.click();
        }
    });
}

async function handleFile(file, onImageLoaded) {
    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        setStatus("Please choose an image file");
        return;
    }

    try {
        setStatus("Loading image...");
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImage(dataUrl);
        const canvas = getCanvasElement();
        const previewDataUrl = drawImageToCanvas(image, canvas);

        setImage({
            image,
            fileName: file.name,
            dataUrl: previewDataUrl,
        });

        document.body.classList.add("has-image");
        setStatus(`${file.name} loaded`);
        onImageLoaded?.({ image, canvas });
    } catch (error) {
        console.error(error);
        setStatus("Image could not be loaded");
    }
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsDataURL(file);
    });
}

function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", reject);
        image.src = dataUrl;
    });
}

function drawImageToCanvas(image, canvas) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const scale = Math.min(1, MAX_CANVAS_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.9);
}
