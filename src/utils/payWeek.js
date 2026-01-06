export function startOfPayWeek(date, weekStartDow = 4) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (dow - weekStartDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function fmtRange(startDate) {
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);

  const fmt = (x) =>
    x.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return `${fmt(startDate)} – ${fmt(end)}`;
}

export function ymd(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
