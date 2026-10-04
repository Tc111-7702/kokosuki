const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
};

/** WordPress の title.rendered などに残る HTML エンティティを文字に戻す。二重エスケープもほどく。 */
export function decodeHtmlEntities(input: string): string {
  let current = input;
  for (let pass = 0; pass < 3; pass++) {
    const next = current.replace(
      /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g,
      (entity, body: string) => {
        if (body.startsWith('#')) {
          const code = body[1] === 'x' || body[1] === 'X'
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
          if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return entity;
          return String.fromCodePoint(code);
        }
        return NAMED_ENTITIES[body] ?? entity;
      },
    );
    if (next === current) break;
    current = next;
  }
  return current;
}
