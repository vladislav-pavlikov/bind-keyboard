import type { EventType, KeyCombination, KeybindCallback } from "../types";

interface KeybindEntryProps {
  keyCombination: KeyCombination;
  callback: KeybindCallback;
  eventType: EventType;
  preventRepeat: boolean;
  allowInInputElements?: boolean;
  description?: string;
  scope?: string;
  deferForSequence?: boolean;
}

class KeybindEntry {
  public readonly keyCombination: KeyCombination;
  public readonly callback: KeybindCallback;
  public readonly eventType: EventType;
  public readonly preventRepeat: boolean;
  public readonly allowInInputElements: boolean;
  public readonly description?: string;
  public readonly scope?: string;
  public readonly deferForSequence: boolean;

  constructor({
    keyCombination,
    callback,
    eventType,
    preventRepeat,
    allowInInputElements,
    description,
    scope,
    deferForSequence,
  }: KeybindEntryProps) {
    this.keyCombination = keyCombination;
    this.callback = callback;
    this.eventType = eventType;
    this.preventRepeat = preventRepeat;
    this.allowInInputElements = allowInInputElements ?? false;
    this.description = description;
    this.scope = scope;
    this.deferForSequence = deferForSequence ?? false;
  }
}

export default KeybindEntry;
