// Static reference snippets for the "Try it in your code" section's
// framework tabs. Unlike the "Vanilla" tab (built dynamically in
// code-sample.ts), these don't reflect the sidebar's keyMode/
// checkInputElements toggles — they're about *where* to put the code in
// each framework's lifecycle (create on mount, destroy on unmount), not
// about demonstrating every constructor option.

export const FRAMEWORKS = ["vanilla", "react", "vue", "svelte"] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const LANGUAGES = ["ts", "js"] as const;
export type Language = (typeof LANGUAGES)[number];

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  vanilla: "Vanilla",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  ts: "TS",
  js: "JS",
};

export const FRAMEWORK_FILENAMES: Record<
  Framework,
  Record<Language, string>
> = {
  vanilla: { ts: "example.ts", js: "example.js" },
  react: { ts: "useShortcuts.ts", js: "useShortcuts.js" },
  vue: { ts: "App.vue", js: "App.vue" },
  svelte: { ts: "App.svelte", js: "App.svelte" },
};

// bind-keyboard/react is a separate entry point (react is a peer
// dependency, only ever imported there) exporting useKeybind — it creates
// its own BindKeyboard instance in a useEffect and destroys it on
// cleanup, so there's no manual effect/destroy to write by hand anymore.
const REACT_TS = `import { useKeybind } from "bind-keyboard/react";

export function useShortcuts(): void {
  useKeybind("cmdOrCtrl+k", (event: KeyboardEvent) => {
    event.preventDefault();
    // your code here
  });
}`;

const REACT_JS = `import { useKeybind } from "bind-keyboard/react";

export function useShortcuts() {
  useKeybind("cmdOrCtrl+k", (event) => {
    event.preventDefault();
    // your code here
  });
}`;

const VUE_TS = `<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import BindKeyboard from "bind-keyboard";

let bindKeyboard: BindKeyboard;

onMounted(() => {
  bindKeyboard = new BindKeyboard();

  bindKeyboard.add("cmdOrCtrl+k", (event: KeyboardEvent) => {
    event.preventDefault();
    // your code here
  });
});

onUnmounted(() => bindKeyboard.destroy());
</script>`;

const VUE_JS = `<script setup>
import { onMounted, onUnmounted } from "vue";
import BindKeyboard from "bind-keyboard";

let bindKeyboard;

onMounted(() => {
  bindKeyboard = new BindKeyboard();

  bindKeyboard.add("cmdOrCtrl+k", (event) => {
    event.preventDefault();
    // your code here
  });
});

onUnmounted(() => bindKeyboard.destroy());
</script>`;

const SVELTE_TS = `<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import BindKeyboard from "bind-keyboard";

  let bindKeyboard: BindKeyboard;

  onMount(() => {
    bindKeyboard = new BindKeyboard();

    bindKeyboard.add("cmdOrCtrl+k", (event: KeyboardEvent) => {
      event.preventDefault();
      // your code here
    });
  });

  onDestroy(() => bindKeyboard.destroy());
</script>`;

const SVELTE_JS = `<script>
  import { onMount, onDestroy } from "svelte";
  import BindKeyboard from "bind-keyboard";

  let bindKeyboard;

  onMount(() => {
    bindKeyboard = new BindKeyboard();

    bindKeyboard.add("cmdOrCtrl+k", (event) => {
      event.preventDefault();
      // your code here
    });
  });

  onDestroy(() => bindKeyboard.destroy());
</script>`;

// "Vanilla" is deliberately excluded — it's built dynamically, not here.
export const STATIC_FRAMEWORK_EXAMPLES: Record<
  Exclude<Framework, "vanilla">,
  Record<Language, string>
> = {
  react: { ts: REACT_TS, js: REACT_JS },
  vue: { ts: VUE_TS, js: VUE_JS },
  svelte: { ts: SVELTE_TS, js: SVELTE_JS },
};
