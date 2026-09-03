import type * as Types from "../types";
import type KeybindEntry from "./KeybindEntry";
import {
  SEQUENCE_KEY_SEPARATOR,
  sequenceDisplayKey,
} from "../helpers/sequenceKey";

type SequenceStore = Record<
  Types.EventType,
  Map<string, Map<string | undefined, KeybindEntry>>
>;

interface SequenceMatcherProps {
  // The registered sequences themselves stay owned by BindKeyboard (shared
  // with #bindings under the exact same ResolvedTarget registration
  // machinery) — passed in by reference, read here, never written to.
  sequences: SequenceStore;
  sequenceTimeout: number;
  debug: Types.DebugLevel;
  onCompleted: (
    ev: KeyboardEvent,
    sequenceKey: string,
    sequencesForType: Map<string, Map<string | undefined, KeybindEntry>>,
  ) => void;
  onSettled: (
    completedThisRound: string[],
    isStillPending: (sequenceKey: string) => boolean,
  ) => void;
}

/**
 * Owns sequence progress tracking and matching against live keyboard
 * events. `match` is BindKeyboard's single entry point per event: it
 * advances every registered sequence, fires whichever one (if any) just
 * completed unambiguously (`onCompleted`), and reports what changed to
 * `onSettled` so a deferred plain binding (see DeferredPlainFireTracker)
 * can react to the same event.
 */
class SequenceMatcher {
  readonly #sequences: SequenceStore;
  readonly #sequenceTimeout: number;
  readonly #debug: Types.DebugLevel;
  readonly #onCompleted: SequenceMatcherProps["onCompleted"];
  readonly #onSettled: SequenceMatcherProps["onSettled"];

  // How far into its own steps each registered sequence has progressed —
  // keyed by the sequence's full string, value is the index of the next
  // expected step (0 = not yet started).
  readonly #progress = new Map<string, number>();
  #timer: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor({
    sequences,
    sequenceTimeout,
    debug,
    onCompleted,
    onSettled,
  }: SequenceMatcherProps) {
    this.#sequences = sequences;
    this.#sequenceTimeout = sequenceTimeout;
    this.#debug = debug;
    this.#onCompleted = onCompleted;
    this.#onSettled = onSettled;
  }

  /**
   * Which registered sequences (for this event type) `keyCombination` just
   * started from scratch — its first step matched, and the most recent
   * `match()` call (which must have already run this event) advanced that
   * sequence's progress to 1 as a direct result. Used by
   * DeferredPlainFireTracker to recognize a plain binding's press as
   * possibly having just started a sequence too.
   *
   * @param {Types.KeyCombination} keyCombination - This event's already-resolved combination.
   * @param {Types.EventType} eventType - `ev.type`, narrowed.
   * @returns {string[]} The sequence key(s), if any, this press just started.
   */
  startedBy(
    keyCombination: Types.KeyCombination,
    eventType: Types.EventType,
  ): string[] {
    const { [eventType]: sequencesForType } = this.#sequences;

    return [...sequencesForType.keys()].filter(
      (sequenceKey) =>
        sequenceKey.split(SEQUENCE_KEY_SEPARATOR)[0] === keyCombination &&
        this.#progress.get(sequenceKey) === 1,
    );
  }

  /**
   * Advances (or resets) every registered sequence's progress against this
   * event, and fires whichever one (if any) just completed unambiguously.
   * A single shared inactivity timer covers every sequence at once (not
   * one per sequence, mirroring how BindKeyboard's own
   * #lastFiredCombination is one value per event type, not per binding) —
   * any sequence-relevant event pushes it back by `sequenceTimeout`, and it
   * clears every sequence's progress once it fires.
   *
   * OS auto-repeats of a held key are ignored entirely (not just as a "no
   * match" that would reset progress) — otherwise simply holding a key a
   * little too long could complete a sequence on its own, most obviously a
   * same-key one like "g,g": the second, third, etc. repeat of that single
   * physical press would each independently "match" the next expected step.
   *
   * @param {KeyboardEvent} ev - The keyboard event.
   * @param {Types.EventType} eventType - `ev.type`, narrowed.
   * @param {boolean} isModifierEvent - Whether `ev.code` is a modifier key.
   * @param {Types.KeyCombination} keyCombination - This event's already-resolved combination.
   */
  match(
    ev: KeyboardEvent,
    eventType: Types.EventType,
    isModifierEvent: boolean,
    keyCombination: Types.KeyCombination,
  ): void {
    const { [eventType]: sequencesForType } = this.#sequences;
    if (sequencesForType.size === 0 || ev.repeat) return;

    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#progress.clear();
    }, this.#sequenceTimeout);

    const stillPending: string[] = [];
    const completed: string[] = [];

    for (const sequenceKey of sequencesForType.keys()) {
      const result = this.#advance(
        sequenceKey,
        keyCombination,
        isModifierEvent,
      );

      if (result === "pending") stillPending.push(sequenceKey);
      else if (result === "completed") completed.push(sequenceKey);
    }

    this.#onSettled(completed, (key) => this.#progress.has(key));

    if (completed.length === 0) return;

    if (completed.length > 1 || stillPending.length > 0) {
      this.#warnConflict(completed, stillPending);
      return;
    }

    const [sequenceKey] = completed;
    this.#onCompleted(ev, sequenceKey, sequencesForType);
  }

  /** Discards every sequence's in-progress state — see BindKeyboard#removeAll. */
  clear(): void {
    this.#progress.clear();
    clearTimeout(this.#timer);
  }

  /**
   * Advances (or resets) a single registered sequence's progress against
   * this event. A bare modifier press (e.g. tapping Shift between two
   * steps) neither advances nor resets progress — anything else that
   * doesn't match the expected next step does, requiring that sequence to
   * start over from its first step.
   *
   * @param {string} sequenceKey - The sequence's full, SEQUENCE_KEY_SEPARATOR-joined string (also its key in #progress).
   * @param {Types.KeyCombination} keyCombination - This event's already-resolved combination.
   * @param {boolean} isModifierEvent - Whether `ev.code` is a modifier key.
   * @returns {"completed" | "pending" | "unchanged"} Whether this event completed the sequence, advanced it partway, or left its progress as-is.
   */
  #advance(
    sequenceKey: string,
    keyCombination: Types.KeyCombination,
    isModifierEvent: boolean,
  ): "completed" | "pending" | "unchanged" {
    const steps = sequenceKey.split(SEQUENCE_KEY_SEPARATOR);
    const stepIndex = this.#progress.get(sequenceKey) ?? 0;

    if (keyCombination !== steps[stepIndex]) {
      if (!isModifierEvent) this.#progress.delete(sequenceKey);
      return "unchanged";
    }

    if (stepIndex < steps.length - 1) {
      this.#progress.set(sequenceKey, stepIndex + 1);
      return "pending";
    }

    this.#progress.delete(sequenceKey);
    return "completed";
  }

  /**
   * Logs (under `debug`) that two or more registered sequences would
   * otherwise fire ambiguously on this same press — e.g. "g,o" completing
   * on the same event that "g,o,x" is still one press away from
   * completing too. Neither fires; refusing to guess which one the
   * consumer actually meant is safer than picking one.
   *
   * @param {string[]} completed - The sequence(s) that just reached their last step.
   * @param {string[]} stillPending - The sequence(s) that also matched this press but need at least one more.
   */
  #warnConflict(completed: string[], stillPending: string[]): void {
    if (!this.#debug) return;

    const completedList = completed
      .map((s) => `"${sequenceDisplayKey(s)}"`)
      .join(", ");
    const pendingList = stillPending
      .map((s) => `"${sequenceDisplayKey(s)}"`)
      .join(", ");
    const pendingNote =
      stillPending.length > 0
        ? ` while [${pendingList}] ${stillPending.length > 1 ? "are" : "is"} still waiting for more presses`
        : "";

    // eslint-disable-next-line no-console -- a heads-up only when the consumer opted into `debug`; deliberately fires none of them rather than guessing which was meant.
    console.warn(
      `[bind-keyboard] Sequence conflict: ${completedList} would fire${pendingNote} — refusing to fire any of them.`,
    );
  }
}

export default SequenceMatcher;
