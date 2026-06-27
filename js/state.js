/*
    ColorLens shared state
    Change default mode, stored fields, or app-wide data shape here.
    UI modules import this object so every feature reads the same source of truth.
*/

export const appState = {
    mode: "palette",
    image: null,
    imageFileName: "",
    imageDataUrl: "",
    colors: [],
    searchTerm: "",
    sortMode: "newest",
    view: "list",
};

export function setMode(mode) {
    appState.mode = mode;
}

export function setImage(payload) {
    appState.image = payload.image;
    appState.imageFileName = payload.fileName;
    appState.imageDataUrl = payload.dataUrl;
}

export function clearImage() {
    appState.image = null;
    appState.imageFileName = "";
    appState.imageDataUrl = "";
}
