// A hashtag starts at a word boundary, so "C#" and URL fragments are not tags.
const TAG_RE = /(?<![\p{L}\p{N}_&/])#([\p{L}\p{N}_]{1,30})/gu;
export const TAG_NAME_RE = /^[\p{L}\p{N}_]{1,30}$/u;

export function extractTags(text = '') {
  const found = new Set();
  for (const m of text.matchAll(TAG_RE)) found.add(m[1].toLowerCase());
  return [...found].slice(0, 10);
}
