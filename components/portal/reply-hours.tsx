import type { HoursLine } from "@/lib/office-hours";

export function ReplyHours({ reply, lines }: { reply: string; lines: HoursLine[] }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm">{reply}</p>
      <ul className="grid gap-1.5">
        {lines.map((line) => (
          <li key={line.label} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span>{line.hours}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Central Time.</p>
    </div>
  );
}

export function ReplyHoursNote({ reply, lines }: { reply: string; lines: HoursLine[] }) {
  const schedule = lines.map((line) => `${line.label}, ${line.hours}`).join(" · ");
  return (
    <div className="border-t bg-muted/40 px-4 py-2.5">
      <p className="text-sm">{reply}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{schedule} · Central Time</p>
    </div>
  );
}
