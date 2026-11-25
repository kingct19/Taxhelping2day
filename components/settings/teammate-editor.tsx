"use client";

import { useState } from "react";
import { updateTeammate } from "@/lib/actions";
import { rankLabel, staffRanks, staffStatuses, statusLabel, type StaffRank, type StaffStatus } from "@/lib/teammates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TeammateEditor({
  person,
}: {
  person: { id: string; name: string; email: string; staffRank: StaffRank; staffStatus: StaffStatus };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [staffRank, setStaffRank] = useState<StaffRank>(person.staffRank);
  const [staffStatus, setStaffStatus] = useState<StaffStatus>(person.staffStatus);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const displayName = name.trim() || person.email;
  const rankItems = staffRanks.map((rank) => ({ label: rankLabel(rank), value: rank }));
  const statusItems = staffStatuses.map((status) => ({ label: statusLabel(status), value: status }));

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setName(person.name);
      setStaffRank(person.staffRank);
      setStaffStatus(person.staffStatus);
      setConfirming(false);
      setError("");
    }
  }

  async function save() {
    const formData = new FormData();
    formData.set("id", person.id);
    formData.set("name", name.trim());
    formData.set("staffRank", staffRank);
    formData.set("staffStatus", staffStatus);
    const result = await updateTeammate(formData);
    if (result.error) {
      setError(result.error);
      setConfirming(false);
      return;
    }
    setError("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit teammate</DialogTitle>
          <DialogDescription>{person.email}</DialogDescription>
        </DialogHeader>
        {confirming ? (
          <p className="text-sm">
            {displayName} will lose desk access. Preparer, reviewer, and inbox assignments will be cleared.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`teammate-name-${person.id}`}>Name</Label>
              <Input id={`teammate-name-${person.id}`} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select items={rankItems} value={staffRank} onValueChange={(value) => { if (value === "owner" || value === "staff") setStaffRank(value); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {staffRanks.map((rank) => <SelectItem key={rank} value={rank}>{rankLabel(rank)}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select items={statusItems} value={staffStatus} onValueChange={(value) => { if (value === "active" || value === "inactive") setStaffStatus(value); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {staffStatuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <DialogFooter>
          {confirming ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>Back</Button>
              <Button type="button" variant="destructive" onClick={() => void save()}>Make inactive</Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => {
                if (staffStatus === "inactive" && person.staffStatus !== "inactive") {
                  setConfirming(true);
                  return;
                }
                void save();
              }}
            >
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeammateBadges({ staffRank, staffStatus }: { staffRank: StaffRank; staffStatus: StaffStatus }) {
  return (
    <>
      <Badge variant={staffRank === "owner" ? "info" : "neutral"}>{rankLabel(staffRank)}</Badge>
      <Badge variant={staffStatus === "active" ? "success" : "destructive"}>{statusLabel(staffStatus)}</Badge>
    </>
  );
}
