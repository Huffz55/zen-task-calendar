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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  }, [lists]);

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
