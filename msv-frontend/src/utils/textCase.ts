/** 첫 글자 대문자, 나머지 소문자 (문장 케이스) */
export function toSentenceCase(value: string | null | undefined): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  const firstLetter = s.search(/[A-Za-z\uAC00-\uD7A3]/);
  if (firstLetter < 0) return s;
  return s.slice(0, firstLetter) + s.charAt(firstLetter).toUpperCase() + s.slice(firstLetter + 1).toLowerCase();
}

const hasHangul = (value: string) => /[\uAC00-\uD7A3]/.test(value);

/**
 * 영어 항목만 문장 케이스. 한글은 그대로 둔다.
 * "(a) Short Term Borrowings" → "(a) Short term borrowings"
 */
export function formatEnglishSentenceLabel(value: string | null | undefined): string {
  const s = String(value ?? '').trim();
  if (!s || hasHangul(s)) return s;

  const prefixMatch = s.match(/^(Note\s+\d+\s+|\(([a-zA-Z]+|\d+)\)\s+)/i);
  if (prefixMatch) {
    const rest = s.slice(prefixMatch[0].length).trim();
    if (!rest) return s;
    return `${prefixMatch[0].replace(/\s+$/, ' ')}${toSentenceCase(rest)}`;
  }
  return toSentenceCase(s);
}
