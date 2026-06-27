/*
    Demo image generator
    Produces a vibrant, deterministic sample image on a canvas so first-time
    users can try ColorLens instantly without uploading anything. Offline-safe.
*/

export function createDemoImageDataUrl() {
    const width = 900;
    const height = 600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Sunset-style diagonal gradient backdrop.
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0f2027");
    gradient.addColorStop(0.35, "#2c5364");
    gradient.addColorStop(0.7, "#ff7e5f");
    gradient.addColorStop(1, "#feb47b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Soft glowing sun.
    const sun = ctx.createRadialGradient(width * 0.7, height * 0.32, 10, width * 0.7, height * 0.32, 180);
    sun.addColorStop(0, "rgba(255, 241, 178, 0.95)");
    sun.addColorStop(1, "rgba(255, 241, 178, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(width * 0.7, height * 0.32, 180, 0, Math.PI * 2);
    ctx.fill();

    // Layered hills in distinct hues for a rich extracted palette.
    drawHill(ctx, width, height, 0.62, "#3a1c71");
    drawHill(ctx, width, height, 0.74, "#5f0f40");
    drawHill(ctx, width, height, 0.86, "#0b486b");

    // A few accent shapes to add saturated swatches.
    paintBlob(ctx, width * 0.16, height * 0.24, 46, "#34e89e");
    paintBlob(ctx, width * 0.32, height * 0.18, 30, "#f9d423");
    paintBlob(ctx, width * 0.5, height * 0.5, 38, "#ff4e50");

    return canvas.toDataURL("image/jpeg", 0.92);
}

function drawHill(ctx, width, height, startRatio, color) {
    const baseY = height * startRatio;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, baseY);
    for (let x = 0; x <= width; x += 30) {
        const y = baseY + Math.sin((x / width) * Math.PI * 2 + startRatio * 6) * 26;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
}

function paintBlob(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}
