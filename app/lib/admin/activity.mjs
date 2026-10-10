/** Plain-language names for activity log actions. */
export const ACTION_LABELS = {
  "event.save": "Saved an event",
  "event.publish": "Published an event",
  "event.unpublish": "Moved an event back to draft",
  "event.cancel": "Cancelled an event",
  "event.address": "Changed an event's web address",
  "event.delete": "Deleted an event",
  "photo.remove": "Removed an album photo",
  "registration.fee": "Updated a fee",
  "registration.cancel": "Cancelled a registration",
  "registration.confirm": "Moved someone off the waitlist",
  "registration.checkin": "Checked someone in",
  "registration.export": "Exported registrations",
  "person.update": "Updated a person's status",
  "people.export": "Exported people",
  "payment.request": "Requested a payment change",
  "payment.cancel": "Cancelled a payment change",
  "payment.approve": "Approved a payment change",
  "payment.reject": "Rejected a payment change",
  "payment.disable": "Hid a payment method",
  "admin.invite": "Invited an admin",
  "admin.roles": "Changed an admin's roles",
  "admin.remove": "Removed an admin",
};

export const actionLabel = (action) => ACTION_LABELS[action] || action;
