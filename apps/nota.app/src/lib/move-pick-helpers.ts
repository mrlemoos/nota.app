/** `Command.Item` value prefix for Move note → pick note rows. */
export const MOVE_PICK_VALUE_PREFIX = 'move-pick:' as const;

/**
 * Parses a cmdk item `value` of the form `move-pick:<noteId>`.
 * Returns `null` if the value is not a move-pick row.
 */
export function parseMovePickNoteId(value: string): string | null {
  if (!value.startsWith(MOVE_PICK_VALUE_PREFIX)) {
    return null;
  }
  const id = value.slice(MOVE_PICK_VALUE_PREFIX.length);
  return id.length > 0 ? id : null;
}

/** Returns a new Set with `id` toggled (add if absent, remove if present). */
export function toggleIdInSet(
  previous: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(previous);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}
