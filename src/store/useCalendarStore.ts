import { create } from "zustand";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  color?: string;
  category?: string;
}

interface CalendarStore {
  events: CalendarEvent[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  events: [],

  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
    })),

  updateEvent: (updatedEvent) =>
    set((state) => ({
      events: state.events.map((ev) =>
        ev.id === updatedEvent.id ? updatedEvent : ev
      ),
    })),

  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((ev) => ev.id !== id),
    })),
}));
