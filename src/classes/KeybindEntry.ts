import type { EventType, KeyСombination } from '../types'

class KeybindEntry {
  constructor (
    public readonly keyCombination: KeyСombination,
    public readonly callback: EventListener,
    public readonly eventType: EventType,
    public readonly preventRepeat: boolean
  ) {}
}

export default KeybindEntry
