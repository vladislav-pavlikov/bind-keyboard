/// <reference lib="dom" />

import bindKeyboard from './';

describe('Keybind Library Tests', () => {
  beforeEach(() => {
    bindKeyboard.removeAll();
  });

  it('window is defined', () => {
    expect(window).toBeDefined();
  });

  it('should add key binding and find it by .getKeybind', () => {
    const callback = jest.fn();
    bindKeyboard.add('ctrl+A', callback);

    expect(bindKeyboard.getKeybind('Ctrl+A')).toEqual({
      keyCombination: "ctrl + a",
      callback,
      eventType: "keypress",
      preventRepeat: true
    })
  });

  it('should not find deleted "Ctrl+A" binding by .getKeybind', () => {
    expect(bindKeyboard.getKeybind('Ctrl+A')).not.toBeDefined();
  });

  it('should add and trigger key binding', () => {
    const callback = jest.fn();
    bindKeyboard.add("ctrl+a", callback);

    const event = new KeyboardEvent('keypress', { key: 'a', ctrlKey: true });
    dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
  });

  it('should rewrite key binding on same keyCombination', () => {
    const callback_1 = jest.fn();
    const callback_2 = jest.fn();
    bindKeyboard.add("ctrl+a", callback_1);
    bindKeyboard.add("ctrl+a", callback_2);

    const event = new KeyboardEvent('keypress', { key: 'a', ctrlKey: true });
    dispatchEvent(event);

    expect(callback_1).not.toHaveBeenCalled();
    expect(callback_2).toHaveBeenCalled();
  });

  it('should not trigger key binding when key combination does not match', () => {
    const callback = jest.fn();
    bindKeyboard.add({ key: 'a', ctrlKey: true }, callback, true, 'keydown');

    const event = new KeyboardEvent('keydown', { key: 'a' });
    dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should remove key binding', () => {
    const callback = jest.fn();
    bindKeyboard.add('ctrl+A', callback);
    bindKeyboard.remove('ctrl+A');

    const event = new KeyboardEvent('keypress', { key: 'a', ctrlKey: true });
    document.dispatchEvent(event);

    expect(bindKeyboard.getKeybind('ctrl+A')).not.toBeDefined()
    expect(callback).not.toHaveBeenCalled();
  });
});
