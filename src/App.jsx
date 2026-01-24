import { useMemo, useState } from "react";
import CalendarView from "./components/CalendarView.jsx";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { startOfPayWeek, fmtRange, ymd } from "./utils/payWeek.js";

const DEFAULT_CALENDARS = [
  { id: "personal", name: "Personal", color: "#a78bfa", enabled: true, type: "general" , pay: {weekStart: 4, weeklyLimit: null}},
];

function makeId() {
  return crypto.randomUUID();
}

const PASTELS = ["#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#fb923c", "#facc15"];

export default function App() {
  const [calendars, setCalendars] = useLocalStorage("workaholic_calendars", DEFAULT_CALENDARS);
  const [events, setEvents] = useLocalStorage("workaholic_events", []);
  const [weeklyLimitTotal, setWeeklyLimitTotal] = useLocalStorage(
  "workaholic_weekly_limit_total",
  20
);

  const [activeCalendarId, setActiveCalendarId] = useState(
    calendars.find((c) => c.enabled)?.id || calendars[0].id
  );
  const [newName, setNewName] = useState("");

  const getHoursFromEvent = (e) => {
  const start = e?.start ? new Date(e.start) : null;
  const end = e?.end ? new Date(e.end) : null;
  if (!start || !end) return 0;
  return Math.round(((end - start) / 3600000) * 100) / 100; // ms -> hours, 2 decimals
};

 const jobCalIds = useMemo(
  () => new Set(calendars.filter((c) => c.type === "job").map((c) => c.id)),
  [calendars]
);
 

  const enabledCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.enabled).map((c) => c.id)),
    [calendars]
  );

  const visibleEvents = useMemo(
    () => events.filter((e) => enabledCalendarIds.has(e.extendedProps?.calendarId)),
    [events, enabledCalendarIds]
  );
const [selectedWeekKey, setSelectedWeekKey] = useLocalStorage(
  "workaholic_selected_week_key",
  ymd(startOfPayWeek(new Date(), 4))
);

const selectedWeekStart = useMemo(
  () => new Date(selectedWeekKey + "T00:00:00"),
  [selectedWeekKey]
);

const hoursByCalendarThisWeek = useMemo(() => {
  const map = {}; // calId -> hours
  for (const e of events) {
    const calId = e.extendedProps?.calendarId;
    if (!calId) continue;

    const start = e.start ? new Date(e.start) : null;
    if (!start) continue;

    const weekKey = ymd(startOfPayWeek(start, 4));
    if (weekKey !== selectedWeekKey) continue;

    map[calId] = (map[calId] || 0) + getHoursFromEvent(e);
  }
  return map;
}, [events, selectedWeekKey]);

  const toggleCalendar = (id) => {
  setCalendars((prev) =>
    prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
  );

  if (activeCalendarId === id) {
    const next = calendars.find((c) => c.id !== id && c.enabled);
    if (next) setActiveCalendarId(next.id);
  }
};

  const addCalendar = () => {
    const name = newName.trim();
    if (!name) return;

    const color = PASTELS[calendars.length % PASTELS.length];

    setCalendars((prev) => [
      ...prev,
      { id: makeId(), name, color, enabled: true, type: "job", pay: {weekStart:4, weeklyLimit:20} },
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
  const weeklyTotals = useMemo(() => {
  const jobCalIds = new Set(calendars.filter((c) => c.type === "job").map((c) => c.id));

  // totals[weekKey] = hours
  const totals = new Map();

  for (const e of events) {
    const calId = e.extendedProps?.calendarId;
    if (!calId || !jobCalIds.has(calId)) continue;

    const start = e.start ? new Date(e.start) : null;
    if (!start) continue;

    const hours = getHoursFromEvent(e);
    const weekStart = startOfPayWeek(start, 4); // Thu start
    const weekKey = ymd(weekStart);

    totals.set(weekKey, (totals.get(weekKey) || 0) + hours);
  }

  return totals;
}, [events, calendars]);

const weeklyWarnings = useMemo(() => {
  if (weeklyLimitTotal == null) return [];

  const warnings = [];
  for (const [weekKey, hours] of weeklyTotals.entries()) {
    if (hours > weeklyLimitTotal) {
      const weekStart = new Date(weekKey + "T00:00:00");
      warnings.push({
        weekKey,
        rangeLabel: fmtRange(weekStart),
        hours,
        limit: weeklyLimitTotal,
      });
    }
  }

  // newest first
  warnings.sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1));
  return warnings;
}, [weeklyTotals, weeklyLimitTotal]);


const selectedWeekJobHours = useMemo(() => {
  let total = 0;
  for (const e of events) {
    const calId = e.extendedProps?.calendarId;
    if (!calId || !jobCalIds.has(calId)) continue;

    const start = e.start ? new Date(e.start) : null;
    if (!start) continue;

    const weekKey = ymd(startOfPayWeek(start, 4));
    if (weekKey !== selectedWeekKey) continue;

    total += getHoursFromEvent(e);
  }
  return Math.round(total * 100) / 100;
}, [events, jobCalIds, selectedWeekKey]);


    return (
    <div className="max-w-6xl mx-auto">
      {/* Center the app */}
      <div className="px-10 mx-auto">
         <header className="mb-8 text-center">
          <h1 className="text-5xl font-semibold tracking-tight">Workaholic</h1>
          <p className="mt-2 text-sm text-black/60">Scheduling multiple jobs made easy.</p>
        </header>

        <div className="grid w-full grid-cols-[380px_minmax(0,1fr)] gap-12 items-start">
          {/* Sidebar */}
          <aside className="min-w-0">
            <div className="p-6 space-y-10">
              {/* Weekly limit */}
              <section className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Weekly limit (Thu–Wed)
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={weeklyLimitTotal ?? ""}
                    onChange={(e) =>
                      setWeeklyLimitTotal(e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="w-28 rounded-full bg-white/80 px-4 py-2 text-sm ring-1 ring-black/10 outline-none focus:ring-black/20"
                    placeholder="20"
                  />
                  <span className="text-sm text-black/55">hours</span>
                </div>

                <div className="text-sm text-black/70">
                  Selected week:{" "}
                  <span className="tabular font-semibold text-black/85">{selectedWeekJobHours.toFixed(2)}</span>
                  {weeklyLimitTotal != null && (
                    <>
                      {" "}
                      / <span className="tabular font-semibold text-black/85">{weeklyLimitTotal}</span>h
                    </>
                  )}
                </div>
              </section>

              <div className="h-px bg-black/5 my-6" />

              {/* Week picker */}
              <section className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Pay week (Thu–Wed)
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    className="h-9 w-9 rounded-full bg-white/80 ring-1 ring-black/10 hover:bg-white"
                    onClick={() => {
                      const d = new Date(selectedWeekStart);
                      d.setDate(d.getDate() - 7);
                      setSelectedWeekKey(ymd(d));
                    }}
                    aria-label="Previous week"
                  >
                    ←
                  </button>

                  <div className="text-sm font-medium text-black/80">{fmtRange(selectedWeekStart)}</div>

                  <button
                    className="h-9 w-9 rounded-full bg-white/80 ring-1 ring-black/10 hover:bg-white"
                    onClick={() => {
                      const d = new Date(selectedWeekStart);
                      d.setDate(d.getDate() + 7);
                      setSelectedWeekKey(ymd(d));
                    }}
                    aria-label="Next week"
                  >
                    →
                  </button>
                </div>

                <button
                  className="w-full rounded-full bg-white/80 px-4 py-2 text-sm ring-1 ring-black/10 hover:bg-white"
                  onClick={() => setSelectedWeekKey(ymd(startOfPayWeek(new Date(), 4)))}
                >
                  Jump to this week
                </button>
              </section>

              {/* Warnings */}
              {weeklyWarnings.length > 0 && (
                <>
                  <div className="h-px bg-black/10" />
                  <section className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                      Warnings
                    </div>

                    <div className="space-y-2">
                      {weeklyWarnings.slice(0, 3).map((w) => (
                        <div key={w.weekKey} className="rounded-2xl bg-rose-50 px-4 py-3 text-xs ring-1 ring-rose-100">
                          <div className="font-medium text-rose-900">
                            Hours exceeded — {w.rangeLabel}
                          </div>
                          <div className="mt-1 text-rose-900/70">
                            <span className="tabular">{w.hours.toFixed(2)}h</span> /{" "}
                            <span className="tabular">{w.limit}h</span> total
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <div className="h-px bg-black/10" />

              {/* Calendars */}
              <section className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-black/45">Calendars</div>

                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Add a job (e.g., SEAS Office)"
                    className="w-full rounded-full bg-white/80 px-4 py-2 text-sm ring-1 ring-black/10 outline-none focus:ring-black/20"
                  />
                  <button
                    onClick={addCalendar}
                    className="rounded-full bg-white/80 px-4 py-2 text-sm ring-1 ring-black/10 hover:bg-white"
                    aria-label="Add calendar"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {calendars.map((cal) => {
                    const isActive = activeCalendarId === cal.id;
                    const hours = hoursByCalendarThisWeek[cal.id] || 0;

                    return (
                      <div
                        key={cal.id}
                        onClick={() => setActiveCalendarId(cal.id)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 ring-1 cursor-pointer
                          ${isActive ? "bg-white ring-black/10" : "bg-white/50 ring-black/5 hover:bg-white/70"}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ background: cal.color }} />
                          <div className="flex flex-col leading-tight">
                            <span className="text-sm font-medium text-black/80">{cal.name}</span>
                            <span className="tabular text-xs text-black/45">{hours.toFixed(2)} h</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cal.enabled}
                            onChange={() => toggleCalendar(cal.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4"
                            aria-label={`Toggle ${cal.name}`}
                          />

                          {cal.name !== "Personal" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCalendar(cal.id);
                              }}
                              className="h-8 w-8 rounded-full bg-white/70 ring-1 ring-black/10 hover:bg-white flex items-center justify-center text-black/50"
                              aria-label={`Delete ${cal.name}`}
                              title="Delete calendar"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </aside>

          {/* Calendar */}
          <main className="min-w-0">
             <div className="rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-black/10 p-6">
              <CalendarView
                calendars={calendars}
                events={visibleEvents}
                activeCalendarId={activeCalendarId}
                onEventsChange={setEvents}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}