// Cross-platform "primary modifier" resolution used by keyParser's
// "cmdOrCtrl" alias: Cmd (metaKey) on Mac, Ctrl (ctrlKey) everywhere else.
// Not cached — called only when a string combination actually contains
// "cmdOrCtrl" (bind-time, not per-keystroke), so recomputing per call is
// cheap and keeps this trivially mockable in tests.
const isMacPlatform = (): boolean => {
  if (typeof navigator === "undefined") return false;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- userAgentData is an experimental Chromium-only API not present in lib.dom.d.ts; this is the standard feature-detection shape, guarded entirely by optional chaining below.
  const { userAgentData } = navigator as {
    userAgentData?: { platform?: string };
  };
  const platform = userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad/iu.test(platform);
};

export default isMacPlatform;
