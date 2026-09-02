import type { EventType, KeyCombination, KeybindCallback } from "../types";

interface KeybindEntryProps {
  keyCombination: KeyCombination;
  callback: KeybindCallback;
  eventType: EventType;
  preventRepeat: boolean;
  allowInInputElements?: boolean;
  description?: string;
}

class KeybindEntry {
  public readonly keyCombination: KeyCombination;
  public readonly callback: KeybindCallback;
  public readonly eventType: EventType;
  public readonly preventRepeat: boolean;
  public readonly allowInInputElements: boolean;
  public readonly description?: string;

  constructor({
    keyCombination,
    callback,
    eventType,
    preventRepeat,
    allowInInputElements,
    description,
  }: KeybindEntryProps) {
    this.keyCombination = keyCombination;
    this.callback = callback;
    this.eventType = eventType;
    this.preventRepeat = preventRepeat;
    this.allowInInputElements = allowInInputElements ?? false;
    this.description = description;
  }
}

export default KeybindEntry;
