// Coordinates keyboard-scope suspension across the page's two independent
// BindKeyboard instances (the main demo's own, and the bonus game's)
// whenever *either* overlay is open. Both overlays are full-viewport
// modals (see `.overlay` in style.css: `position: fixed; inset: 0;`), so
// whatever they're covering shouldn't still respond to keys underneath —
// e.g. WASD still moving the game character behind the main demo's "?"
// overlay, or vice versa. A Set of open overlay ids (not just a boolean)
// so closing one overlay while the *other* is also open doesn't
// prematurely re-enable anything.

interface ScopeHandle {
  disable: () => void;
  enable: () => void;
}

const handles: ScopeHandle[] = [];
const openOverlayIds = new Set<string>();

// Each BindKeyboard instance's own module registers how to suspend/restore
// its own scope — this module only tracks *whether* anything should be
// suspended right now, not what "suspended" means for any particular
// instance.
export const registerOverlayScopeHandle = (handle: ScopeHandle): void => {
  handles.push(handle);
};

export const notifyOverlayOpened = (overlayId: string): void => {
  const wasEmpty = openOverlayIds.size === 0;
  openOverlayIds.add(overlayId);

  if (wasEmpty) {
    handles.forEach((handle) => {
      handle.disable();
    });
  }
};

export const notifyOverlayClosed = (overlayId: string): void => {
  openOverlayIds.delete(overlayId);

  if (openOverlayIds.size === 0) {
    handles.forEach((handle) => {
      handle.enable();
    });
  }
};
