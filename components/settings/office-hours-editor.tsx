"use client";

import { useState, useTransition } from "react";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveOfficeHoursAction } from "@/lib/office-hours-actions";
import { officeHoursError, weekdayLabel, weekdays, type DayHours, type OfficeHours, type Weekday } from "@/lib/office-hours";

export function OfficeHoursEditor({ saved, hours: initial }: { saved: boolean; hours: OfficeHours }) {
  const [hours, setHours] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [published, setPublished] = useState(saved);
  const [notice, setNotice] = useState<string | null>(saved ? "Clients see this on their home page, in Messages, and in Settings." : "Save to show this schedule in the client portal.");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(hours) !== JSON.stringify(baseline);

  function patch(day: Weekday, change: Partial<DayHours>) {
    setNotice(null);
    setError(null);
    setHours((current) => ({
      ...current,
      days: { ...current.days, [day]: { ...current.days[day], ...change } },
    }));
  }

  function save() {
    const problem = officeHoursError(hours);
    if (problem) {
      setError(problem);
      setNotice(null);
      return;
    }
    startTransition(async () => {
      const result = await saveOfficeHoursAction(hours);
      setError(result.error);
      if (result.error) {
        setNotice(null);
        return;
      }
      setBaseline(hours);
      setPublished(true);
      setNotice("Saved. Clients can see this in the portal.");
    });
  }

  return (
    <SettingsSection
      title="Weekly hours"
      description="Clients use this to see when a message gets a reply. Times are Central Time."
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          {error ? <p role="alert" className="mr-auto text-sm text-destructive">{error}</p> : null}
          {!error && notice ? <p className="mr-auto text-sm text-muted-foreground">{notice}</p> : null}
          <Button type="button" onClick={save} disabled={pending || (published && !dirty)}>
            {pending ? "Saving" : "Save hours"}
          </Button>
        </div>
      }
    >
      <ul className="flex flex-col gap-2">
        {weekdays.map((day) => {
          const row = hours.days[day];
          return (
            <li key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2">
              <span className="w-28 text-sm">{weekdayLabel[day]}</span>
              <Button
                type="button"
                size="sm"
                variant={row.closed ? "outline" : "secondary"}
                aria-pressed={!row.closed}
                className="w-20"
                onClick={() => patch(day, { closed: !row.closed })}
              >
                {row.closed ? "Closed" : "Open"}
              </Button>
              <Input
                type="time"
                aria-label={`${weekdayLabel[day]} opens`}
                value={row.open}
                disabled={row.closed}
                className="w-36"
                onChange={(event) => {
                  const value = event.target.value.slice(0, 5);
                  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) patch(day, { open: value });
                }}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                aria-label={`${weekdayLabel[day]} closes`}
                value={row.close}
                disabled={row.closed}
                className="w-36"
                onChange={(event) => {
                  const value = event.target.value.slice(0, 5);
                  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) patch(day, { close: value });
                }}
              />
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
}
