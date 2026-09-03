// --- Bonus: fireworks --------------------------------------------------------
// What "g,g" (see bindings.ts) actually triggers — a Vim-style "go to top"
// felt like a strange thing to spend the README's one sequence example on
// demonstrating, when what a visitor actually notices is "I pressed two
// keys and something happened", not where the page scrolled to.
//
// One persistent full-viewport <canvas>, created once and reused for every
// launch rather than spun up and torn down per press — cheaper, and avoids
// ever having two independent rAF loops racing each other if "g,g" gets
// pressed again mid-animation. pointer-events: none and a z-index below the
// shortcuts overlay's own (see style.css) — this never blocks interaction
// with anything, including itself getting covered by a popup opened on top.

const canvas = document.createElement("canvas");
canvas.className = "fireworks-canvas";
canvas.setAttribute("aria-hidden", "true");
document.body.appendChild(canvas);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- a freshly created canvas always has a 2D context available.
const ctx = canvas.getContext("2d")!;

const resize = (): void => {
  const { innerWidth, innerHeight } = window;
  canvas.width = innerWidth;
  canvas.height = innerHeight;
};
resize();
window.addEventListener("resize", resize);

const COLORS = ["#ff8a3d", "#ffd23f", "#3ddc97", "#4f9dff", "#ff5d8f"];
const GRAVITY = 0.05;
const PARTICLES_PER_SHELL = 36;
const FADE_PER_FRAME = 0.012;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

let particles: Particle[] = [];
let animating = false;

const spawnShell = (x: number, y: number, color: string): void => {
  for (let i = 0; i < PARTICLES_PER_SHELL; i += 1) {
    // A little randomness on top of the even ring spacing so a shell reads
    // as an explosion, not a perfect, obviously-generated circle.
    const angle = (Math.PI * 2 * i) / PARTICLES_PER_SHELL + Math.random() * 0.3;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
    });
  }
};

const tick = (): void => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const particle of particles) {
    particle.vy += GRAVITY;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= FADE_PER_FRAME;

    const { color } = particle;
    ctx.globalAlpha = Math.max(particle.life, 0);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  particles = particles.filter((particle) => particle.life > 0);

  if (particles.length > 0) {
    requestAnimationFrame(tick);
  } else {
    animating = false;
  }
};

/** Launches a burst of a few firework shells from random spots near the top of the viewport. */
export const launchFireworks = (): void => {
  const shellCount = 3;
  for (let i = 0; i < shellCount; i += 1) {
    const x = canvas.width * (0.2 + Math.random() * 0.6);
    const y = canvas.height * (0.15 + Math.random() * 0.25);
    // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- the index is random, not a static 0; destructuring only covers a fixed position.
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    spawnShell(x, y, color);
  }

  if (!animating) {
    animating = true;
    requestAnimationFrame(tick);
  }
};
