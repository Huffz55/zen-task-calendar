import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CustomList, ListItem } from '../types';
import { validateCustomList } from '../utils/validation';
import { defaultListStorage, LISTS_STORAGE_KEY } from '../services/storage/taskStorage';
import type { IListStorage } from '../services/storage/taskStorage';

export function useLists(storage: IListStorage = defaultListStorage) {
  const [lists, setLists] = useState<CustomList[]>(() => {
    return storage.loadLists();
  });

  // Save to storage repository whenever lists change
  useEffect(() => {
    storage.saveLists(lists);
  }, [lists, storage]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LISTS_STORAGE_KEY || e.key === null) {
        try {
          if (e.key === null) {
            setLists([]);
            return;
          }
          if (e.newValue) {
            const raw = JSON.parse(e.newValue);
            if (Array.isArray(raw)) {
              const validated: CustomList[] = [];
              for (const item of raw) {
                const v = validateCustomList(item);
                if (v) validated.push(v);
              }
              setLists(validated);
            }
          } else {
            setLists([]);
          }
        } catch (err) {
          console.error("Failed to sync lists from storage event", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addList = useCallback((title: string) => {
    const newList: CustomList = {
      id: uuidv4(),
      title,
      items: [],
    };
    setLists(prev => [newList, ...prev]);
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists(prev => prev.filter(list => list.id !== id));
  }, []);

  const restoreList = useCallback((list: CustomList) => {
    setLists(prev => {
      const exists = prev.some(l => l.id === list.id);
      if (exists) {
        return prev.map(l => l.id === list.id ? list : l);
      }
      return [list, ...prev];
    });
  }, []);

  const addListItem = useCallback((listId: string, text: string) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: [...(list.items || []), { id: uuidv4(), text, completed: false }]
        };
      }
      return list;
    }));
  }, []);

  const deleteListItem = useCallback((listId: string, itemId: string) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: (list.items || []).filter(item => item.id !== itemId)
        };
      }
      return list;
    }));
  }, []);

  const toggleListItem = useCallback((listId: string, itemId: string) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: (list.items || []).map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
          )
        };
      }
      return list;
    }));
  }, []);

  const importLists = useCallback((importedData: unknown) => {
    if (!Array.isArray(importedData)) return false;
    const validated: CustomList[] = [];
    for (const item of importedData) {
      const v = validateCustomList(item);
      if (v) validated.push(v);
    }
    if (validated.length === 0 && importedData.length > 0) return false;

    setLists(validated);
    storage.saveLists(validated);
    return true;
  }, [storage]);

  return {
    lists,
    addList,
    deleteList,
    restoreList,
    addListItem,
    deleteListItem,
    toggleListItem,
    importLists
  };
}
