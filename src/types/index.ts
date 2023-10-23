export type EventType = 'keydown' | 'keypress' | 'keyup'

export type DebugLevel = 0 | 1 | 2

export type KeyСombination = string

export type KeyСombinationConstruct = Partial<Pick<KeyboardEvent, 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey' | 'key'>>

export interface  KeybindInitializer {
  keyCombination: KeyСombination | KeyСombinationConstruct
  callback: EventListener
  preventRepeat?: boolean
  type?: EventType
}

export interface ConstructorProps {
  target?: EventTarget | HTMLElement
  debug?: DebugLevel
  initialBindings?: KeybindInitializer[]
  checkInputElements?: boolean
}
