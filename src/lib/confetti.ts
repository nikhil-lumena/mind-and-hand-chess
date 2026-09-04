/**
 * Dependency-free canvas confetti. One engine per page, lazily attached to a
 * full-screen canvas; the RAF loop only runs while particles exist.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
  maxLife: number;
  shape: 'rect' | 'circle' | 'star';
  wobble: number;
}

export interface BurstOptions {
  /** 0..1 fractions of the viewport. Defaults to center. */
  x?: number;
  y?: number;
  count?: number;
  colors?: string[];
  /** Degrees. 360 = all directions. */
  spread?: number;
  /** Degrees, 0 = right, -90 = up. */
  angle?: number;
  power?: number;
}

const DEFAULT_COLORS = ['#ffc53d', '#3ddc84', '#4cc9f0', '#b48cff', '#ff5d6c', '#fff1cf'];

export class ConfettiEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private raf = 0;
  private last = 0;
  private rainUntil = 0;
  private rainColors = DEFAULT_COLORS;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.raf);
    this.particles = [];
  }

  private resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  burst(o: BurstOptions = {}): void {
    const count = o.count ?? 80;
    const colors = o.colors ?? DEFAULT_COLORS;
    const spread = ((o.spread ?? 360) * Math.PI) / 180;
    const angle = ((o.angle ?? -90) * Math.PI) / 180;
    const power = o.power ?? 1;
    const cx = (o.x ?? 0.5) * window.innerWidth;
    const cy = (o.y ?? 0.5) * window.innerHeight;

    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const speed = (240 + Math.random() * 520) * power;
      const size = 6 + Math.random() * 8;
      const shapeRoll = Math.random();
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        w: size,
        h: size * (0.5 + Math.random() * 0.7),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 14,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 1.4 + Math.random() * 1.2,
        shape: shapeRoll < 0.6 ? 'rect' : shapeRoll < 0.85 ? 'circle' : 'star',
        wobble: Math.random() * Math.PI * 2,
      });
    }
    this.start();
  }

  /** Continuous confetti falling from the top for `ms`. */
  rain(ms: number, colors?: string[]): void {
    this.rainUntil = Math.max(this.rainUntil, performance.now() + ms);
    if (colors) this.rainColors = colors;
    this.start();
  }

  private spawnRain(dt: number): void {
    const per = Math.floor(160 * dt) + (Math.random() < 160 * dt - Math.floor(160 * dt) ? 1 : 0);
    for (let i = 0; i < per; i++) {
      const size = 7 + Math.random() * 8;
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 80,
        vy: 120 + Math.random() * 160,
        w: size,
        h: size * (0.5 + Math.random() * 0.7),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 10,
        color: this.rainColors[Math.floor(Math.random() * this.rainColors.length)],
        life: 0,
        maxLife: 5,
        shape: Math.random() < 0.7 ? 'rect' : 'circle',
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  private start(): void {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    const ctx = this.ctx;
    if (!ctx) return;

    if (now < this.rainUntil) this.spawnRain(dt);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const H = window.innerHeight;
    const alive: Particle[] = [];

    for (const p of this.particles) {
      p.life += dt;
      p.vy += 900 * dt;
      p.vx *= 1 - 1.6 * dt;
      p.vy *= 1 - 0.6 * dt;
      p.wobble += 6 * dt;
      p.x += (p.vx + Math.sin(p.wobble) * 30) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.life >= p.maxLife || p.y > H + 40) continue;
      alive.push(p);

      const fade = p.maxLife - p.life < 0.5 ? (p.maxLife - p.life) / 0.5 : 1;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape === 'rect') {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawStar(ctx, p.w / 1.6);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    this.particles = alive;

    if (alive.length > 0 || now < this.rainUntil) {
      this.raf = requestAnimationFrame(this.tick);
    } else {
      this.raf = 0;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };
}

function drawStar(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r / 2.2;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}
