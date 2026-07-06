import type { EmailService, EmailPurpose } from "../types";

import { welcomeCreator, profileLive } from "./welcome";
import { bookingRequest, bookingResponse } from "./booking";
import { gatheringCreated, gatheringRsvp, gatheringCheckin, gatheringDeclined, gatheringUndo } from "./gathering";
import { storeOrder, storeStatus } from "./store";
import { messageNew, messageDigest } from "./message";
import { payoutProcessed } from "./payout";
import { supportReceived } from "./support";
import { contentNew } from "./content";
import { verificationRequest, verificationFeedback } from "./verification";
import { broadcast } from "./broadcast";

const registry: Record<EmailPurpose, EmailService> = {
  welcome_creator: welcomeCreator,
  profile_live: profileLive,
  booking_request: bookingRequest,
  booking_response: bookingResponse,
  gathering_created: gatheringCreated,
  gathering_rsvp: gatheringRsvp,
  gathering_checkin: gatheringCheckin,
  gathering_declined: gatheringDeclined,
  gathering_undo: gatheringUndo,
  store_order: storeOrder,
  store_status: storeStatus,
  message_new: messageNew,
  message_digest: messageDigest,
  payout_processed: payoutProcessed,
  support_received: supportReceived,
  content_new: contentNew,
  verification_request: verificationRequest,
  verification_feedback: verificationFeedback,
  broadcast,
};

export function getService(purpose: EmailPurpose): EmailService | undefined {
  return registry[purpose];
}

export function listPurposes(): EmailPurpose[] {
  return Object.keys(registry) as EmailPurpose[];
}
