import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CustomList, ListItem } from '../types';

const STORAGE_KEY = 'noteapp_lists_v1';

export function useLists() {
  const [lists, setLists] = useState<CustomList[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse lists from localStorage", e);
      return [];
    }
  });

  // Save to local storage whenever lists change, avoiding redundant writes
  useEffect(() => {
    const currentStored = localStorage.getItem(STORAGE_KEY);
    const newSerialized = JSON.stringify(lists);
    if (currentStored !== newSerialized) {
      localStorage.setItem(STORAGE_KEY, newSerialized);
    }
  }, [lists]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        try {
          if (e.key === null) {
            setLists([]);
            return;
          }
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              setLists(parsed);
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

  const addListItem = useCallback((listId: string, text: string) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: [...list.items, { id: uuidv4(), text, completed: false }]
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
          items: list.items.filter(item => item.id !== itemId)
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
          items: list.items.map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
          )
        };
      }
      return list;
    }));
  }, []);

  const importLists = useCallback((importedData: any) => {
    if (Array.isArray(importedData)) {
      setLists(importedData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedData));
      return true;
    }
    return false;
  }, []);

  return {
    lists,
    addList,
    deleteList,
    addListItem,
    deleteListItem,
    toggleListItem,
    importLists
  };
}
