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
