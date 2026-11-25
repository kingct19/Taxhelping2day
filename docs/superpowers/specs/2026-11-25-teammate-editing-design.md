# Teammate editing

Owners edit a teammate's name, role, and status from the teammates table. Inactive people lose the desk, and work assigned to them becomes unassigned.

## Who can do what

Laura Wallace (`taxhelping2day@gmail.com`) and `kingchandler19@gmail.com` start as Owners. `chandler@studiosozo.dev` starts as Staff. People invited later start as Staff and Active.

An Owner can invite a teammate and can edit every other teammate. Staff can still invite clients. Staff can open the teammates page and see rank and status. Staff cannot invite teammates, and they have no Edit action.

The signed-in person has no Edit action on their own row. This table does not change their name, rank, or status. The profile settings page shows their rank and status as read-only text.

The desk always has at least one active Owner. The last active Owner cannot be demoted or deactivated. Another Owner can still edit that person's name. When they are the only Owner, no one else can edit the row.

## What the page does

The teammates table keeps the columns Teammate, Role, and Status.

Role shows Owner or Staff. Status shows Active or Inactive. Inactive people stay in the list.

Each row except the signed-in person has Edit when the viewer is an Owner. Edit opens a dialog with name, role, and status. Name may be blank. A blank name displays as Staff. Email is not editable.

Choosing Inactive and saving asks for confirmation first. The confirm text names the person and says they will lose desk access and that preparer, reviewer, and inbox assignments will be cleared. Cancel leaves the row unchanged.

## Access

`profiles.role` stays `client` or `staff`. Two staff-only fields sit beside it:

- `staff_rank`: `owner` or `staff`, default `staff`
- `staff_status`: `active` or `inactive`, default `active`

Clients keep the defaults. Those fields do not change client behavior.

A staff profile can open the desk only when `staff_status` is `active` and the email is in `STAFF_EMAILS` or `staff_allowlist`. Inactive wins over both lists, so a person listed in `STAFF_EMAILS` can be cut off. Sign-in then lands on the existing not-on-file page. The Clerk user is left in place.

`ensureStaff` creates missing staff profiles and sets the two starting Owners only when it creates the row. Later saves are left alone, including a demotion or deactivation of a starting Owner.

Reactivating sets `staff_status` back to `active` and puts the email on `staff_allowlist` when it is not already in `STAFF_EMAILS`. Old assignments are not restored.

## Assignments

The change to Inactive clears, in one save:

- return preparer (`tax_returns.owner_id`)
- return reviewer (`tax_returns.reviewer_id`)
- inbox assignee (`conversations.assignee_id`)

Rows that already point at someone else stay. A save that is already inactive, or that only changes name or rank, does not clear assignments.

Assignment menus list active staff only. An inactive person cannot be chosen as preparer, reviewer, or inbox assignee.

## Errors

The update action refuses, and the dialog stays open with the message:

- A Staff member, or anyone who is not an Owner: "Only an owner can change teammates."
- The signed-in person editing their own row: "You can't change your own access."
- A save that would leave no active Owner: "The desk needs at least one active owner."

Invite teammate uses the same owner check and returns "Only an owner can change teammates."

## Tests

Cover the store and the action, not the dialog markup:

- An Owner updates another person's name and rank without clearing assignments.
- Setting Inactive clears preparer, reviewer, and inbox assignee, and a later read of that profile cannot enter the desk.
- Setting Active again allows desk access and does not put the cleared assignments back.
- The last active Owner cannot be demoted or deactivated.
- A person cannot update their own rank or status.
- A Staff caller cannot update a teammate or invite one.
- `ensureStaff` does not reset a saved rank or status.
