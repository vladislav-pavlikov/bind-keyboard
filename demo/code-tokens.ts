// Two ways of producing colored code lines for "Try it in your code":
// hand-authored tokens (used for the dynamic "Vanilla" example, which needs
// exact control since it interpolates live settings) and a small generic
// tokenizer (used for the static framework examples in
// framework-examples.ts, so those don't need hand-authoring one by one).
// Neither is a real parser — both exist purely to color a handful of short,
// simple snippets reasonably well.

export interface CodeToken {
  text: string;
  cls?: "keyword" | "type" | "var" | "func" | "string" | "bool" | "comment";
}

export const renderCodeLine = (tokens: CodeToken[]): HTMLElement => {
  const lineEl = document.createElement("div");
  lineEl.className = "code-line";

  for (const { text, cls } of tokens) {
    if (!cls) {
      lineEl.append(text);
      continue;
    }
    const tokenEl = document.createElement("span");
    tokenEl.className = `tok-${cls}`;
    tokenEl.textContent = text;
    lineEl.appendChild(tokenEl);
  }

  return lineEl;
};

const KEYWORDS = new Set([
  "import",
  "export",
  "default",
  "from",
  "const",
  "let",
  "var",
  "function",
  "return",
  "new",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "typeof",
  "void",
]);

// Order matters: comments/strings are matched whole (so keyword-looking
// text inside them isn't re-tokenized), then identifiers, then whitespace,
// then anything else one character at a time.
const TOKEN_PATTERN =
  /(?<comment>\/\/.*)|(?<string>"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(?<word>[A-Za-z_$][\w$]*)|(?<space>\s+)|(?<other>.)/gu;

// TypeScript's regex-literal group typing doesn't model alternation — it
// types every named group here as always-present `string`, even though at
// runtime only the one branch that matched is ever set. This explicit,
// properly-optional shape overrides that inference so the branching below
// (which reflects the real, alternation-based behavior) doesn't get flagged
// as dead code.
interface TokenGroups {
  comment?: string;
  string?: string;
  word?: string;
  space?: string;
  other?: string;
}

const tokenizeLine = (line: string): CodeToken[] => {
  const tokens: CodeToken[] = [];

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const { comment, string, word, space, other } = (match.groups ??
      {}) as TokenGroups;

    if (comment !== undefined) {
      tokens.push({ text: comment, cls: "comment" });
    } else if (string !== undefined) {
      tokens.push({ text: string, cls: "string" });
    } else if (word !== undefined) {
      const followedByParen = line
        .slice(match.index + word.length)
        .startsWith("(");

      if (KEYWORDS.has(word)) tokens.push({ text: word, cls: "keyword" });
      else if (followedByParen) tokens.push({ text: word, cls: "func" });
      else if (/^[A-Z]/u.test(word)) tokens.push({ text: word, cls: "type" });
      else tokens.push({ text: word, cls: "var" });
    } else if (space !== undefined) {
      tokens.push({ text: space });
    } else if (other !== undefined) {
      tokens.push({ text: other });
    }
  }

  return tokens;
};

export const tokenizeSource = (source: string): CodeToken[][] =>
  source.split("\n").map(tokenizeLine);
