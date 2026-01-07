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
    <div className="min-h-screen px-10 py-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-6">
          <h1 className="text-5xl font-semibold tracking-tight">Workaholic</h1>
          <p className="mt-2 text-sm opacity-90">Scheduling multiple jobs made easy.</p>
        </header>
    
    <div className="grid gap-10 items-start md:grid-cols-[360px_1fr]">
      <aside className="rounded-3xl bg-white/60 backdrop-blur-xl ring-1 ring-black/5 shadow-sm">

        {/* Weekly limit card*/}
        <div className="p-5 space-y-8">
            <div className="text-xs font-semibold tracking-wide opacity-80">
              Maximum Hours to work in a pay week (Thursday to Wednesday) 
            </div>
     
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={weeklyLimitTotal ?? ""}
                onChange={(e) =>
                  setWeeklyLimitTotal(e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-24 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none"
                placeholder="20"
              />
            <span className="text-sm opacity-70">hours</span>
          </div>
      </div>

      {/* Week picker card*/}
      <div className="glass-strong rounded-2xl p-3 shadow-sm space-y-2">
        <div className="text-xs font-semibold tracking-wide opacity-70">
          Pay week (Thursday to Wednesday)
        </div>

        <div className="flex items-center justify-between gap-2">
            <button
            className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
            onClick={() => {
              const d = new Date(selectedWeekStart);
              d.setDate(d.getDate() - 7);
              setSelectedWeekKey(ymd(d));
            }}
            >
          ←
            </button>

            <div className="text-sm font-medium">{fmtRange(selectedWeekStart)}</div>

            <button
              className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
              onClick={() => {
                const d = new Date(selectedWeekStart);
                d.setDate(d.getDate() + 7);
                setSelectedWeekKey(ymd(d));
              }}
            >
               →
            </button>
           </div>

          <button
          className="w-full rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
          onClick={() => setSelectedWeekKey(ymd(startOfPayWeek(new Date(), 4)))}
          >
          Jump to this week
          </button>
      </div>

  <div className="text-sm">
    Selected week: {" "}
    <span className="tabular font-medium">{selectedWeekJobHours.toFixed(2)}</span>
    {weeklyLimitTotal != null && (
      <>
        {" "}
        / <span className="font-medium">{weeklyLimitTotal}</span>h
      </>
    )}
  </div>


{weeklyWarnings.length > 0 && (
  <div className="glass-strong rounded-2xl bg-white/70 p-3 shadow-sm space-y-2">
    <div className="text-xs font-bold uppercase tracking-wide text-rose-600">
      Warnings: 
    </div>

    <div className="space-y-2">
      {weeklyWarnings.map((w) => (
        <div key={w.weekKey} className="rounded-xl bg-rose-50 px-3 py-2 text-xs">
          <div className="font-medium">
            Hours exceeded for the week of {w.rangeLabel}
          </div>
          <div className="opacity-80">
            {w.hours.toFixed(2)}h / {w.limit}h total
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{/*Calendars card*/}
   <div className="glass-strong rounded-2xl p-3 shadow-sm space-y-3">
    <div className="flex items-center justify-between">
     <h2 className="text-sm font-semibold tracking-wide opacity-70">
      Calendars
     </h2>
   </div>

    {/* Add calendar */}
     <div className="flex gap-2">
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
      <div className="space-y-2">
        {calendars.map((cal) => (
          <div
            key={cal.id}
            onClick={() => setActiveCalendarId(cal.id)}
            className={`flex items-center justify-between rounded-xl px-3 py-2 shadow-sm cursor-pointer
              ${activeCalendarId === cal.id ? "bg-white" : "bg-white/60"}`}               
            >
            <label className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: cal.color }} />
              <div className="flex flex-col">
                <span className="text-sm">{cal.name}</span> 
                <span className="tabular text-xs opacity-60">
                  {((hoursByCalendarThisWeek[cal.id] || 0)).toFixed(2)} h
                </span>
            </div>

            <input
              type="checkbox"
              checked={cal.enabled}
              onChange={() => toggleCalendar(cal.id)}
              className="ml-2 h-4 w-4"
            />
          </label>

          {cal.name !== "Personal" && (
              <button
                 onClick={(e) => {
                    e.stopPropagation();
                    deleteCalendar(cal.id);
                 }}
                  className="text-xs opacity-60 hover:opacity-100"
                  title="Delete calendar"
                 >
                   ✕
                 </button>
                  )}
                </div>
              ))}
            </div>
            </div>
          </aside>
          
           <main className="rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-black/5 shadow-sm overflow-hidden">
           <div className="p-3"> 
            <CalendarView 
            calendars={calendars} 
            events={visibleEvents} 
            activeCalendarId={activeCalendarId}
            onEventsChange={setEvents} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
