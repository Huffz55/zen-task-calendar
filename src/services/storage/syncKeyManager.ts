const SYNC_KEY_STORAGE = 'zen_sync_key';
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates an unambiguous, human-friendly pairing code: ZEN-XXXX-XXXX
 * Omits characters easily confused: 0/O, 1/I.
 */
export function generateSyncKey(): string {
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += CHARS[Math.floor(Math.random() * CHARS.length)];
    part2 += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `ZEN-${part1}-${part2}`;
}

/**
 * Validates if a string adheres to the ZEN-XXXX-XXXX pairing format.
 */
export function isValidSyncKey(key: string): boolean {
  if (!key) return false;
  const cleaned = key.trim().toUpperCase();
  return /^ZEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned);
}

/**
 * Retrieves the currently active sync key or generates and persists a new one.
 */
export function getSyncKey(): string {
  try {
    const existing = localStorage.getItem(SYNC_KEY_STORAGE);
    if (existing && isValidSyncKey(existing)) {
      return existing.trim().toUpperCase();
    }
  } catch {}

  const generated = generateSyncKey();
  try {
    localStorage.setItem(SYNC_KEY_STORAGE, generated);
  } catch {}
  return generated;
}

/**
 * Persists a new sync key to localStorage after format validation.
 */
export function setSyncKey(newKey: string): boolean {
  const normalized = newKey.trim().toUpperCase();
  if (!isValidSyncKey(normalized)) {
    return false;
  }
  try {
    localStorage.setItem(SYNC_KEY_STORAGE, normalized);
    return true;
  } catch {
    return false;
  }
}
