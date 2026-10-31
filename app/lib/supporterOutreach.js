import { sql } from "./db";

/** Saves a checked record's Brand Tracker outreach fields (migration 074). */
export function saveOutreach(id, value, db = { sql }) {
  return db.sql(
    `UPDATE supporters SET invite_status=$2, rsvp_status=$3, agreement_status=$4, invited_on=$5, follow_up_on=$6,
       assigned_to=$7, booth_needs=$8, reps_attending=$9, dogs_attending=$10 WHERE id=$1`,
    [id, value.inviteStatus, value.rsvpStatus, value.agreementStatus, value.invitedOn, value.followUpOn,
      value.assignedTo, value.boothNeeds, value.repsAttending, value.dogsAttending],
  );
}
