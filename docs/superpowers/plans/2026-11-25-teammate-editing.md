# Teammate Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Owner edits another teammate's name, role, and status from the teammates table, and setting someone inactive removes their desk access and clears their assignments.

**Architecture:** Pure rules live in `lib/teammates.ts` and are what the tests call. The store persists `staffRank` and `staffStatus` and clears preparer, reviewer, and inbox assignee only when status changes to inactive. Auth treats inactive as signed out even when the email is on the staff list. The teammates page opens an edit dialog for Owners.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SQL migrations, local JSON store in `lib/store.ts`, node:assert scripts.

## Global Constraints

- Starting Owners are exactly `taxhelping2day@gmail.com` (Laura Wallace) and `kingchandler19@gmail.com`. `chandler@studiosozo.dev` starts as Staff.
- `profiles.role` stays `client` or `staff`. New fields are `staffRank` (`owner` | `staff`, default `staff`) and `staffStatus` (`active` | `inactive`, default `active`).
- Error copy, verbatim: `Only an owner can change teammates.` / `You can't change your own access.` / `The desk needs at least one active owner.`
- Inactive denies desk access even when the email is in `STAFF_EMAILS` or `staff_allowlist`. Do not delete the Clerk user.
- `ensureStaff` sets a starting Owner only on the insert. It does not rewrite a saved rank or status.
- Reactivating does not restore cleared assignments. It sets status active and upserts `staff_allowlist` when the email is not in `STAFF_EMAILS`.
- A name-only or rank-only save does not clear assignments.
- The signed-in row has no Edit control. Staff do not see Edit and do not see Invite teammate.
- Confirm copy before inactive includes the person's name, loss of desk access, and clearing of preparer, reviewer, and inbox assignments.
- Blank names display as `Staff`. Email is not editable.

---

### Task 1: Teammate rules

**Files:**
- Create: `lib/teammates.ts`
- Create: `scripts/teammate-check.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export const staffRanks = ["owner", "staff"] as const`
  - `export type StaffRank = "owner" | "staff"`
  - `export const staffStatuses = ["active", "inactive"] as const`
  - `export type StaffStatus = "active" | "inactive"`
  - `export function isStaffRank(value: string): value is StaffRank`
  - `export function isStaffStatus(value: string): value is StaffStatus`
  - `export function startingRank(email: string): StaffRank`
  - `export function isActiveStaff(profile: { role: string; staffStatus: StaffStatus }): boolean`
  - `export function staffMayEnter(profile: { role: string; staffStatus: StaffStatus }, listed: boolean): boolean`
  - `export function rankLabel(rank: StaffRank): "Owner" | "Staff"`
  - `export function statusLabel(status: StaffStatus): "Active" | "Inactive"`
  - `export function teammateUpdateError(input: { actorId: string; actorRank: StaffRank; targetId: string; nextRank: StaffRank; nextStatus: StaffStatus; activeOwnerIds: string[] }): string | null`
  - `export type TeammateDesk = { profiles: TeammateRecord[]; returns: { owner: string | null; reviewerId: string | null }[]; conversations: { assigneeId: string | null }[]; staffAllowlist: string[] }`
  - `export type TeammateRecord = { id: string; role: string; email: string; name: string; staffRank: StaffRank; staffStatus: StaffStatus }`
  - `export function applyTeammateUpdate(desk: TeammateDesk, id: string, patch: { name: string; staffRank: StaffRank; staffStatus: StaffStatus }, envEmails: string[]): "missing" | "not-staff" | "ok"`

- [ ] **Step 1: Write the failing test**

Create `scripts/teammate-check.ts`:

```ts
import assert from "node:assert/strict";
import {
  applyTeammateUpdate,
  isActiveStaff,
  rankLabel,
  staffMayEnter,
  startingRank,
  statusLabel,
  teammateUpdateError,
  type TeammateDesk,
} from "../lib/teammates";

const owners = ["owner-laura", "owner-you"];

assert.equal(startingRank("TaxHelping2Day@gmail.com"), "owner");
assert.equal(startingRank("kingchandler19@gmail.com"), "owner");
assert.equal(startingRank("chandler@studiosozo.dev"), "staff");
assert.equal(rankLabel("owner"), "Owner");
assert.equal(rankLabel("staff"), "Staff");
assert.equal(statusLabel("active"), "Active");
assert.equal(statusLabel("inactive"), "Inactive");
assert.equal(isActiveStaff({ role: "staff", staffStatus: "active" }), true);
assert.equal(isActiveStaff({ role: "staff", staffStatus: "inactive" }), false);
assert.equal(isActiveStaff({ role: "client", staffStatus: "active" }), false);
assert.equal(staffMayEnter({ role: "staff", staffStatus: "inactive" }, true), false);
assert.equal(staffMayEnter({ role: "staff", staffStatus: "active" }, true), true);
assert.equal(staffMayEnter({ role: "staff", staffStatus: "active" }, false), false);
assert.equal(staffMayEnter({ role: "client", staffStatus: "inactive" }, false), true);

assert.equal(
  teammateUpdateError({ actorId: "staff-1", actorRank: "staff", targetId: "staff-2", nextRank: "staff", nextStatus: "inactive", activeOwnerIds: owners }),
  "Only an owner can change teammates.",
);
assert.equal(
  teammateUpdateError({ actorId: "owner-you", actorRank: "owner", targetId: "owner-you", nextRank: "staff", nextStatus: "inactive", activeOwnerIds: owners }),
  "You can't change your own access.",
);
assert.equal(
  teammateUpdateError({ actorId: "owner-you", actorRank: "owner", targetId: "owner-laura", nextRank: "staff", nextStatus: "active", activeOwnerIds: ["owner-laura"] }),
  "The desk needs at least one active owner.",
);
assert.equal(
  teammateUpdateError({ actorId: "owner-you", actorRank: "owner", targetId: "staff-2", nextRank: "owner", nextStatus: "active", activeOwnerIds: owners }),
  null,
);

function desk(): TeammateDesk {
  return {
    profiles: [
      { id: "owner-laura", role: "staff", email: "taxhelping2day@gmail.com", name: "Laura Wallace", staffRank: "owner", staffStatus: "active" },
      { id: "staff-2", role: "staff", email: "prep@example.com", name: "Pat Preparer", staffRank: "staff", staffStatus: "active" },
      { id: "client-1", role: "client", email: "client@example.com", name: "Ada Client", staffRank: "staff", staffStatus: "active" },
    ],
    returns: [{ owner: "staff-2", reviewerId: "staff-2" }, { owner: "owner-laura", reviewerId: null }],
    conversations: [{ assigneeId: "staff-2" }, { assigneeId: "owner-laura" }],
    staffAllowlist: ["prep@example.com"],
  };
}

const renamed = desk();
assert.equal(applyTeammateUpdate(renamed, "staff-2", { name: "Pat P.", staffRank: "owner", staffStatus: "active" }, []), "ok");
assert.equal(renamed.profiles[1].name, "Pat P.");
assert.equal(renamed.profiles[1].staffRank, "owner");
assert.equal(renamed.returns[0].owner, "staff-2");
assert.equal(renamed.conversations[0].assigneeId, "staff-2");

const cleared = desk();
assert.equal(applyTeammateUpdate(cleared, "staff-2", { name: "Pat Preparer", staffRank: "staff", staffStatus: "inactive" }, []), "ok");
assert.equal(cleared.profiles[1].staffStatus, "inactive");
assert.equal(cleared.returns[0].owner, null);
assert.equal(cleared.returns[0].reviewerId, null);
assert.equal(cleared.returns[1].owner, "owner-laura");
assert.equal(cleared.conversations[0].assigneeId, null);
assert.equal(cleared.conversations[1].assigneeId, "owner-laura");

const again = desk();
again.profiles[1].staffStatus = "inactive";
again.returns[0] = { owner: null, reviewerId: null };
assert.equal(applyTeammateUpdate(again, "staff-2", { name: "Pat Preparer", staffRank: "staff", staffStatus: "inactive" }, []), "ok");
assert.deepEqual(again.returns[0], { owner: null, reviewerId: null });

const restored = desk();
restored.profiles[1].staffStatus = "inactive";
restored.staffAllowlist = [];
assert.equal(applyTeammateUpdate(restored, "staff-2", { name: "Pat Preparer", staffRank: "staff", staffStatus: "active" }, ["taxhelping2day@gmail.com"]), "ok");
assert.equal(restored.profiles[1].staffStatus, "active");
assert.equal(restored.returns[0].owner, "staff-2");
assert.deepEqual(restored.staffAllowlist, ["prep@example.com"]);

const envOwner = desk();
envOwner.profiles[0].staffStatus = "inactive";
assert.equal(applyTeammateUpdate(envOwner, "owner-laura", { name: "Laura Wallace", staffRank: "owner", staffStatus: "active" }, ["taxhelping2day@gmail.com"]), "ok");
assert.deepEqual(envOwner.staffAllowlist, ["prep@example.com"]);

assert.equal(applyTeammateUpdate(desk(), "missing", { name: "", staffRank: "staff", staffStatus: "active" }, []), "missing");
assert.equal(applyTeammateUpdate(desk(), "client-1", { name: "Ada", staffRank: "staff", staffStatus: "inactive" }, []), "not-staff");

console.log("teammate-check ok");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types scripts/teammate-check.ts`

Expected: FAIL because `../lib/teammates` cannot be found.

- [ ] **Step 3: Write the rules**

Create `lib/teammates.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types scripts/teammate-check.ts`

Expected: `teammate-check ok` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/teammates.ts scripts/teammate-check.ts
git commit -m "$(cat <<'EOF'
Add teammate rank and status rules.

EOF
)"
```

---

### Task 2: Persist rank, status, and cleared assignments

**Files:**
- Create: `supabase/migrations/0020_staff_rank.sql`
- Modify: `lib/types.ts` (the `Profile` type)
- Modify: `lib/store.ts` (`blankProfile`, `publicProfile`, `ensureStaff`, `createStaff`, `ProfileRow`, `fromRow`, and both store objects)
- Modify: `scripts/workflow-order-check.ts` (the `profile` fixture)
- Modify: `scripts/return-readiness-check.ts` (the `profile` fixture)

**Interfaces:**
- Consumes: `applyTeammateUpdate`, `startingRank`, `StaffRank`, `StaffStatus` from `lib/teammates.ts`
- Produces: `Profile.staffRank: StaffRank` and `Profile.staffStatus: StaffStatus`. Store method `updateTeammate(id: string, patch: { name: string; staffRank: StaffRank; staffStatus: StaffStatus }): Promise<Profile | null>`. `null` means the profile is missing or is not staff.

- [ ] **Step 1: Add the columns**

Create `supabase/migrations/0020_staff_rank.sql`:

```sql
alter table public.profiles
  add column if not exists staff_rank text not null default 'staff' check (staff_rank in ('owner', 'staff')),
  add column if not exists staff_status text not null default 'active' check (staff_status in ('active', 'inactive'));

update public.profiles
set staff_rank = 'owner'
where role = 'staff'
  and lower(email) in ('taxhelping2day@gmail.com', 'kingchandler19@gmail.com');
```

- [ ] **Step 2: Add the fields to Profile**

In `lib/types.ts`, import the types at the top of the file:

```ts
import type { StaffRank, StaffStatus } from "@/lib/teammates";
```

`lib/types.ts` must not import from `lib/teammates.ts` if that import cycle appears. `lib/teammates.ts` does not import `lib/types.ts`, so this import is safe. Add the fields to `Profile` after `role`:

```ts
  role: Role;
  staffRank: StaffRank;
  staffStatus: StaffStatus;
  name: string;
```

- [ ] **Step 3: Fill every Profile constructor**

In `lib/store.ts` `blankProfile`, add:

```ts
    staffRank: "staff",
    staffStatus: "active",
```

In `publicProfile`, add fallbacks so old local rows still show the starting Owners until a save writes the fields:

```ts
    staffRank: profile.staffRank ?? startingRank(profile.email),
    staffStatus: profile.staffStatus ?? "active",
```

Import `startingRank` from `@/lib/teammates` next to the existing `staffEmails` import.

On `ProfileRow`, add:

```ts
  staff_rank?: StaffRank | null;
  staff_status?: StaffStatus | null;
```

In `fromRow`:

```ts
    staffRank: row.staff_rank === "owner" || row.staff_rank === "staff" ? row.staff_rank : startingRank(row.email),
    staffStatus: row.staff_status === "inactive" ? "inactive" : "active",
```

Use the column when it is present. Use `startingRank` only when the column is absent, so a saved demotion stays `staff`.

Add `staffRank: "staff"` and `staffStatus: "active"` to the profile fixtures in `scripts/workflow-order-check.ts` and `scripts/return-readiness-check.ts`, beside `role: "client"`.

- [ ] **Step 4: Set rank only when a staff row is created**

Local `ensureStaff`, inside the `if (!db.profiles.some(...))` branch, after `blankProfile`:

```ts
          const profile = blankProfile(email, "staff", email === "taxhelping2day@gmail.com" ? "Laura Wallace" : "");
          profile.staffRank = startingRank(email);
          profile.staffStatus = "active";
          db.profiles.push(profile);
```

Do not enter that branch for an email that already has a profile.

Supabase `ensureStaff` insert:

```ts
          await client.from("profiles").insert({
            email,
            role: "staff",
            name: email === "taxhelping2day@gmail.com" ? "Laura Wallace" : "",
            staff_rank: startingRank(email),
            staff_status: "active",
          });
```

Leave `createStaff` rank at the `blankProfile` default of `staff` / `active` for a new row. Do not change rank when the email already exists. Supabase insert in `createStaff` adds the same two columns:

```ts
      const { data, error } = await client.from("profiles").insert({
        email: value,
        role: "staff",
        name,
        staff_rank: "staff",
        staff_status: "active",
      }).select("*").single();
```

- [ ] **Step 5: Add updateTeammate to the Store type and both stores**

On the `Store` type, after `createStaff`. Import `applyTeammateUpdate`, `startingRank`, and the `StaffRank` and `StaffStatus` types from `@/lib/teammates` in `lib/store.ts` if step 3 has not already imported them:

```ts
  updateTeammate(id: string, patch: { name: string; staffRank: StaffRank; staffStatus: StaffStatus }): Promise<Profile | null>;
```

Local implementation. `applyTeammateUpdate` mutates the arrays it is given, including `db.staffAllowlist`. Copy profile and assignment fields back onto the live rows:

```ts
  async updateTeammate(id, patch) {
    return withDb(true, (db) => {
      const profile = db.profiles.find((item) => item.id === id);
      if (!profile || profile.role !== "staff") return null;
      const records = db.profiles.map((item) => ({
        id: item.id,
        role: item.role,
        email: item.email,
        name: item.name,
        staffRank: item.staffRank ?? startingRank(item.email),
        staffStatus: item.staffStatus ?? "active",
      }));
      const returns = db.returns.map((item) => ({ owner: item.owner ?? null, reviewerId: item.reviewerId ?? null }));
      const conversations = db.conversations.map((item) => ({ assigneeId: item.assigneeId }));
      const result = applyTeammateUpdate(
        { profiles: records, returns, conversations, staffAllowlist: db.staffAllowlist },
        id,
        patch,
        staffEmails(),
      );
      if (result !== "ok") return null;
      const saved = records.find((item) => item.id === id);
      if (!saved) return null;
      profile.name = saved.name;
      profile.staffRank = saved.staffRank;
      profile.staffStatus = saved.staffStatus;
      db.returns.forEach((row, index) => {
        row.owner = returns[index].owner;
        row.reviewerId = returns[index].reviewerId;
      });
      db.conversations.forEach((row, index) => {
        row.assigneeId = conversations[index].assigneeId;
      });
      return publicProfile(profile);
    });
  },
```

Supabase implementation:

```ts
    async updateTeammate(id, patch) {
      const existing = await this.getProfile(id);
      if (!existing || existing.role !== "staff") return null;
      const becomingInactive = existing.staffStatus !== "inactive" && patch.staffStatus === "inactive";
      const { data, error } = await client.from("profiles").update({
        name: patch.name,
        staff_rank: patch.staffRank,
        staff_status: patch.staffStatus,
      }).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      if (becomingInactive) {
        const ownerClear = await client.from("tax_returns").update({ owner_id: null }).eq("owner_id", id);
        if (ownerClear.error) throw new Error(ownerClear.error.message);
        const reviewerClear = await client.from("tax_returns").update({ reviewer_id: null }).eq("reviewer_id", id);
        if (reviewerClear.error) throw new Error(reviewerClear.error.message);
        const assigneeClear = await client.from("conversations").update({ assignee_id: null }).eq("assignee_id", id);
        if (assigneeClear.error) throw new Error(assigneeClear.error.message);
      }
      if (patch.staffStatus === "active" && !staffEmails().includes(existing.email.toLowerCase())) {
        const { error: allowError } = await client.from("staff_allowlist").upsert({ email: existing.email.toLowerCase() });
        if (allowError) throw new Error(allowError.message);
      }
      return fromRow(data as ProfileRow);
    },
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit --pretty false`

Expected: exit 0. If a Profile literal is missing the two fields, add `staffRank: "staff"` and `staffStatus: "active"` for a client, or `startingRank(email)` and `"active"` for a new staff row.

- [ ] **Step 7: Re-run the rule test**

Run: `node --experimental-strip-types scripts/teammate-check.ts`

Expected: `teammate-check ok`

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0020_staff_rank.sql lib/types.ts lib/store.ts scripts/workflow-order-check.ts scripts/return-readiness-check.ts
git commit -m "$(cat <<'EOF'
Persist teammate rank and status.

EOF
)"
```

---

### Task 3: Enforce access in auth, invites, and assignment saves

**Files:**
- Modify: `lib/auth.ts`
- Modify: `lib/actions.ts` (`inviteTeammate`, new `updateTeammate`, `saveReturnWorkflow`, `saveReturnDesk` reviewer and issue assignee, `updateConversation`)

**Interfaces:**
- Consumes: `staffMayEnter`, `isActiveStaff`, `isStaffRank`, `isStaffStatus`, `teammateUpdateError` from `lib/teammates.ts`. `store.updateTeammate` from Task 2. `Profile.staffRank` and `Profile.staffStatus`.
- Produces: `export async function updateTeammate(formData: FormData): Promise<{ error: string | null }>` from `lib/actions.ts`.

- [ ] **Step 1: Gate the desk on status**

In `lib/auth.ts`, import `staffMayEnter` from `@/lib/teammates`.

In `getStaffProfile`, after the `role !== "staff"` check, replace the allowlist check with:

```ts
  const listed = staffEmails().includes(email) || (await store.isStaffAllowed(email));
  if (!staffMayEnter(profile, listed)) return null;
```

In `requireProfile`, replace the `staffAllowed` block with:

```ts
  const listed = staffEmails().includes(email) || (await store.isStaffAllowed(email));
  if (!profile || (profile.role === "staff" && !staffMayEnter(profile, listed))) {
    redirect("/not-on-file");
  }
```

A client still passes `staffMayEnter` and is handled by the existing role redirect. An inactive staff member reaches `/not-on-file`.

- [ ] **Step 2: Reject inactive assignees**

Add this helper in `lib/actions.ts` next to the other private helpers:

```ts
async function requireActiveStaff(id: string) {
  if (!id) return;
  const person = await getStore().getProfile(id);
  if (!person || !isActiveStaff(person)) throw new Error("Choose a staff member.");
}
```

Import `isActiveStaff`, `isStaffRank`, `isStaffStatus`, and `teammateUpdateError` from `@/lib/teammates`.

Replace the owner check in `saveReturnWorkflow`:

```ts
  if (owner) await requireActiveStaff(owner);
```

Replace the reviewer check in `saveReturnDesk`:

```ts
    if (nextReviewer) await requireActiveStaff(nextReviewer);
```

Replace the issue assignee check in `saveReturnDesk`:

```ts
    if (assigneeId) await requireActiveStaff(assigneeId);
```

In `updateConversation`, before `store.updateConversation`:

```ts
  if (next.assigneeId) await requireActiveStaff(next.assigneeId);
```

- [ ] **Step 3: Owner-only invite and the update action**

`inviteTeammate` currently calls `requireProfile("staff")` and discards the profile. Change it to:

```ts
export async function inviteTeammate(formData: FormData) {
  const actor = await requireProfile("staff");
  if (actor.staffRank !== "owner") return { error: "Only an owner can change teammates." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email.includes("@")) {
    return { error: "Enter an email address." };
  }
  const store = getStore();
  const teammate = await store.createStaff({ email, name });
  if (!teammate) {
    return { error: "That email already belongs to a client." };
  }
  const delivered = await deliverInvite(email, "staff");
  revalidatePath("/settings/teammates");
  return delivered;
}
```

Add `updateTeammate` directly below `inviteTeammate`:

```ts
export async function updateTeammate(formData: FormData) {
  const actor = await requireProfile("staff");
  const store = getStore();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const nextRank = String(formData.get("staffRank") ?? "");
  const nextStatus = String(formData.get("staffStatus") ?? "");
  if (!isStaffRank(nextRank) || !isStaffStatus(nextStatus)) {
    return { error: "Choose a role and a status." };
  }
  const profiles = await store.listProfiles();
  const activeOwnerIds = profiles.filter((person) => person.role === "staff" && person.staffRank === "owner" && person.staffStatus === "active").map((person) => person.id);
  const error = teammateUpdateError({
    actorId: actor.id,
    actorRank: actor.staffRank,
    targetId: id,
    nextRank,
    nextStatus,
    activeOwnerIds,
  });
  if (error) return { error };
  const saved = await store.updateTeammate(id, { name, staffRank: nextRank, staffStatus: nextStatus });
  if (!saved) return { error: "That teammate is not on this desk." };
  revalidatePath("/settings/teammates");
  revalidatePath("/settings/profile");
  revalidatePath("/inbox");
  revalidatePath("/returns");
  revalidatePath("/tasks/table");
  return { error: null };
}
```

- [ ] **Step 4: Typecheck and re-run the rule test**

Run: `npx tsc --noEmit --pretty false`

Expected: exit 0.

Run: `node --experimental-strip-types scripts/teammate-check.ts`

Expected: `teammate-check ok`

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts lib/actions.ts
git commit -m "$(cat <<'EOF'
Block inactive staff from the desk and from new assignments.

EOF
)"
```

---

### Task 4: Edit dialog on the teammates page

**Files:**
- Create: `components/settings/teammate-editor.tsx`
- Modify: `components/settings/invite-buttons.tsx`
- Modify: `app/settings/teammates/page.tsx`
- Modify: `app/settings/profile/page.tsx`
- Modify: `components/inbox/inbox-state.ts`
- Modify: `components/inbox/details-panel.tsx`
- Modify: `app/inbox/page.tsx`
- Modify: `app/returns/page.tsx`
- Modify: `app/returns/[profileId]/[returnId]/page.tsx`
- Modify: `app/tasks/table/page.tsx`
- Modify: `lib/automation-run.ts`

**Interfaces:**
- Consumes: `updateTeammate` from `lib/actions.ts`. `isActiveStaff`, `rankLabel`, `statusLabel`, `StaffStatus` from `lib/teammates.ts`. `Profile.staffRank` and `Profile.staffStatus`.
- Produces: the teammates table Edit dialog. No new exported server function.

- [ ] **Step 1: Build the dialog**

Create `components/settings/teammate-editor.tsx`:

```tsx
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
              <Select value={staffRank} onValueChange={(value) => { if (value === "owner" || value === "staff") setStaffRank(value); }}>
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
              <Select value={staffStatus} onValueChange={(value) => { if (value === "active" || value === "inactive") setStaffStatus(value); }}>
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
```

- [ ] **Step 2: Show Edit only for an Owner, and only on someone else's row**

Replace the people list and the Role and Status cells in `app/settings/teammates/page.tsx`.

Import `TeammateBadges` and `TeammateEditor` from `@/components/settings/teammate-editor`.

Build each real staff profile with the stored name, which may be blank:

```ts
  const people = staff.map((person) => ({
    id: person.id,
    name: person.name,
    email: person.email,
    avatar: avatarUrl(person.id, person.avatarPath),
    staffRank: person.staffRank,
    staffStatus: person.staffStatus,
  }));
```

The visible name in the row is `person.name.trim() || "Staff"`. Pass `person.name` into `TeammateEditor` so a blank name stays blank until someone types one.

Remove the `staffEmails()` placeholder rows. `requireProfile` already calls `ensureStaff`, so those emails have profiles.

Header row: change the grid to `lg:grid-cols-[minmax(0,1fr)_8rem_8rem_5rem]` and add a fourth header `Access` only when `current.staffRank === "owner"`. The row grid matches. When the viewer is Staff, keep three columns and omit the Access header.

Place `<TeammateBadges staffRank={person.staffRank} staffStatus={person.staffStatus} />` as the next child of the row grid. It returns a fragment, so the Role badge and the Status badge become the two grid cells. Do not also render rank or status text beside it.

Access cell, only when the viewer is an Owner:

```tsx
                  {current.staffRank === "owner" ? (
                    <div>
                      {person.id === current.id ? null : <TeammateEditor person={person} />}
                    </div>
                  ) : null}
```

Pass `allowTeammate={current.staffRank === "owner"}` into `InviteButtons`.

- [ ] **Step 3: Hide Invite teammate from Staff**

In `components/settings/invite-buttons.tsx`, change `InviteButtons` to:

```tsx
export function InviteButtons({ allowTeammate = false }: { allowTeammate?: boolean }) {
  return (
    <>
      <InviteDialog
        label="Invite client"
        title="Invite client"
        description="They get an email and a file on this desk."
        action={inviteClient}
        variant="outline"
      />
      {allowTeammate ? (
        <InviteDialog
          label="Invite teammate"
          title="Invite teammate"
          description="They can open the desk after they accept the email."
          action={inviteTeammate}
        />
      ) : null}
    </>
  );
}
```

`InviteButtons` is only rendered from `app/settings/teammates/page.tsx`. Pass `allowTeammate` there. The default stays `false`.

- [ ] **Step 4: Profile page shows the signed-in rank and status**

In `app/settings/profile/page.tsx`, import `rankLabel` and `statusLabel` from `@/lib/teammates`. Replace the Role field and add Status:

```tsx
        <SettingsField id="profile-role" label="Role" value={rankLabel(profile.staffRank)} />
        <SettingsField id="profile-status" label="Status" value={statusLabel(profile.staffStatus)} />
```

Leave name and email read-only.

- [ ] **Step 5: Assignment menus list active staff**

Add `staffStatus: StaffStatus` to `InboxPerson` in `components/inbox/inbox-state.ts`. Import `StaffStatus` from `@/lib/teammates`.

In `app/inbox/page.tsx`, include `staffStatus: profile.staffStatus` on each teammate. Client contacts are `InboxContact`, which extends `InboxPerson`. Give each contact `staffStatus: "active"` so the type is satisfied. Contacts are not staff and are not used as assignee options.

In `components/inbox/details-panel.tsx`, build assignee items from active teammates only:

```ts
  const assigneeItems = [
    { label: "Unassigned", value: "unassigned" },
    ...teammates.filter((person) => person.staffStatus === "active").map((person) => ({ label: person.name || person.email, value: person.id })),
  ];
```

Leave the full `teammates` list in place for message author names.

Filter with `isActiveStaff` where a page builds the preparer options:

`app/returns/page.tsx`:

```ts
  const teammates = profiles.filter((person) => isActiveStaff(person));
```

`app/returns/[profileId]/[returnId]/page.tsx`:

```ts
  const teammates = profiles.filter((person) => isActiveStaff(person)).map((person) => ({ id: person.id, name: authors.get(person.id) || person.email }));
```

`app/tasks/table/page.tsx`:

```ts
  const teammates = profiles
    .filter((person) => isActiveStaff(person))
    .map((person) => ({ id: person.id, name: person.name || person.email || "Teammate" }));
```

In `lib/automation-run.ts` `staffId`:

```ts
  return people.find((person) => isActiveStaff(person))?.id ?? null;
```

Import `isActiveStaff` in each of those files.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit --pretty false`

Expected: exit 0.

Run: `node --experimental-strip-types scripts/teammate-check.ts`

Expected: `teammate-check ok`

- [ ] **Step 7: Commit**

```bash
git add components/settings/teammate-editor.tsx components/settings/invite-buttons.tsx app/settings/teammates/page.tsx app/settings/profile/page.tsx components/inbox/inbox-state.ts components/inbox/details-panel.tsx app/inbox/page.tsx app/returns/page.tsx app/returns/[profileId]/[returnId]/page.tsx app/tasks/table/page.tsx lib/automation-run.ts
git commit -m "$(cat <<'EOF'
Let owners edit teammate role and status.

EOF
)"
```
