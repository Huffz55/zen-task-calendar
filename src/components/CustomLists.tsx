import React, { useState, useEffect } from 'react';
import type { CustomList } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, ListChecks, ArrowLeft, CornerDownLeft, Sparkles } from 'lucide-react';
import { playSoftPop, playBambooTap, playWaterDrop } from '../utils/audio';
import { hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';

interface CustomListsProps {
  lists: CustomList[];
  onAddList: (title: string) => void;
  onDeleteList: (id: string) => void;
  onAddListItem: (listId: string, text: string) => void;
  onDeleteListItem: (listId: string, itemId: string) => void;
  onToggleListItem: (listId: string, itemId: string) => void;
}

function CustomListsComponent({
  lists,
  onAddList,
  onDeleteList,
  onAddListItem,
  onDeleteListItem,
  onToggleListItem,
}: CustomListsProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [newItemText, setNewItemText] = useState('');

  // Keep a valid active list selected
  useEffect(() => {
    if (lists.length > 0) {
      if (!selectedListId || !lists.some(l => l.id === selectedListId)) {
        setSelectedListId(lists[0].id);
      }
    } else {
      setSelectedListId(null);
    }
  }, [lists, selectedListId]);

  const activeList = lists.find(l => l.id === selectedListId) || lists[0];

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newListTitle.trim();
    if (title) {
      onAddList(title);
      playWaterDrop();
      hapticLight();
      setNewListTitle('');
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList) return;
    const text = newItemText.trim();
    if (text) {
      onAddListItem(activeList.id, text);
      playBambooTap();
      hapticLight();
      setNewItemText('');
    }
  };

  const handleToggle = (listId: string, itemId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      playSoftPop();
      hapticSuccess();
    } else {
      hapticLight();
    }
    onToggleListItem(listId, itemId);
  };

  const handleDeleteList = (id: string) => {
    hapticWarning();
    onDeleteList(id);
    if (selectedListId === id) {
      const remaining = lists.filter(l => l.id !== id);
      setSelectedListId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // If no lists exist at all, render an inviting Zen empty state
  if (lists.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-pink-100/70 shadow-[0_4px_25px_-5px_rgba(236,72,153,0.06),0_1px_3px_rgba(0,0,0,0.03)] h-full flex flex-col items-center justify-center p-6 sm:p-12 animate-slide-up-fade relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 mb-4 shadow-xs">
          <ListChecks size={30} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">Checklists & Routines</h3>
        <p className="text-sm text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
          Keep reusable routines, groceries, or project checklists distinct from your daily calendar flow.
        </p>

        <form onSubmit={handleAddList} className="w-full max-w-md flex items-center gap-2 bg-pink-50/40 p-1.5 rounded-2xl border border-pink-100 focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-200 transition-all shadow-xs">
          <input
            type="text"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            placeholder="e.g. Morning Routine, Packing Checklist..."
            maxLength={60}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
          <button
            type="submit"
            disabled={!newListTitle.trim()}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>Create List</span>
          </button>
        </form>
      </div>
    );
  }

  // Active list calculations
  const totalItems = activeList?.items.length || 0;
  const completedItems = activeList?.items.filter(i => i.completed).length || 0;
  const percentDone = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-pink-100/70 shadow-[0_4px_25px_-5px_rgba(236,72,153,0.06),0_1px_3px_rgba(0,0,0,0.03)] h-full flex flex-col md:flex-row overflow-hidden animate-slide-up-fade relative">
      
      {/* ── Left Sidebar: Lists Overview (Hidden on mobile if viewing details) ── */}
      <div className={`w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-pink-100/70 p-4 md:p-5 flex flex-col shrink-0 bg-pink-50/20 ${selectedListId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">Checklists</h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-pink-700">
              {lists.length}
            </span>
          </div>
        </div>

        {/* Quick Add List Form in Sidebar */}
        <form onSubmit={handleAddList} className="relative mb-3">
          <input
            type="text"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            placeholder="New checklist..."
            maxLength={60}
            className="w-full bg-white border border-pink-100 pl-3 pr-8 py-2 text-xs rounded-xl text-gray-700 placeholder-gray-400 outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200 transition-all shadow-2xs"
          />
          <button
            type="submit"
            disabled={!newListTitle.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-pink-100 hover:bg-pink-200 disabled:opacity-30 text-pink-600 flex items-center justify-center transition-all cursor-pointer"
            title="Create list"
          >
            <Plus size={14} />
          </button>
        </form>

        {/* List items navigation */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
          {lists.map(list => {
            const isSelected = list.id === activeList?.id;
            const done = list.items.filter(i => i.completed).length;
            const total = list.items.length;

            return (
              <div
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white text-pink-700 font-semibold shadow-xs border border-pink-200/80'
                    : 'text-gray-600 hover:bg-white/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-pink-500' : 'bg-gray-300'}`} />
                  <span className="text-xs truncate">{list.title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {total > 0 ? `${done}/${total}` : '0'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 rounded-lg transition-opacity"
                    title="Delete list"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel: Active Checklist Detail ── */}
      {activeList ? (
        <div className="flex-1 flex flex-col min-w-0 p-4 md:p-6 h-full overflow-hidden">
          {/* Active List Header */}
          <div className="flex items-center justify-between pb-3 border-b border-pink-100/70 mb-4 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setSelectedListId(null)}
                className="md:hidden p-1.5 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-pink-50"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h4 className="text-lg md:text-xl font-bold text-gray-800 truncate">{activeList.title}</h4>
                <p className="text-xs text-gray-400">
                  {totalItems > 0 ? `${completedItems} of ${totalItems} items completed (${percentDone}%)` : 'No items yet'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDeleteList(activeList.id)}
              className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Delete this checklist"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Delete List</span>
            </button>
          </div>

          {/* Quick Add Item Input */}
          <form onSubmit={handleAddItem} className="mb-4 shrink-0">
            <div className="flex items-center gap-2 bg-pink-50/40 border border-pink-100/90 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-pink-200 focus-within:border-pink-300 transition-all shadow-2xs">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder={`Add item to ${activeList.title}...`}
                maxLength={250}
                className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!newItemText.trim()}
                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <span>Add</span>
                <CornerDownLeft size={13} />
              </button>
            </div>
          </form>

          {/* Checklist Items Container */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
            {activeList.items.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-gray-400">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-400 mb-2 shadow-2xs">
                  <ListChecks size={20} />
                </div>
                <p className="text-xs font-semibold text-gray-600">List is empty</p>
                <p className="text-[11px] text-gray-400">Type an item above and press Add</p>
              </div>
            ) : (
              activeList.items.map(item => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2.5 rounded-2xl bg-white/70 hover:bg-white border border-pink-50/80 hover:border-pink-100 transition-all shadow-2xs"
                >
                  <div
                    className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer min-h-[36px]"
                    onClick={() => handleToggle(activeList.id, item.id, item.completed)}
                  >
                    <button
                      type="button"
                      className={`w-6 h-6 transition-all duration-200 flex items-center justify-center shrink-0 rounded-full ${
                        item.completed
                          ? 'text-pink-500 scale-105'
                          : 'text-gray-300 group-hover:text-pink-300'
                      }`}
                    >
                      {item.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <span
                      className={`text-xs sm:text-sm truncate transition-all ${
                        item.completed ? 'text-gray-400 line-through opacity-65' : 'text-gray-700 font-medium'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      hapticWarning();
                      onDeleteListItem(activeList.id, item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-rose-500 rounded-lg transition-opacity cursor-pointer shrink-0"
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          Select a list to view its items
        </div>
      )}

    </div>
  );
}

export const CustomLists = React.memo(CustomListsComponent);
