import React, { useState } from 'react';
import type { CustomList } from '../types';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { playSoftPop } from '../utils/audio';

interface CustomListsProps {
  lists: CustomList[];
  onAddList: (title: string) => void;
  onDeleteList: (id: string) => void;
  onAddListItem: (listId: string, text: string) => void;
  onDeleteListItem: (listId: string, itemId: string) => void;
  onToggleListItem: (listId: string, itemId: string) => void;
}

export function CustomLists({ lists, onAddList, onDeleteList, onAddListItem, onDeleteListItem, onToggleListItem }: CustomListsProps) {
  const [newListTitle, setNewListTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      onAddList(newListTitle.trim());
      setNewListTitle('');
    }
  };

  const handleAddItem = (e: React.FormEvent, listId: string) => {
    e.preventDefault();
    const text = newItemTexts[listId];
    if (text?.trim()) {
      onAddListItem(listId, text.trim());
      setNewItemTexts(prev => ({ ...prev, [listId]: '' }));
    }
  };

  const handleToggle = (listId: string, itemId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      playSoftPop();
    }
    onToggleListItem(listId, itemId);
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-3xl border border-pink-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col overflow-hidden animate-slide-up-fade relative">
      <div className="mb-4 md:mb-6">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">My Checklists</h3>
        <form onSubmit={handleAddList} className="flex gap-2">
          <input
            type="text"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            placeholder="Create a new list..."
            className="flex-1 bg-pink-50/30 border border-pink-100 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200 rounded-xl text-gray-700 placeholder-gray-400"
          />
          <button 
            type="submit"
            disabled={!newListTitle.trim()}
            className="px-4 py-2 bg-pink-200 hover:bg-pink-300 disabled:opacity-50 disabled:hover:bg-pink-200 text-gray-800 rounded-xl transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none"
          >
            Create
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4">
        {lists.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>No lists yet. Create one above!</p>
          </div>
        ) : (
          lists.map(list => (
            <div key={list.id} className="border border-pink-50 rounded-2xl p-4 md:p-5 hover:border-pink-100 transition-colors animate-slide-up-fade">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium text-gray-800">{list.title}</h4>
                <button 
                  onClick={() => onDeleteList(list.id)}
                  className="p-1.5 text-pink-200 hover:text-pink-400 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  title="Delete list"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <ul className="space-y-1 mb-3">
                {list.items.map(item => (
                  <li key={item.id} className="group flex items-center justify-between p-2 rounded-xl hover:bg-pink-50/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer min-h-[44px]" onClick={() => handleToggle(list.id, item.id, item.completed)}>
                      <button 
                        className={`transition-all duration-300 ease-out flex items-center justify-center shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-pink-200 focus-visible:outline-none min-w-[44px] min-h-[44px]
                        ${item.completed 
                          ? 'text-pink-400 scale-110 drop-shadow-[0_0_6px_rgba(249,168,212,0.4)]' 
                          : 'text-gray-300 group-hover:text-pink-200'
                        }`}
                      >
                        {item.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <span className={`text-[15px] truncate transition-all duration-300 py-2 ${item.completed ? 'text-gray-400 line-through opacity-70' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteListItem(list.id, item.id); }}
                      className="opacity-100 md:opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center text-pink-200 hover:text-pink-400 transition-opacity rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                      title="Delete item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>

              <form onSubmit={(e) => handleAddItem(e, list.id)} className="flex items-center gap-2 mt-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newItemTexts[list.id] || ''}
                    onChange={(e) => setNewItemTexts(prev => ({ ...prev, [list.id]: e.target.value }))}
                    placeholder="Add an item..."
                    className="w-full bg-transparent border-b border-transparent focus:border-pink-200 px-2 py-1.5 focus-visible:outline-none text-gray-600 text-sm placeholder-gray-300 transition-colors"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newItemTexts[list.id]?.trim()}
                  className="p-1.5 text-pink-300 hover:text-pink-400 disabled:opacity-50 hover:bg-pink-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  title="Add item"
                >
                  <Plus size={18} />
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
