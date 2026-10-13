/**
 * Generic Tombstone-enabled Array Merge Engine
 * Prevents zombie items (resurrection bug) across offline/online clients.
 */
export function mergeItemsWithTombstones<T extends { id: string; updatedAt?: number }>(
  localItems: T[],
  remoteItems: T[],
  deletedIdsSet: Set<string>
): T[] {
  const map = new Map<string, T>();

  // 1. Add local items unless in deletedIds
  for (const item of localItems) {
    if (!deletedIdsSet.has(item.id)) {
      map.set(item.id, item);
    }
  }

  // 2. Merge remote items
  for (const remoteItem of remoteItems) {
    if (deletedIdsSet.has(remoteItem.id)) {
      // Tombstone: Never resurrect deleted items!
      continue;
    }

    const localItem = map.get(remoteItem.id);
    if (!localItem) {
      map.set(remoteItem.id, remoteItem);
    } else {
      // Last-Write-Wins based on updatedAt
      const remoteTime = remoteItem.updatedAt || 0;
      const localTime = localItem.updatedAt || 0;
      if (remoteTime > localTime) {
        map.set(remoteItem.id, remoteItem);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Strips undefined properties recursively so Firestore setDoc never rejects the payload.
 */
export function cleanUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
