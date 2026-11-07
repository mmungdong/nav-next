/**
 * Moves the highlighted search result. -1 means "nothing selected yet";
 * ArrowDown starts at the first item, ArrowUp at the last. The index is
 * clamped inside the list so a stale selection cannot point outside it.
 */
export function moveSelection(current: number, delta: number, count: number): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) {
    return delta > 0 ? 0 : count - 1;
  }
  const next = current + delta;
  if (next < 0) return count - 1;
  if (next >= count) return 0;
  return next;
}

export const nextSelection = (current: number, count: number): number =>
  moveSelection(current, 1, count);

export const previousSelection = (current: number, count: number): number =>
  moveSelection(current, -1, count);
