import React from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getTaskCountForDate?: (dateStr: string) => number;
  onDropTask?: (taskId: string, dateStr: string) => void;
}

export function Calendar({ selectedDate, onSelectDate, getTaskCountForDate, onDropTask }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(selectedDate));
  const [dragHoverDate, setDragHoverDate] = React.useState<string | null>(null);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center py-2 mb-2">
        <button onClick={prevMonth} className="p-1.5 hover:bg-pink-50 rounded-full transition-colors text-pink-300">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-medium text-gray-700">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={nextMonth} className="p-1.5 hover:bg-pink-50 rounded-full transition-colors text-pink-300">
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth);
    
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-medium text-xs text-gray-400 py-1 mb-1">
          {format(addDays(startDate, i), 'EEE')}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-1">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const dateStr = format(cloneDay, 'yyyy-MM-dd');
        const taskCount = getTaskCountForDate ? getTaskCountForDate(dateStr) : 0;
        const isSelected = isSameDay(day, selectedDate);
        const isTodayDate = isToday(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isHovered = dragHoverDate === dateStr;

        days.push(
          <div
            key={day.toString()}
            onClick={() => onSelectDate(cloneDay)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragHoverDate(dateStr);
            }}
            onDragLeave={() => setDragHoverDate(null)}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId && onDropTask) onDropTask(taskId, dateStr);
              setDragHoverDate(null);
            }}
            title={isTodayDate ? "Go to Today (T)" : undefined}
            className={`
              relative flex flex-col items-center justify-center p-1 md:p-2 min-h-[48px] md:min-h-[56px] text-sm cursor-pointer
              border transition-all duration-200 rounded-2xl flex-1 shrink-0
              ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-600'}
              ${isSelected ? 'bg-pink-100 text-pink-700 font-medium shadow-sm border-transparent' : 'hover:bg-pink-50 border-transparent'}
              ${isTodayDate && !isSelected ? 'border-pink-100 text-pink-500' : ''}
              ${isHovered ? '!bg-pink-50/80 !border-pink-200 scale-105 z-10' : ''}
            `}
          >
            <span>{formattedDate}</span>
            {taskCount > 0 && (
              <div className="flex gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-300"></div>
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="flex gap-1 mb-1 flex-1 shrink-0" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="flex flex-col flex-1 min-h-0 pb-6">{rows}</div>;
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-3xl border border-pink-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col overflow-visible">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
