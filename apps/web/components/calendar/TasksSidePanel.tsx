'use client';

import {
  CalendarIcon,
  CheckCircle2Icon,
  CheckSquareIcon,
  CircleIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

import { playSuccessChime } from '@/lib/utils/sound';

type Props = {
  open: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onCreateTask: (title: string, dueDate: Date) => Promise<boolean> | void;
  onOpenEvent: (id: string, rect: DOMRect) => void;
};

export function TasksSidePanel({
  open,
  onClose,
  events,
  onCreateTask,
  onOpenEvent,
}: Props) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');
  const [taskInput, setTaskInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('calendar_completed_tasks');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const [scratchpadNote, setScratchpadNote] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendar_scratchpad_notes') || '';
    }
    return '';
  });

  // Save completed tasks to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar_completed_tasks', JSON.stringify([...completedIds]));
    }
  }, [completedIds]);

  // Save notes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar_scratchpad_notes', scratchpadNote);
    }
  }, [scratchpadNote]);

  // Extract tasks from events
  const tasksList = useMemo(() => {
    return events
      .filter((ev) => ev.isTask || ev.title.includes('[Task]') || ev.description?.includes('#task'))
      .map((ev) => ({
        ...ev,
        completed: completedIds.has(ev.id),
      }));
  }, [events, completedIds]);

  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return tasksList.filter((t) => !t.completed);
    if (filter === 'completed') return tasksList.filter((t) => t.completed);
    return tasksList;
  }, [tasksList, filter]);

  const pendingCount = useMemo(() => {
    return tasksList.filter((t) => !t.completed).length;
  }, [tasksList]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    onCreateTask(taskInput.trim(), new Date());
    setTaskInput('');
  };

  const toggleTask = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        playSuccessChime();
      }
      return next;
    });
  };

  const clearCompleted = () => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      tasksList.forEach((t) => {
        if (t.completed) next.delete(t.id);
      });
      return next;
    });
  };

  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={[
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeTab === 'tasks'
                ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            ].join(' ')}
          >
            <CheckSquareIcon size={14} />
            <span>Tasks</span>
            {pendingCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0B57D0] px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={[
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeTab === 'notes'
                ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
            ].join(' ')}
          >
            <FileTextIcon size={14} />
            <span>Notes</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          title="Close Panel"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Tasks Tab View */}
      {activeTab === 'tasks' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Add Task Input Form */}
          <form onSubmit={handleAddTask} className="border-b border-gray-100 p-4 dark:border-gray-800">
            <div className="relative">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Add a task (press Enter)..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-2.5 pr-10 pl-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!taskInput.trim()}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-xl bg-[#0B57D0] p-1.5 text-white disabled:opacity-40 transition hover:bg-blue-700"
              >
                <PlusIcon size={15} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(['pending', 'all', 'completed'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilter(mode)}
                    className={[
                      'rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition',
                      filter === mode
                        ? 'bg-blue-50 font-semibold text-[#0B57D0] dark:bg-blue-950 dark:text-blue-300'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                    ].join(' ')}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {tasksList.some((t) => t.completed) && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="text-[11px] font-medium text-red-500 hover:text-red-700 transition"
                >
                  Clear Done
                </button>
              )}
            </div>
          </form>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                {filter === 'pending'
                  ? 'All tasks completed! Great job.'
                  : 'No tasks found.'}
              </div>
            ) : (
              filteredTasks.map((task) => {
                let dueLabel = 'Today';
                try {
                  const d = parseISO(task.start);
                  if (isToday(d)) dueLabel = 'Today';
                  else if (isTomorrow(d)) dueLabel = 'Tomorrow';
                  else dueLabel = format(d, 'MMM d');
                } catch {
                  dueLabel = 'Scheduled';
                }

                return (
                  <div
                    key={task.id}
                    className={[
                      'group flex items-start gap-3 rounded-2xl border p-3.5 transition cursor-pointer',
                      task.completed
                        ? 'border-gray-100 bg-gray-50/60 opacity-60 dark:border-gray-800 dark:bg-gray-900/40'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-xs dark:border-gray-800 dark:bg-gray-850 dark:hover:border-blue-700',
                    ].join(' ')}
                    onClick={(e) => onOpenEvent(task.id, e.currentTarget.getBoundingClientRect())}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      className="mt-0.5 text-gray-400 hover:text-blue-600 transition shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2Icon size={18} className="text-emerald-500" />
                      ) : (
                        <CircleIcon size={18} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={[
                          'text-sm font-medium',
                          task.completed
                            ? 'text-gray-400 line-through dark:text-gray-500'
                            : 'text-gray-900 dark:text-white',
                        ].join(' ')}
                      >
                        {task.title}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        <CalendarIcon size={11} className="text-gray-400" />
                        {dueLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Notes Tab View */}
      {activeTab === 'notes' && (
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Scratchpad (Auto-saved)</span>
            <button
              type="button"
              onClick={() => setScratchpadNote('')}
              className="text-gray-400 hover:text-red-500 transition"
              title="Clear note"
            >
              <Trash2Icon size={14} />
            </button>
          </div>
          <textarea
            value={scratchpadNote}
            onChange={(e) => setScratchpadNote(e.target.value)}
            placeholder="Write meeting thoughts, agenda, or reminders here..."
            className="flex-1 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      )}
    </aside>
  );
}
