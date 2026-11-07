// Keep the active section valid after search / data changes: drop a stale id and
// fall back to the first visible section, or to '' when nothing is visible.
export function resolveActiveId(current: string, ids: string[]): string {
  if (current && ids.includes(current)) return current;
  return ids[0] ?? '';
}

// Document-space scroll target for a sticky header offset.
export function scrollTopFor(elementTop: number, offset: number): number {
  return Math.max(0, Math.round(elementTop - offset));
}

// The section containing the offset line, or the last section when the page is
// scrolled to the bottom (short trailing sections would otherwise never win).
export function pickActiveSection(
  sections: { id: string; top: number }[],
  offset: number,
  atBottom: boolean
): string {
  if (sections.length === 0) return '';
  if (atBottom) return sections[sections.length - 1].id;
  let current = sections[0].id;
  for (const section of sections) {
    if (section.top - offset <= 4) current = section.id;
  }
  return current;
}
