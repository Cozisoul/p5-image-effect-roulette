// The high-resolution width we will process images at.
// This ensures a quality download without being too slow.
const PROCESSING_WIDTH = 1280; 

// --- Global Image Holders ---
// These will hold the high-resolution images for processing and downloading.
let sourceImage;
let processedImage;

// --- UI Element Variables ---
let fileInput;
let processButton;
let downloadButton;

// The maximum width of our on-screen canvas container.
const MAX_CANVAS_WIDTH = 1000;

function setup() {
  const canvas = createCanvas(MAX_CANVAS_WIDTH, 500);
  canvas.parent('canvas-container');
  pixelDensity(1);

  const uiContainer = select('#ui-container');
  
  fileInput = createFileInput(handleFile);
  fileInput.parent(uiContainer);

  processButton = createButton('Process Image');
  processButton.parent(uiContainer);
  processButton.mousePressed(applyRandomEffect);
  processButton.attribute('disabled', '');

  downloadButton = createButton('Download Result');
  downloadButton.parent(uiContainer);
  downloadButton.mousePressed(downloadResult);
  downloadButton.attribute('disabled', '');

  drawInitialCanvas();
}

function drawInitialCanvas() {
  background(51);
  fill(200);
  noStroke();
  textAlign(CENTER, CENTER);
  text('Upload an image to start.', width / 2, height / 2);
}

// This function now just draws the previews.
function drawPreviews() {
  background(51);

  // Calculate the dimensions for the on-screen display boxes
  const displayWidth = (width / 2) - 20;
  const displayHeight = height - 40;

  fill(255);
  noStroke();
  textAlign(LEFT);
  text('Original', 10, 20);
  text('Processed', width / 2 + 10, 20);
  
  stroke(100);
  line(width / 2, 0, width / 2, height);
  
  // Draw the high-res sourceImage into the small display box
  if (sourceImage) {
    image(sourceImage, 10, 40, displayWidth, displayHeight);
  }
  
  // Draw the high-res processedImage into the small display box
  if (processedImage) {
    image(processedImage, width / 2 + 10, 40, displayWidth, displayHeight);
  }
}

function handleFile(file) {
  if (file.type === 'image') {
    loadImage(file.data, img => {
      // --- HIGH-RESOLUTION PREPARATION ---
      // 1. Calculate the aspect ratio from the user's original upload.
      const aspectRatio = img.height / img.width;
      
      // 2. Create our high-resolution source image for processing.
      sourceImage = img;
      sourceImage.resize(PROCESSING_WIDTH, PROCESSING_WIDTH * aspectRatio);

      // --- CANVAS RESIZING FOR PREVIEW ---
      // Resize the on-screen canvas to match the aspect ratio for a nice preview.
      const previewCanvasHeight = MAX_CANVAS_WIDTH * aspectRatio / 2;
      resizeCanvas(MAX_CANVAS_WIDTH, previewCanvasHeight);
      
      // Reset state
      processedImage = null;
      processButton.removeAttribute('disabled');
      downloadButton.attribute('disabled', '');
      
      // Draw the new previews
      drawPreviews();
    });
  }
}

function applyRandomEffect() {
  if (!sourceImage) return;

  const effects = [
    applyDithering,
    applyIntenseVhsGlitch,
    applyPixelSampler
  ];
  
  let randomEffect = random(effects);
  // The effect is run on the high-resolution sourceImage
  processedImage = randomEffect(sourceImage);
  
  downloadButton.removeAttribute('disabled');
  drawPreviews();
}

function downloadResult() {
  // Save the full, high-resolution processed image
  if (processedImage) {
    save(processedImage, 'processed-image.png');
  }
}

// =======================================================
// =========      IMAGE EFFECT FUNCTIONS      ============
// =======================================================
// All these functions now operate on the high-resolution images.

/**
 * EFFECT 1 (UNCHANGED): 1-Bit Dithering
 */
function applyDithering(img) {
  let resultImg = createImage(img.width, img.height);
  const bayerMatrix = [
    [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [13, 5, 15, 7]
  ];
  img.loadPixels();
  resultImg.loadPixels();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let index = (y * img.width + x) * 4;
      let brightness = (img.pixels[index] + img.pixels[index + 1] + img.pixels[index + 2]) / 3;
      let threshold = bayerMatrix[y % 4][x % 4] * 17;
      let newColor = (brightness > threshold) ? 255 : 0;
      resultImg.pixels[index] = newColor;
      resultImg.pixels[index + 1] = newColor;
      resultImg.pixels[index + 2] = newColor;
      resultImg.pixels[index + 3] = 255;
    }
  }
  resultImg.updatePixels();
  return resultImg;
}

/**
 * EFFECT 2 (INTENSIFIED): VHS Glitch
 */
function applyIntenseVhsGlitch(img) {
  let resultImg = createImage(img.width, img.height);
  
  const offset = floor(random(5, 15));
  img.loadPixels();
  resultImg.loadPixels();
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let i = (y * img.width + x) * 4;
      let r_x = constrain(x - offset, 0, img.width - 1);
      let r_i = (y * img.width + r_x) * 4;
      let r = img.pixels[r_i];
      let g = img.pixels[i + 1];
      let b_x = constrain(x + offset, 0, img.width - 1);
      let b_i = (y * img.width + b_x) * 4;
      let b = img.pixels[b_i + 2];
      resultImg.pixels[i] = r;
      resultImg.pixels[i + 1] = g;
      resultImg.pixels[i + 2] = b;
      resultImg.pixels[i + 3] = 255;
    }
  }
  resultImg.updatePixels();
  
  const numBands = floor(random(3, 8));
  for (let i = 0; i < numBands; i++) {
    const bandY = random(resultImg.height);
    const bandHeight = floor(random(5, 50));
    const shiftAmount = random(-50, 50);
    let slice = resultImg.get(0, bandY, resultImg.width, bandHeight);
    resultImg.copy(slice, 0, 0, slice.width, slice.height, shiftAmount, bandY, slice.width, slice.height);
  }

  let pg = createGraphics(resultImg.width, resultImg.height);
  pg.image(resultImg, 0, 0);
  pg.stroke(0, 0, 0, 120);
  pg.strokeWeight(1.5);
  for (let y = 0; y < pg.height; y += 3) {
    pg.line(0, y, pg.width, y);
  }
  
  return pg;
}

/**
 * EFFECT 3: Pixel Sampler
 */
function applyPixelSampler(img) {
  let resultImg = createGraphics(img.width, img.height);
  resultImg.background(0);

  // We can use more chunks now that we're on a high-res image
  const numChunks = 10000;
  const minSize = 5;
  const maxSize = 50; // Larger max size for more variation

  for (let i = 0; i < numChunks; i++) {
    const chunkSize = floor(random(minSize, maxSize));
    const sx = floor(random(img.width - chunkSize));
    const sy = floor(random(img.height - chunkSize));
    const dx = floor(random(resultImg.width - chunkSize));
    const dy = floor(random(resultImg.height - chunkSize));
    const chunk = img.get(sx, sy, chunkSize, chunkSize);
    resultImg.image(chunk, dx, dy);
  }

  return resultImg;
}