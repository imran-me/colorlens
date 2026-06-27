import { initializeImageLoader, loadFromDataUrl } from "./imageLoader.js";
import { initializeInspector } from "./inspector.js";
import { extractPalette } from "./paletteExtractor.js";
import { appState } from "./state.js";
import { createDemoImageDataUrl } from "./demoImage.js";
import { addColorsFromPalette, getPaletteCount, setStatus, toast } from "./ui.js";
import { initializeUI } from "./ui.js";

/*
    App entry point
    Wires feature modules together. Heavy logic stays inside each module.
*/

initializeUI();
initializeImageLoader({ onImageLoaded: handleImageLoaded });
initializeInspector();
bindDemo();

async function handleImageLoaded({ image, canvas }) {
    try {
        setStatus("Extracting palette…");
        const colors = await extractPalette({
            image,
            canvas,
            count: getPaletteCount(),
        });

        addColorsFromPalette(colors);
    } catch (error) {
        console.error(error);
        setStatus("Palette extraction failed");
        toast("Palette extraction failed", "error");
    }
}

function bindDemo() {
    document.querySelector("#demoBtn")?.addEventListener("click", async () => {
        const dataUrl = createDemoImageDataUrl();
        await loadFromDataUrl(dataUrl, "colorlens-sample.jpg", handleImageLoaded);
    });
}

// Re-extract when the palette size changes and an image is already loaded.
document.querySelector("#paletteCount")?.addEventListener("change", async () => {
    if (!appState.image) {
        return;
    }
    await handleImageLoaded({
        image: appState.image,
        canvas: document.querySelector("#imageCanvas"),
    });
});
