export const staffRanks = ["owner", "staff"] as const;
export type StaffRank = (typeof staffRanks)[number];

export const staffStatuses = ["active", "inactive"] as const;
export type StaffStatus = (typeof staffStatuses)[number];

const ownerEmails = ["taxhelping2day@gmail.com", "kingchandler19@gmail.com"];

export function isStaffRank(value: string): value is StaffRank {
  return staffRanks.some((rank) => rank === value);
}

export function isStaffStatus(value: string): value is StaffStatus {
  return staffStatuses.some((status) => status === value);
}

export function startingRank(email: string): StaffRank {
  return ownerEmails.includes(email.toLowerCase()) ? "owner" : "staff";
}

export function isActiveStaff(profile: { role: string; staffStatus: StaffStatus }): boolean {
  return profile.role === "staff" && profile.staffStatus === "active";
}

export function staffMayEnter(profile: { role: string; staffStatus: StaffStatus }, listed: boolean): boolean {
  if (profile.role !== "staff") return true;
  return profile.staffStatus === "active" && listed;
}

export function rankLabel(rank: StaffRank): "Owner" | "Staff" {
  switch (rank) {
    case "owner":
      return "Owner";
    case "staff":
      return "Staff";
    default: {
      const exhaustive: never = rank;
      return exhaustive;
    }
  }
}

export function statusLabel(status: StaffStatus): "Active" | "Inactive" {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function teammateUpdateError(input: {
  actorId: string;
  actorRank: StaffRank;
  targetId: string;
  nextRank: StaffRank;
  nextStatus: StaffStatus;
  activeOwnerIds: string[];
}): string | null {
  if (input.actorRank !== "owner") return "Only an owner can change teammates.";
  if (input.actorId === input.targetId) return "You can't change your own access.";
  const staysOwner = input.nextRank === "owner" && input.nextStatus === "active";
  const others = input.activeOwnerIds.filter((id) => id !== input.targetId);
  if (!staysOwner && others.length === 0) return "The desk needs at least one active owner.";
  return null;
}

export type TeammateRecord = {
  id: string;
  role: string;
  email: string;
  name: string;
  staffRank: StaffRank;
  staffStatus: StaffStatus;
};

export type TeammateDesk = {
  profiles: TeammateRecord[];
  returns: { owner: string | null; reviewerId: string | null }[];
  conversations: { assigneeId: string | null }[];
  staffAllowlist: string[];
};

export function applyTeammateUpdate(
  desk: TeammateDesk,
  id: string,
  patch: { name: string; staffRank: StaffRank; staffStatus: StaffStatus },
  envEmails: string[],
): "missing" | "not-staff" | "ok" {
  const profile = desk.profiles.find((item) => item.id === id);
  if (!profile) return "missing";
  if (profile.role !== "staff") return "not-staff";
  const becomingInactive = profile.staffStatus !== "inactive" && patch.staffStatus === "inactive";
  profile.name = patch.name;
  profile.staffRank = patch.staffRank;
  profile.staffStatus = patch.staffStatus;
  if (becomingInactive) {
    for (const row of desk.returns) {
      if (row.owner === id) row.owner = null;
      if (row.reviewerId === id) row.reviewerId = null;
    }
    for (const row of desk.conversations) {
      if (row.assigneeId === id) row.assigneeId = null;
    }
  }
  if (patch.staffStatus === "active" && !envEmails.map((email) => email.toLowerCase()).includes(profile.email.toLowerCase())) {
    if (!desk.staffAllowlist.includes(profile.email.toLowerCase())) desk.staffAllowlist.push(profile.email.toLowerCase());
  }
  return "ok";
}
