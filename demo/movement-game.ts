import BindKeyboard from "../src";
import { getElement } from "./dom";
import { renderShortcutsInto } from "./shortcuts-list";

// --- Bonus movement demo -----------------------------------------------------
// Everything here runs on its own, separate BindKeyboard instance:
// checkInputElements is hard-locked to true (not tied to the main demo's
// toggle above), so typing "a"/"s"/"d" into that demo's test input never
// also moves this character.
//
// bindKeyboard.add() only ever fires once per discrete key event — there's
// no built-in "is this key currently held" concept. Continuous movement is
// built on top of that: pairs of keydown/keyup registrations flip a boolean,
// and a requestAnimationFrame loop reads those booleans every frame. Jump,
// duck, and dash are simpler — one discrete keydown each, driving a CSS
// animation/class rather than a physics simulation.

const arenaEl = getElement<HTMLElement>("#game-arena");
const positionEl = getElement<HTMLElement>("#game-character-position");
const facingEl = getElement<HTMLElement>("#game-character-facing");
const characterEl = getElement<HTMLElement>("#game-character");

const CHARACTER_WIDTH = 32;
const MOVE_SPEED = 4; // px per animation frame
const DASH_DISTANCE = 90;

let x = 0;
let facing: 1 | -1 = 1;
let movingLeft = false;
let movingRight = false;
let ducking = false;

const clampX = (value: number): number => {
  const maxX = arenaEl.clientWidth - CHARACTER_WIDTH;
  return Math.max(0, Math.min(maxX, value));
};

const setPosition = (): void => {
  positionEl.style.transform = `translateX(${x}px)`;
};

// Flips the character to face the direction it's actually moving/dashing —
// its own transform layer (see the style.css comment) so it doesn't fight
// with .game-character's jump/duck transforms.
const setFacing = (direction: 1 | -1): void => {
  if (facing === direction) return;
  facing = direction;
  facingEl.style.transform = `scaleX(${facing})`;
};

const jump = (): void => {
  if (ducking || characterEl.classList.contains("jumping")) return;
  characterEl.classList.add("jumping");
};

characterEl.addEventListener("animationend", () => {
  characterEl.classList.remove("jumping");
});

const dash = (direction: 1 | -1): void => {
  setFacing(direction);
  x = clampX(x + direction * DASH_DISTANCE);
  setPosition();
  characterEl.classList.add("dashing");
  setTimeout(() => {
    characterEl.classList.remove("dashing");
  }, 220);
};

// keyMode: "code" so the physical W/A/S/D positions work the same
// regardless of the visitor's keyboard layout (the way games conventionally
// treat WASD), same reasoning as the main demo's keyMode toggle.
const bindKeyboard = new BindKeyboard({
  keyMode: "code",
  checkInputElements: true,
});

// Descriptions are only set on the "keydown" side of each pair — the
// "keyup" companions are just internal bookkeeping (resetting a held-key
// flag), not something worth showing in the "Bindings" popup below.
// renderShortcutsInto already skips entries with no description.
bindKeyboard.add(
  "a",
  () => {
    movingLeft = true;
  },
  true,
  "keydown",
  { description: "Move left" },
);
bindKeyboard.add(
  "a",
  () => {
    movingLeft = false;
  },
  true,
  "keyup",
);
bindKeyboard.add(
  "d",
  () => {
    movingRight = true;
  },
  true,
  "keydown",
  { description: "Move right" },
);
bindKeyboard.add(
  "d",
  () => {
    movingRight = false;
  },
  true,
  "keyup",
);
bindKeyboard.add(
  "s",
  () => {
    ducking = true;
    characterEl.classList.add("ducking");
  },
  true,
  "keydown",
  { description: "Duck" },
);
bindKeyboard.add(
  "s",
  () => {
    ducking = false;
    characterEl.classList.remove("ducking");
  },
  true,
  "keyup",
);

// Space's default page-scroll would otherwise fight with using it to jump.
bindKeyboard.add(
  ["space", "w"],
  (ev) => {
    ev.preventDefault();
    jump();
  },
  true,
  "keydown",
  { description: "Jump" },
);

bindKeyboard.add(
  "shift+d",
  () => {
    dash(1);
  },
  true,
  "keydown",
  { description: "Dash right" },
);
bindKeyboard.add(
  "shift+a",
  () => {
    dash(-1);
  },
  true,
  "keydown",
  { description: "Dash left" },
);

const tick = (): void => {
  if (movingLeft && !movingRight) {
    x = clampX(x - MOVE_SPEED);
    setFacing(-1);
  } else if (movingRight && !movingLeft) {
    x = clampX(x + MOVE_SPEED);
    setFacing(1);
  }
  setPosition();
  requestAnimationFrame(tick);
};

// Re-clamp on resize so the character can't end up stranded past the
// arena's right edge if the viewport (and so the arena) shrinks.
window.addEventListener("resize", () => {
  x = clampX(x);
  setPosition();
});

x = clampX((arenaEl.clientWidth - CHARACTER_WIDTH) / 2);
setPosition();
requestAnimationFrame(tick);

// --- Bindings popup ----------------------------------------------------------
// Same "?" overlay pattern as the main demo above, but scoped to this
// instance's own bindings and opened by a click instead of a key — "?" is
// already taken by the main demo's own overlay, and this page already has
// two independent BindKeyboard instances quietly listening at once; a third
// meaning for the same key isn't worth the confusion for a bonus feature.

const gameOverlayEl = getElement<HTMLElement>("#game-shortcuts-overlay");

renderShortcutsInto(
  getElement<HTMLElement>("#game-shortcuts-list"),
  bindKeyboard,
);

getElement<HTMLElement>("#game-bindings-button").addEventListener(
  "click",
  () => {
    gameOverlayEl.hidden = false;
  },
);

getElement<HTMLElement>("#game-overlay-close").addEventListener("click", () => {
  gameOverlayEl.hidden = true;
});

gameOverlayEl.addEventListener("click", (ev) => {
  if (ev.target === gameOverlayEl) gameOverlayEl.hidden = true;
});
