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

function resizeCanvas() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.7;

    ctx.drawImage(tempCanvas, 0, 0);
    redrawCanvas();
}


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

canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    e.preventDefault();
    const { x, y } = getPosition(e);
    startX = x;
    startY = y;
    currentPath = [{ x, y }];
    ctx.beginPath();
    ctx.moveTo(x, y);
    redoStack = [];
});

canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.stopPropagation();
    const { x, y } = getPosition(e);

    ctx.strokeStyle = color;
    ctx.lineWidth = penSizeSlider.value;

    if (eraserMode) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineTo(x, y);
        ctx.stroke();
        currentPath.push({ x, y });
    } else if (shapeMode === 'freehand') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineTo(x, y);
        ctx.stroke();
        currentPath.push({ x, y });
    } else {
        redrawCanvas();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        if (shapeMode === 'rectangle') {
            ctx.strokeRect(startX, startY, x - startX, y - startY);
            ctx.beginPath();
        } else if (shapeMode === 'circle') {
            ctx.arc(startX, startY, Math.hypot(x - startX, y - startY), 0, Math.PI * 2);
            ctx.stroke();
        } else if (shapeMode === 'line') {
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
    lastX = x;
    lastY = y;
});

canvas.addEventListener('pointerup', (e) => {
    drawing = false;
    ctx.globalCompositeOperation = 'source-over';

    if (eraserMode) {
        historyStack.push({
            type: 'eraser',
            path: currentPath,
            size: penSizeSlider.value,
        });
        redoStack = [];
        return;
    }

    if (shapeMode === 'rectangle') {
        historyStack.push({
            type: 'rectangle',
            startX, startY,
            width: lastX - startX,
            height: lastY - startY,
            color, size: penSizeSlider.value
        });
    } else if (shapeMode === 'circle') {
        historyStack.push({
            type: 'circle',
            startX, startY,
            radius: Math.hypot(lastX - startX, lastY - startY),
            color, size: penSizeSlider.value
        });
    } else if (shapeMode === 'line') {
        historyStack.push({
            type: 'line',
            startX, startY,
            endX: lastX, endY: lastY,
            color, size: penSizeSlider.value
        });
    } else {
        historyStack.push({
            type: 'freehand',
            path: currentPath,
            color, size: penSizeSlider.value
        });
    }

    redrawCanvas();
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

colorPicker.addEventListener('input', (e) => color = e.target.value);
shapeSelector.addEventListener('change', (e) => shapeMode = e.target.value);

eraserButton.addEventListener('click', () => {
    eraserMode = !eraserMode;
    eraserButton.classList.toggle('active', eraserMode);
});
penSizeSlider.addEventListener('input', (e) => penSizeValue.textContent = e.target.value);

saveButton.addEventListener('click', () => {
    const filename = filenameInput.value || 'drawing';
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL();
    link.click();
});
