import type * as Types from "../types";
import type KeybindEntry from "./KeybindEntry";

interface Pending {
  entry: KeybindEntry;
  ev: KeyboardEvent;
  eventType: Types.EventType;
  keyCombination: Types.KeyCombination;
  sequenceKeysStarted: Set<string>;
  timer: ReturnType<typeof setTimeout>;
}

interface DeferredPlainFireTrackerProps {
  sequenceTimeout: number;
  fire: (
    entry: KeybindEntry,
    ev: KeyboardEvent,
    eventType: Types.EventType,
    keyCombination: Types.KeyCombination,
  ) => void;
  // Normally SequenceMatcher#startedBy — which registered sequences (for
  // this event type) a press just started from scratch. See `handle` below.
  sequencesStartedBy: (
    keyCombination: Types.KeyCombination,
    eventType: Types.EventType,
  ) => string[];
}

/**
 * Backs a plain binding's `{ deferForSequence: true }` option: holds off
 * firing it for up to `sequenceTimeout` when its press also just started
 * one or more registered sequences (see `sequencesStartedBy` above), so a
 * plain "g" binding and a "g,o" sequence can coexist without "g" always
 * firing its side effect first. At most one deferred entry is tracked at a
 * time — a second one arriving before the first resolves flushes (fires)
 * the first immediately rather than silently dropping it, the same
 * trade-off SequenceMatcher's own single shared timer/progress map already
 * make for sequences themselves.
 */
class DeferredPlainFireTracker {
  readonly #sequenceTimeout: number;
  readonly #fire: DeferredPlainFireTrackerProps["fire"];
  readonly #sequencesStartedBy: DeferredPlainFireTrackerProps["sequencesStartedBy"];
  #pending: Pending | undefined = undefined;

  constructor({
    sequenceTimeout,
    fire,
    sequencesStartedBy,
  }: DeferredPlainFireTrackerProps) {
    this.#sequenceTimeout = sequenceTimeout;
    this.#fire = fire;
    this.#sequencesStartedBy = sequencesStartedBy;
  }

  /**
   * The single entry point for BindKeyboard's listener: decides whether
   * this press is something the tracker needs to handle at all, and if so,
   * handles it — leaving the listener to fall through to its own normal
   * immediate-fire path only when this returns false.
   *
   * - a held key's own OS auto-repeat while its entry is still the one
   *   currently pending: ignored (returns true) — the original press
   *   hasn't resolved yet, so this is neither a fresh press starting
   *   anything new nor a genuine "repeat of what last fired" (nothing has
   *   fired for it yet); left alone, it would either re-defer on every
   *   repeat tick or, once it stops matching what last fired, fire
   *   immediately and defeat the deferral outright.
   * - `entry` didn't opt into `deferForSequence`, or this press is a
   *   repeat, or it didn't start any sequence: not this tracker's concern
   *   (returns false).
   * - otherwise: defers `entry` (returns true).
   *
   * @param {KeybindEntry | undefined} entry - The plain binding entry that matched this press, if any.
   * @param {KeyboardEvent} ev - The keyboard event.
   * @param {Types.EventType} eventType - `ev.type`, narrowed.
   * @param {Types.KeyCombination} keyCombination - This event's already-resolved combination.
   * @returns {boolean} Whether this press has been fully handled already.
   */
  handle(
    entry: KeybindEntry | undefined,
    ev: KeyboardEvent,
    eventType: Types.EventType,
    keyCombination: Types.KeyCombination,
  ): boolean {
    if (ev.repeat) return this.#pending?.entry === entry;
    if (!entry?.deferForSequence) return false;

    const sequenceKeysStarted = this.#sequencesStartedBy(
      keyCombination,
      eventType,
    );
    if (sequenceKeysStarted.length === 0) return false;

    this.#defer(entry, ev, eventType, keyCombination, sequenceKeysStarted);
    return true;
  }

  /**
   * Starts (or restarts, flushing whatever was previously pending) waiting
   * on the outcome of the sequence(s) this press just started before
   * firing `entry`.
   *
   * @param {KeybindEntry} entry - The plain binding entry being deferred.
   * @param {KeyboardEvent} ev - The keyboard event that matched it.
   * @param {Types.EventType} eventType - `ev.type`, narrowed.
   * @param {Types.KeyCombination} keyCombination - This event's already-resolved combination.
   * @param {string[]} sequenceKeysStarted - The sequence(s) this same press started.
   */
  #defer(
    entry: KeybindEntry,
    ev: KeyboardEvent,
    eventType: Types.EventType,
    keyCombination: Types.KeyCombination,
    sequenceKeysStarted: string[],
  ): void {
    this.#flush();

    this.#pending = {
      entry,
      ev,
      eventType,
      keyCombination,
      sequenceKeysStarted: new Set(sequenceKeysStarted),
      timer: setTimeout(() => {
        this.#flush();
      }, this.#sequenceTimeout),
    };
  }

  /**
   * Checks the currently-deferred entry (if any) against what just
   * happened, this same event, to the sequence(s) it's waiting on:
   * - one of them completed → the sequence won; cancel outright, the
   *   deferred entry never fires for this press.
   * - at least one is still pending (per `isStillPending`) → still
   *   ambiguous, keep waiting.
   * - none are pending anymore (all broke) → no longer ambiguous; fire
   *   right away instead of waiting out the rest of the timer.
   *
   * @param {string[]} completedThisRound - Sequence keys that just completed on this same event.
   * @param {(sequenceKey: string) => boolean} isStillPending - Whether a given sequence key is still mid-progress.
   */
  resolve(
    completedThisRound: string[],
    isStillPending: (sequenceKey: string) => boolean,
  ): void {
    if (!this.#pending) return;

    const startedKeys = [...this.#pending.sequenceKeysStarted];

    if (startedKeys.some((key) => completedThisRound.includes(key))) {
      this.cancel();
      return;
    }

    if (startedKeys.some(isStillPending)) return;

    this.#flush();
  }

  /**
   * Fires the currently-deferred entry immediately and clears it — a no-op
   * if nothing is currently deferred. Used by the entry's own timer
   * elapsing, `resolve` deciding every sequence it was waiting on has
   * broken, and `#defer` itself flushing a still-outstanding one before
   * replacing it with a new one.
   */
  #flush(): void {
    const pending = this.#pending;
    if (!pending) return;

    this.cancel();
    this.#fire(
      pending.entry,
      pending.ev,
      pending.eventType,
      pending.keyCombination,
    );
  }

  /** Discards the currently-deferred entry, if any, without firing it. */
  cancel(): void {
    clearTimeout(this.#pending?.timer);
    this.#pending = undefined;
  }
}

export default DeferredPlainFireTracker;
