// Sequence steps are stored joined by this literal NUL character rather
// than the ", " a consumer types them with — a step's own canonical form
// can itself legitimately contain a comma (e.g. "ctrl + ," for a real,
// physical Ctrl+Comma binding — see parseSequence's own lookbehind-free
// scan for why that doesn't get mistaken for a sequence to begin with),
// which would make a comma-joined *storage* key ambiguous to split back
// apart. A NUL character can never appear in any real key's name, so it's
// safe as an internal-only delimiter; sequenceDisplayKey below turns it
// back into the readable, comma-separated form for anything a human might
// actually read. Shared between BindKeyboard (registration/lookup) and
// SequenceMatcher (progress tracking) rather than owned by either.
export const SEQUENCE_KEY_SEPARATOR = String.fromCharCode(0);

export const sequenceDisplayKey = (sequenceKey: string): string =>
  sequenceKey.split(SEQUENCE_KEY_SEPARATOR).join(", ");
