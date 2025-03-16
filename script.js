document.body.style.overscrollBehavior = 'contain';

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const clearButton = document.getElementById('clearButton');
const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const saveButton = document.getElementById('saveButton');
const filenameInput = document.getElementById('filenameInput');
const colorPicker = document.getElementById('colorPicker');
const shapeSelector = document.getElementById('shapeSelector');
const eraserButton = document.getElementById('eraserButton');
const penSizeSlider = document.getElementById('penSize');
const penSizeValue = document.getElementById('penSizeValue');

let drawing = false;
let currentPath = [];
let historyStack = [];
let redoStack = [];
let color = '#000000';
let shapeMode = 'freehand';
let eraserMode = false;
let startX, startY, lastX, lastY;
let scale = 1; // Initial zoom level
let startDistance = 0;

function resizeCanvas() {
    // Create a temporary canvas to save the current drawing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    // Resize the actual canvas
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.7;

    // Restore the drawing
    ctx.drawImage(tempCanvas, 0, 0);

    // Ensure redrawCanvas exists before calling it
    if (typeof redrawCanvas === "function") {
        redrawCanvas();
    }
}

// Attach event listeners outside of the function
window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);


function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    }
    return { x, y };
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyStack.forEach(item => {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.size;
        ctx.beginPath();

        if (item.type === 'freehand' || item.type === 'eraser') {
            ctx.globalCompositeOperation = item.type === 'eraser' ? 'destination-out' : 'source-over';
            ctx.moveTo(item.path[0].x, item.path[0].y);
            item.path.forEach(point => ctx.lineTo(point.x, point.y));
        } else if (item.type === 'rectangle') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeRect(item.startX, item.startY, item.width, item.height);
        } else if (item.type === 'circle') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.arc(item.startX, item.startY, item.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (item.type === 'line') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.moveTo(item.startX, item.startY);
            ctx.lineTo(item.endX, item.endY);
            ctx.stroke();
        }

        ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';
}

canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    e.preventDefault();  // Stop scrolling
    e.stopPropagation(); // Stop event from bubbling

    const { x, y } = getPosition(e);
    startX = x;
    startY = y;
    currentPath = [{ x, y }];
    ctx.beginPath();
    ctx.moveTo(x, y);
    redoStack = [];

    if (e.touches.length === 2) { // Detect two-finger touch
        startDistance = getDistance(e.touches[0], e.touches[1]);
    }
});

canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getPosition(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = penSizeSlider.value;

    if (eraserMode) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineTo(x, y);
        ctx.stroke();
        currentPath.push({ x, y });
    } else if (shapeMode === "freehand") {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineTo(x, y);
        ctx.stroke();
        currentPath.push({ x, y });
    } else {
        redrawCanvas();
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath();
        if (shapeMode === "rectangle") {
            ctx.strokeRect(startX, startY, x - startX, y - startY);
        } else if (shapeMode === "circle") {
            ctx.arc(startX, startY, Math.hypot(x - startX, y - startY), 0, Math.PI * 2);
            ctx.stroke();
        } else if (shapeMode === "line") {
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
    lastX = x;
    lastY = y;
}, { passive: false });

canvas.addEventListener("pointerup", (e) => {
    drawing = false;
    e.preventDefault();
    e.stopPropagation();

    ctx.globalCompositeOperation = "source-over";

    if (eraserMode) {
        historyStack.push({ type: "eraser", path: currentPath, size: penSizeSlider.value });
        redoStack = [];
        return;
    }

    if (shapeMode === "rectangle") {
        historyStack.push({ type: "rectangle", startX, startY, width: lastX - startX, height: lastY - startY, color, size: penSizeSlider.value });
    } else if (shapeMode === "circle") {
        historyStack.push({ type: "circle", startX, startY, radius: Math.hypot(lastX - startX, lastY - startY), color, size: penSizeSlider.value });
    } else if (shapeMode === "line") {
        historyStack.push({ type: "line", startX, startY, endX: lastX, endY: lastY, color, size: penSizeSlider.value });
    } else {
        historyStack.push({ type: "freehand", path: currentPath, color, size: penSizeSlider.value });
    }

    redrawCanvas();
}, { passive: false });

function triggerColorPicker() {
    setTimeout(() => {
        colorPicker.click();
    }, 100);
}
openColorPicker.addEventListener("click", triggerColorPicker);
openColorPicker.addEventListener("touchstart", triggerColorPicker);  // Added for mobile

colorPicker.addEventListener("input", (e) => {
    color = e.target.value;
    openColorPicker.style.backgroundColor = color;
});

function getDistance(touch1, touch2) {
    let dx = touch1.clientX - touch2.clientX;
    let dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function applyTransform() {
    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = "center";
}

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) { // Detect two-finger touch
        startDistance = getDistance(e.touches[0], e.touches[1]);
    }
});

canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) { // If two fingers are touching
        e.preventDefault(); // Prevent default zoom behavior
        let newDistance = getDistance(e.touches[0], e.touches[1]);
        let zoomFactor = newDistance / startDistance;

        scale *= zoomFactor;
        scale = Math.max(0.5, Math.min(scale, 3)); // Limit zoom between 0.5x and 3x
        applyTransform();
        startDistance = newDistance; // Update for smooth scaling
    }
});

undoButton.addEventListener('click', () => {
    if (historyStack.length > 0) {
        redoStack.push(historyStack.pop());
        redrawCanvas();
    }
});

redoButton.addEventListener('click', () => {
    if (redoStack.length > 0) {
        historyStack.push(redoStack.pop());
        redrawCanvas();
    }
});

clearButton.addEventListener('click', () => {
    historyStack = [];
    redoStack = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById("openColorPicker").addEventListener("click", () => {
    setTimeout(() => {
        document.getElementById("colorPicker").click();
    }, 100);  // Small delay to allow click event processing
});

document.getElementById("colorPicker").addEventListener("input", (e) => {
    color = e.target.value;
    document.getElementById("openColorPicker").style.backgroundColor = color;
});

shapeSelector.addEventListener('change', (e) => shapeMode = e.target.value);

eraserButton.addEventListener('click', () => {
    eraserMode = !eraserMode;
    eraserButton.classList.toggle('active', eraserMode);
});
penSizeSlider.addEventListener('input', (e) => penSizeValue.textContent = e.target.value);

function saveCanvas() {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Set the same size as the original canvas
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Fill with a white background
    tempCtx.fillStyle = "#ffffff";  // White background
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Copy the original drawing onto the new canvas
    tempCtx.drawImage(canvas, 0, 0);
    tempCanvas.toBlob((blob) => {
        const filename = document.getElementById("filenameInput").value || "drawing.png";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, "image/png");
}

document.getElementById("saveButton").addEventListener("click", saveCanvas);
