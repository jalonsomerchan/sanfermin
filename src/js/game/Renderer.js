export class Renderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.width = config.width;
    this.height = config.height;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

    this.canvas.width = Math.round(this.width * pixelRatio);
    this.canvas.height = Math.round(this.height * pixelRatio);
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(image, offsetX, speedScale = 1) {
    this.context.save();
    this.context.fillStyle = '#8fbfe8';
    this.context.fillRect(0, 0, this.width, this.height);

    if (image?.complete && image.naturalWidth > 0) {
      const scale = this.height / image.naturalHeight;
      const tileWidth = image.naturalWidth * scale;
      const startX = -((offsetX * speedScale) % tileWidth);

      for (let x = startX - tileWidth; x < this.width + tileWidth; x += tileWidth) {
        this.context.drawImage(image, x, 0, tileWidth, this.height);
      }
    }

    this.context.restore();
  }

  drawGround(groundY) {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = 'rgba(82, 45, 28, 0.78)';
    ctx.fillRect(0, groundY, this.width, this.height - groundY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, groundY, this.width, 4);
    ctx.restore();
  }

  drawSprite(
    image,
    { x, y, width, height, frame = 0, frames = 1, rows = 1, alpha = 1, rotation = 0 },
  ) {
    if (!image?.complete || image.naturalWidth === 0) return false;

    const cols = Math.ceil(frames / rows);
    const frameWidth = image.naturalWidth / cols;
    const frameHeight = image.naturalHeight / rows;
    const sx = (frame % cols) * frameWidth;
    const sy = Math.floor(frame / cols) * frameHeight;

    this.context.save();
    this.context.globalAlpha = alpha;
    if (rotation !== 0) {
      this.context.translate(x + width / 2, y + height / 2);
      this.context.rotate(rotation);
      this.context.drawImage(
        image,
        sx,
        sy,
        frameWidth,
        frameHeight,
        -width / 2,
        -height / 2,
        width,
        height,
      );
    } else {
      this.context.drawImage(image, sx, sy, frameWidth, frameHeight, x, y, width, height);
    }
    this.context.restore();

    return true;
  }

  drawFallbackRect({ x, y, width, height, color }) {
    this.context.save();
    this.context.fillStyle = color;
    this.context.fillRect(x, y, width, height);
    this.context.restore();
  }

  drawShadow({ x, y, width, alpha = 0.22 }) {
    this.context.save();
    this.context.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    this.context.beginPath();
    this.context.ellipse(x, y, width, 13, 0, 0, Math.PI * 2);
    this.context.fill();
    this.context.restore();
  }

  drawPanelText(text, x, y, size = 28) {
    this.context.save();
    this.context.fillStyle = '#fff8e7';
    this.context.strokeStyle = 'rgba(80, 17, 20, 0.8)';
    this.context.lineWidth = 6;
    this.context.font = `900 ${size}px ui-sans-serif, system-ui, sans-serif`;
    this.context.textAlign = 'center';
    this.context.strokeText(text, x, y);
    this.context.fillText(text, x, y);
    this.context.restore();
  }
}
