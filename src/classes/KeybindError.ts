class KeybindError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeybindError";
  }
}

export default KeybindError;
