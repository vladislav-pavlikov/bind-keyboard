import type BindKeyboard from "../src";

// --- Bonus: WebMCP -----------------------------------------------------------
// WebMCP (https://github.com/webmachinelearning/webmcp) is an experimental
// W3C Community Group proposal — not yet in any browser's stable release —
// for a page to expose callable "tools" directly to an AI agent sharing the
// browser, via document.modelContext, no backend or separate MCP server
// involved. As of writing it's behind an Origin Trial in Chrome 149+/Edge
// 150+ (and this origin isn't enrolled in either — a visitor would need
// their own local flag/trial token for this to actually do anything), so
// document.modelContext is simply *absent* in every other browser. Every
// call below is feature-detected accordingly; there's nothing to catch or
// polyfill, just nothing to run.
//
// What's exposed reuses bind-keyboard's own public API, not anything
// bespoke — an agent gets the same "list every registered shortcut" and
// "look one up" this demo's own sidebar already shows a human, plus the
// ability to actually trigger one.

interface ModelContextContent {
  type: "text";
  text: string;
}

interface ModelContextResult {
  content: ModelContextContent[];
}

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: object;
  // The real WebIDL callback type is `Promise<any> (...)`, but per standard
  // WebIDL callback semantics a plain, non-async return is automatically
  // treated as an already-resolved promise — neither tool below needs to
  // await anything, so this is typed to allow returning a bare value
  // directly rather than wrapping every branch in Promise.resolve().
  execute: (
    input: Record<string, unknown>,
  ) => ModelContextResult | Promise<ModelContextResult>;
}

interface ModelContextRegisterOptions {
  signal?: AbortSignal;
}

interface ModelContext {
  registerTool: (
    tool: ModelContextTool,
    options?: ModelContextRegisterOptions,
  ) => Promise<undefined>;
}

// Not in lib.dom.d.ts yet — this API is too new for TypeScript's bundled DOM
// types to know about. Declared by hand rather than pulling in a types
// package for one experimental, still-changing field.
declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

const textResult = (text: string): ModelContextResult => ({
  content: [{ type: "text", text }],
});

/**
 * Registers this demo's shortcuts as WebMCP tools, if the browser supports
 * `document.modelContext` at all — a silent no-op otherwise. `getBindKeyboard`
 * is a getter rather than a fixed instance because the main demo's own
 * BindKeyboard gets destroyed and recreated whenever the keyMode/
 * checkInputElements toggles change (see main.ts's rebuildBindKeyboard) —
 * each tool's `execute` reads whatever instance currently exists at call
 * time, the same way bindings.ts's own overlay-scope handle does.
 *
 * @param {() => BindKeyboard | undefined} getBindKeyboard - Returns the currently-live BindKeyboard instance, if any.
 */
export const registerWebMcpTools = (
  getBindKeyboard: () => BindKeyboard | undefined,
): void => {
  if (!document.modelContext) return;
  const { modelContext } = document;

  void modelContext
    .registerTool({
      name: "list_keyboard_shortcuts",
      description:
        "Lists every keyboard shortcut currently registered on this bind-keyboard demo page, each with its key combination and what it does.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        const bindings = getBindKeyboard()
          ?.getAllBindings()
          .filter((entry) => entry.description)
          .map((entry) => `${entry.keyCombination} — ${entry.description}`)
          .join("\n");

        return textResult(bindings || "No shortcuts are registered right now.");
      },
    })
    .catch(() => {
      // Registration can reject (e.g. a duplicate tool name) — nothing
      // actionable for a demo bonus feature to do about it beyond not
      // pretending it succeeded.
    });

  void modelContext
    .registerTool({
      name: "trigger_keyboard_shortcut",
      description:
        'Triggers a keyboard shortcut on this page by its exact key combination, as returned by list_keyboard_shortcuts (e.g. "cmdOrCtrl + /" or "g, g") — the same effect as a visitor actually pressing it, though it does not honor scope suspension (see BindKeyboard#enableScope/disableScope) the way a real keypress does, since it calls the registered callback directly rather than dispatching a synthetic KeyboardEvent through the page.',
      inputSchema: {
        type: "object",
        properties: {
          keyCombination: { type: "string" },
        },
        required: ["keyCombination"],
      },
      execute: (input) => {
        const { keyCombination } = input;
        if (typeof keyCombination !== "string") {
          return textResult('"keyCombination" must be a string.');
        }

        const entry = getBindKeyboard()
          ?.getAllBindings()
          .find((b) => b.keyCombination === keyCombination);

        if (!entry) {
          return textResult(`No shortcut found for "${keyCombination}".`);
        }

        entry.callback(new KeyboardEvent(entry.eventType));
        return textResult(`Triggered "${keyCombination}".`);
      },
    })
    .catch(() => {
      // See above.
    });
};
