import { useMemo, useState } from "react";
import CalendarView from "./components/CalendarView.jsx";
import { useLocalStorage } from "./hooks/useLocalStorage.js";

const DEFAULT_CALENDARS = [
  { id: "personal", name: "Personal", color: "#a78bfa", enabled: true, type: "general" },
];

function makeId() {
  return crypto.randomUUID();
}

const PASTELS = ["#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#fb923c", "#facc15"];

export default function App() {
  const [calendars, setCalendars] = useLocalStorage("workaholic_calendars", DEFAULT_CALENDARS);
  const [events, setEvents] = useLocalStorage("workaholic_events", []);
  const [newName, setNewName] = useState("");

  const enabledCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.enabled).map((c) => c.id)),
    [calendars]
  );

  const visibleEvents = useMemo(
    () => events.filter((e) => enabledCalendarIds.has(e.extendedProps?.calendarId)),
    [events, enabledCalendarIds]
  );

  const toggleCalendar = (id) => {
    setCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const addCalendar = () => {
    const name = newName.trim();
    if (!name) return;

    const color = PASTELS[calendars.length % PASTELS.length];

    setCalendars((prev) => [
      ...prev,
      { id: makeId(), name, color, enabled: true, type: "job" },
    ]);
    setNewName("");
  };

  const deleteCalendar = (id) => {
    // Don't allow deleting Personal
    if (calendars.find((c) => c.id === id)?.name === "Personal") return;

    setCalendars((prev) => prev.filter((c) => c.id !== id));
    // Also remove events that belonged to that calendar
    setEvents((prev) => prev.filter((e) => e.extendedProps?.calendarId !== id));
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4">
          <h1 className="text-3xl font-semibold tracking-tight">Workaholic</h1>
          <p className="mt-1 text-sm opacity-80">
            Add calendars (jobs) in the sidebar. Toggle them on/off.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl bg-[var(--card)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
                Calendars
              </h2>
            </div>

            {/* Add calendar */}
            <div className="mt-3 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add a job (ex: SEAS Office)"
                className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={addCalendar}
                className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
              >
                +
              </button>
            </div>

            {/* List */}
            <div className="mt-4 space-y-2">
              {calendars.map((cal) => (
                <div
                  key={cal.id}
                  className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 shadow-sm"
                >
                  <label className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: cal.color }} />
                    <span className="text-sm">{cal.name}</span>
                    <input
                      type="checkbox"
                      checked={cal.enabled}
                      onChange={() => toggleCalendar(cal.id)}
                      className="ml-2 h-4 w-4"
                    />
                  </label>

                  {cal.name !== "Personal" && (
                    <button
                      onClick={() => deleteCalendar(cal.id)}
                      className="text-xs opacity-60 hover:opacity-100"
                      title="Delete calendar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>

          <main className="rounded-2xl bg-[var(--card)] p-3 shadow-sm">
            <CalendarView calendars={calendars} events={visibleEvents} onEventsChange={setEvents} />
          </main>
        </div>
      </div>
    </div>
  );
}
