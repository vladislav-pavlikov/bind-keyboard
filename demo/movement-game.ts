import BindKeyboard from "../src";
import { getElement } from "./dom";

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
const characterEl = getElement<HTMLElement>("#game-character");

const CHARACTER_WIDTH = 32;
const MOVE_SPEED = 4; // px per animation frame
const DASH_DISTANCE = 90;

let x = 0;
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

const jump = (): void => {
  if (ducking || characterEl.classList.contains("jumping")) return;
  characterEl.classList.add("jumping");
};

characterEl.addEventListener("animationend", () => {
  characterEl.classList.remove("jumping");
});

const dash = (direction: 1 | -1): void => {
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

bindKeyboard.add(
  "a",
  () => {
    movingLeft = true;
  },
  true,
  "keydown",
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
);

bindKeyboard.add(
  "shift+d",
  () => {
    dash(1);
  },
  true,
  "keydown",
);
bindKeyboard.add(
  "shift+a",
  () => {
    dash(-1);
  },
  true,
  "keydown",
);

const tick = (): void => {
  if (movingLeft && !movingRight) x = clampX(x - MOVE_SPEED);
  else if (movingRight && !movingLeft) x = clampX(x + MOVE_SPEED);
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
