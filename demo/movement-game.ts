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
// and a requestAnimationFrame loop reads those booleans every frame. Jump
// and duck are simpler — one discrete keydown each, driving a CSS
// animation/class rather than a physics simulation. Dash is a discrete
// keydown too, but with no matching "keyup" registration — see the toast
// section below for why.

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

// --- Toasts ------------------------------------------------------------------
// One toast per currently-pressed key, labeled with whatever was actually
// pressed (e.g. "a" or "←" — the two never share a toast, even though they
// do the same thing). Held in a flex row (see style.css) so several at
// once line up instead of overlapping. Kept alive while its key is held;
// fading it (float up + fade out, then remove once the transition ends) is
// triggered on release for the "held" actions (move/duck/jump), or after a
// fixed delay for dash — dash has no "keyup" registration of its own, since
// "keyup" ignores modifiers (deliberately, so releasing "d" while Shift is
// still held reliably resolves to plain "d" — see src/index.ts) and would
// otherwise collide with plain "d"/"a"'s own release binding.

const toastsEl = getElement<HTMLElement>("#game-toasts");
const activeToasts = new Map<string, HTMLElement>();

const showToast = (label: string): void => {
  const existing = activeToasts.get(label);
  if (existing) {
    existing.classList.remove("fading");
    return;
  }

  const toast = document.createElement("div");
  toast.className = "game-toast";
  toast.textContent = label;
  toastsEl.appendChild(toast);
  activeToasts.set(label, toast);
};

const fadeToast = (label: string): void => {
  const toast = activeToasts.get(label);
  if (!toast) return;

  activeToasts.delete(label);
  toast.classList.add("fading");
  toast.addEventListener(
    "transitionend",
    () => {
      toast.remove();
    },
    { once: true },
  );
};

// keyMode: "code" so the physical W/A/S/D positions work the same
// regardless of the visitor's keyboard layout (the way games conventionally
// treat WASD), same reasoning as the main demo's keyMode toggle.
const bindKeyboard = new BindKeyboard({
  keyMode: "code",
  checkInputElements: true,
});

interface KeyAlternative {
  combo: string;
  label: string;
}

// Registers one "held" action (e.g. move left) across every alternative
// combination that should trigger it (its WASD key and its arrow-key
// equivalent) — each showing its own toast, keyed by its own label, so "a"
// and "←" never share one. onRelease is optional: jump doesn't need one for
// its own game logic (it already ignores being held), but still gets a
// toast that properly fades on its own key's release rather than a fixed
// delay, since — unlike dash — none of its combos double as another
// action's base key on "keyup".
const registerHeldAction = (
  alternatives: KeyAlternative[],
  description: string,
  onPress: () => void,
  onRelease?: () => void,
): void => {
  for (const { combo, label } of alternatives) {
    bindKeyboard.add(
      combo,
      (ev) => {
        ev.preventDefault();
        showToast(label);
        onPress();
      },
      true,
      "keydown",
      { description },
    );
    bindKeyboard.add(
      combo,
      () => {
        fadeToast(label);
        onRelease?.();
      },
      true,
      "keyup",
    );
  }
};

// Registers one momentary action (dash) that fades its own toast after a
// fixed delay instead of on release.
const registerMomentaryAction = (
  alternatives: KeyAlternative[],
  description: string,
  onTrigger: () => void,
): void => {
  for (const { combo, label } of alternatives) {
    bindKeyboard.add(
      combo,
      (ev) => {
        ev.preventDefault();
        showToast(label);
        setTimeout(() => {
          fadeToast(label);
        }, 500);
        onTrigger();
      },
      true,
      "keydown",
      { description },
    );
  }
};

registerHeldAction(
  [
    { combo: "a", label: "a" },
    { combo: "arrowleft", label: "←" },
  ],
  "Move left",
  () => {
    movingLeft = true;
  },
  () => {
    movingLeft = false;
  },
);
registerHeldAction(
  [
    { combo: "d", label: "d" },
    { combo: "arrowright", label: "→" },
  ],
  "Move right",
  () => {
    movingRight = true;
  },
  () => {
    movingRight = false;
  },
);
registerHeldAction(
  [
    { combo: "s", label: "s" },
    { combo: "arrowdown", label: "↓" },
  ],
  "Duck",
  () => {
    ducking = true;
    characterEl.classList.add("ducking");
  },
  () => {
    ducking = false;
    characterEl.classList.remove("ducking");
  },
);
registerHeldAction(
  [
    { combo: "space", label: "space" },
    { combo: "w", label: "w" },
    { combo: "arrowup", label: "↑" },
  ],
  "Jump",
  jump,
);

registerMomentaryAction(
  [
    { combo: "shift+d", label: "shift + d" },
    { combo: "shift+arrowright", label: "shift + →" },
  ],
  "Dash right",
  () => {
    dash(1);
  },
);
registerMomentaryAction(
  [
    { combo: "shift+a", label: "shift + a" },
    { combo: "shift+arrowleft", label: "shift + ←" },
  ],
  "Dash left",
  () => {
    dash(-1);
  },
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
