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
const rulerButton = document.getElementById('rulerButton');
const eraserButton = document.getElementById('eraserButton');
const penSizeSlider = document.getElementById('penSize');
const penSizeValue = document.getElementById('penSizeValue');


let drawing = false;
let currentPath = [];
let historyStack = [];
let redoStack = [];
let color = '#000000';
let shapeMode = 'freehand';
let rulerMode = false;
let eraserMode = false;
let startX, startY, lastX, lastY;

canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.7;

function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return { x, y };
}

function setCanvasBackground(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fills entire canvas
    ctx.fillStyle = color; // Reset fill color for future drawings
}

window.onload = () => setCanvasBackground('#ffffff');

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyStack.forEach(item => {
        ctx.strokeStyle = item.color ||'#000';
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
        } else if (item.type === 'line') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.moveTo(item.startX, item.startY);
            ctx.lineTo(item.endX, item.endY);
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
    e.preventDefault();
    const { x, y } = getPosition(e);

    ctx.strokeStyle = color;
    ctx.lineWidth = penSizeSlider.value;

   if (eraserMode) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineTo(x, y);
    ctx.stroke();
    currentPath.push({ x, y });

    } else if (rulerMode && shapeMode === 'freehand') {
        ctx.globalCompositeOperation = 'source-over';
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
        } else if (shapeMode === 'circle') {
            ctx.arc(startX, startY, Math.hypot(x - startX, y - startY), 0, Math.PI * 2);
        } else if (shapeMode === 'line') {
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    lastX = x;
    lastY = y;
});

canvas.addEventListener('pointerup', (e) => {
    drawing = false;
    e.preventDefault();
       ctx.globalCompositeOperation = 'source-over'; // Reset to normal drawing mode
       if (eraserMode) {
        historyStack.push({
            type: 'eraser',
            path: currentPath,
            size: penSizeSlider.value,
        });
        redoStack = [];
        return;
    }

    const { x, y } = getPosition(e);
       
    if (shapeMode === 'rectangle') {
        historyStack.push({
            type: 'rectangle',
            startX, startY,
            width: lastX - startX,
            height: lastY - startY,
            color, size: penSizeSlider.value
        });
    } else if (shapeMode === 'circle') {
        const radius = Math.hypot(lastX - startX, lastY - startY);
        historyStack.push({
            type: 'circle',
            startX, startY, radius,
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
    
    requestAnimationFrame(redrawCanvas);
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

saveButton.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCtx.fillStyle = '#ffffff'; 
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.href = tempCanvas.toDataURL('image/png'); 
    link.download = (filenameInput.value.trim() || 'sketch') + '.png';
    link.click();
});

clearButton.addEventListener('click', () => {
    setCanvasBackground('#ffffff'); 
    historyStack = [];
    redoStack = [];
    redrawCanvas(); 
});

colorPicker.addEventListener('input', (e) => {
    color = e.target.value;
    ctx.strokeStyle = color;
});

shapeSelector.addEventListener('change', (e) => {
    shapeMode = e.target.value;
});

rulerButton.addEventListener('click', () => {
    rulerMode = !rulerMode;
    rulerButton.style.backgroundColor = rulerMode ? '#ff7f00' : '#4CAF50';
});

eraserButton.addEventListener('click', () => {
    eraserMode = !eraserMode;
    eraserButton.style.backgroundColor = eraserMode ? '#ff0000' : '#4CAF50';
});

penSizeSlider.addEventListener('input', (e) => {
    penSizeValue.textContent = e.target.value;
    ctx.lineWidth = e.target.value;
});