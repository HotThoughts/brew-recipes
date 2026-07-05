import * as THREE from 'three';

/**
 * AsciiRenderer — renders a Three.js scene to a tiny offscreen render target,
 * samples luminance per character cell, and types Space Mono glyphs onto a 2D
 * canvas in Deep Violet ink on the existing lavender paper field.
 *
 * The retro feel comes from the character grid itself (typed, indexed, archival),
 * never from CRT green, scanlines, or black backgrounds. Honey Gold never appears.
 */

const RAMP = ' ·:;+=oxX#@';
const RAMP_LEN = RAMP.length;

export type AsciiScene = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  /** Advance the scene by `dt` seconds. */
  update: (dt: number, elapsed: number) => void;
  /** Optional pointer parallax in normalized device coords [-1, 1]. */
  onPointer?: (nx: number, ny: number) => void;
  /** Clean up GPU resources. */
  dispose: () => void;
};

export type AsciiRendererOptions = {
  /** Target character columns. */
  cols: number;
  /** Target character rows. */
  rows: number;
  /** Font size in px for the typed glyphs. */
  fontSize?: number;
  /** Frames per second cap. */
  fps?: number;
  /** CSS var for ink color (glyphs). Defaults to --ink. */
  inkVar?: string;
  /** CSS var for paper color (background). Defaults to --paper. */
  paperVar?: string;
  /** When true, don't set inline canvas style dimensions — let CSS size it. */
  fillContainer?: boolean;
  /** When true, draw only glyphs and leave the page background visible. */
  transparentBackground?: boolean;
};

const SPACE_MONO = "'Space Mono', 'SFMono-Regular', Consolas, monospace";

function readCssColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

export class AsciiRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gl: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private pixelBuffer: Uint8Array;
  private scene: AsciiScene;
  private cols: number;
  private rows: number;
  private fontSize: number;
  private cellW: number;
  private cellH: number;
  private frameMs: number;
  private ink: string;
  private paper: string;
  private transparentBackground: boolean;
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private running = false;
  private reduced = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, scene: AsciiScene, opts: AsciiRendererOptions) {
    this.canvas = canvas;
    this.scene = scene;
    this.cols = opts.cols;
    this.rows = opts.rows;
    this.fontSize = opts.fontSize ?? 12;
    this.frameMs = 1000 / (opts.fps ?? 24);
    this.ink = readCssColor(opts.inkVar ?? '--ink', '#2a1f3d');
    this.paper = readCssColor(opts.paperVar ?? '--paper', '#e8e4f0');
    this.transparentBackground = opts.transparentBackground ?? false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.cols * this.fontSize * dpr;
    this.canvas.height = this.rows * this.fontSize * dpr;
    if (!opts.fillContainer) {
      this.canvas.style.width = `${this.cols * this.fontSize}px`;
      this.canvas.style.height = `${this.rows * this.fontSize}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.ctx.scale(dpr, dpr);
    this.ctx.font = `${this.fontSize}px ${SPACE_MONO}`;
    this.ctx.textBaseline = 'top';
    // Use a square-ish advance so square character grids fill square canvases.
    // The glyph itself remains the browser's monospace shape.
    this.cellW = this.fontSize;
    this.cellH = this.fontSize;

    this.gl = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.gl.setPixelRatio(1);
    this.gl.setSize(this.cols, this.rows);

    // Perspective cameras hardcode aspect=1 in scene builders; correct
    // it to the actual render-target shape so geometry isn't distorted.
    if (this.scene.camera.type === 'PerspectiveCamera') {
      (this.scene.camera as THREE.PerspectiveCamera).aspect = this.cols / this.rows;
      (this.scene.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    this.target = new THREE.WebGLRenderTarget(this.cols, this.rows);
    this.pixelBuffer = new Uint8Array(this.cols * this.rows * 4);

    this.reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.drawBackground();
    this.renderOnce();
  }

  private drawBackground() {
    this.ctx.clearRect(0, 0, this.cols * this.cellW, this.rows * this.cellH);
  }

  private renderOnce() {
    this.scene.update(0, this.elapsed);
    this.gl.setRenderTarget(this.target);
    this.gl.clear();
    this.gl.render(this.scene.scene, this.scene.camera);
    this.gl.readRenderTargetPixels(this.target, 0, 0, this.cols, this.rows, this.pixelBuffer);
    this.gl.setRenderTarget(null);
    this.paint();
  }

  private paint() {
    this.ctx.clearRect(0, 0, this.cols * this.cellW, this.rows * this.cellH);
    if (!this.transparentBackground) {
      this.ctx.fillStyle = this.paper;
      this.ctx.fillRect(0, 0, this.cols * this.cellW, this.rows * this.cellH);
    }
    this.ctx.fillStyle = this.ink;
    // readRenderTargetPixels is bottom-up; flip rows.
    for (let y = 0; y < this.rows; y++) {
      const srcY = this.rows - 1 - y;
      for (let x = 0; x < this.cols; x++) {
        const i = (srcY * this.cols + x) * 4;
        const r = this.pixelBuffer[i];
        const g = this.pixelBuffer[i + 1];
        const b = this.pixelBuffer[i + 2];
        const a = this.pixelBuffer[i + 3];
        if (a < 8) continue;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (lum < 0.04) continue;
        const idx = Math.min(RAMP_LEN - 1, Math.floor(lum * RAMP_LEN));
        this.ctx.fillText(RAMP[idx], x * this.cellW, y * this.cellH);
      }
    }
  }

  private loop = (now: number) => {
    if (!this.running || this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = now - this.last;
    if (dt < this.frameMs) return;
    this.last = now - (dt % this.frameMs);
    this.elapsed += dt / 1000;
    this.scene.update(dt / 1000, this.elapsed);
    this.gl.setRenderTarget(this.target);
    this.gl.clear();
    this.gl.render(this.scene.scene, this.scene.camera);
    this.gl.readRenderTargetPixels(this.target, 0, 0, this.cols, this.rows, this.pixelBuffer);
    this.gl.setRenderTarget(null);
    this.paint();
  };

  start() {
    if (this.disposed || this.running) return;
    if (this.reduced) {
      // Single static frame, no loop.
      this.renderOnce();
      return;
    }
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  pointer(nx: number, ny: number) {
    this.scene.onPointer?.(nx, ny);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.scene.dispose();
    this.target.dispose();
    this.gl.dispose();
  }
}
