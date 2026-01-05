import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

function round2(n) {
  return Math.round(n * 100) / 100;
}
function calcHours(start, end) {
  const mins = (end.getTime() - start.getTime()) / 60000;
  return round2(mins / 60);
}
function stripHoursSuffix(title) {
  return title.replace(/\s*\(\d+(\.\d+)?h\)\s*$/, "");
}

export default function CalendarView({ calendars, events, onEventsChange }) {
  const calendarMap = useMemo(() => {
    const map = new Map();
    for (const c of calendars) map.set(c.id, c);
    return map;
  }, [calendars]);

  const options = useMemo(
    () => ({
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: "timeGridWeek",
      height: "80vh",
      selectable: true,
      editable: true,
      nowIndicator: true,

      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },

      select: (info) => {
        const title = prompt("Title (e.g., Shift - Job / Task):");
        if (!title) return;

        const names = calendars.map((c) => c.name).join(", ");
        const chosenName = prompt(`Which calendar? (${names})`, "Personal");
        const chosen = calendars.find((c) => c.name.toLowerCase() === (chosenName || "").toLowerCase());
        const cal = chosen || calendars.find((c) => c.name === "Personal") || calendars[0];

        const hours = calcHours(info.start, info.end);

        const newEvent = {
          id: crypto.randomUUID(),
          title: `${title} (${hours}h)`,
          start: info.start,
          end: info.end,
          backgroundColor: cal?.color,
          borderColor: cal?.color,
          extendedProps: { hours, calendarId: cal.id },
        };

        onEventsChange((prev) => [...prev, newEvent]);
      },

      eventChange: (change) => {
        const start = change.event.start;
        const end = change.event.end;
        if (!start || !end) return;

        const hours = calcHours(start, end);
        const baseTitle = stripHoursSuffix(change.event.title);

        const calendarId = change.event.extendedProps?.calendarId || "personal";
        const cal = calendarMap.get(calendarId);

        onEventsChange((prev) =>
          prev.map((e) =>
            e.id === change.event.id
              ? {
                  ...e,
                  title: `${baseTitle} (${hours}h)`,
                  start,
                  end,
                  backgroundColor: cal.color,
                  borderColor: cal.color,
                  extendedProps: { ...e.extendedProps, hours, calendarId },
                }
              : e
          )
        );
      },

      events,
    }),
    [events, onEventsChange, calendarMap]
  );

  return <FullCalendar {...options} />;
}
