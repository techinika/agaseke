import type { EmailService, EmailAddresses, EmailTemplateData, Env } from "../types";
import { fetchSupporters, fetchCreatorEmail } from "./helpers";

export const gatheringCreated: EmailService = {
  purpose: "gathering_created",
  async resolveRecipients(data) {
    const emails = await fetchSupporters(data.creatorId as string, data.env as Env);
    return { to: emails };
  },
  buildSubject(data) {
    return `New gathering: ${data.gatheringTitle as string} by ${data.creatorName as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#ea580c",
      headerTitle: "New Event",
      title: `${data.creatorName as string} created a new gathering!`,
      body: `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;vertical-align:top;">Event</td><td style="padding:6px 0;font-weight:600;">${data.gatheringTitle as string}</td></tr>
               ${data.gatheringDescription ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top;">About</td><td style="padding:6px 0;">${data.gatheringDescription as string}</td></tr>` : ""}
               <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;">${data.gatheringDate as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Time</td><td style="padding:6px 0;">${data.gatheringTime as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Location</td><td style="padding:6px 0;">${data.gatheringLocation as string}</td></tr>
             </table>`,
      ctaText: "View Event",
      ctaUrl: `${data.appUrl}/${data.creatorHandle as string}/gatherings/${data.gatheringId as string}`,
    };
  },
};

export const gatheringRsvp: EmailService = {
  purpose: "gathering_rsvp",
  async resolveRecipients(data) {
    const email = await fetchCreatorEmail(data.creatorId as string, data.env as Env);
    return { to: email };
  },
  buildSubject(data) {
    return `New RSVP: ${data.supporterName as string} for "${data.gatheringTitle as string}"`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#059669",
      headerTitle: "New RSVP",
      title: `${data.supporterName as string} RSVP'd to "${data.gatheringTitle as string}"`,
      body: `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">Supporter</td><td style="padding:6px 0;font-weight:600;">${data.supporterName as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${data.supporterEmail as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Event</td><td style="padding:6px 0;">${data.gatheringTitle as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;">${data.gatheringDate as string}</td></tr>
             </table>`,
      ctaText: "View Attendees",
      ctaUrl: `${data.appUrl}/creator/gatherings`,
    };
  },
};

export const gatheringCheckin: EmailService = {
  purpose: "gathering_checkin",
  async resolveRecipients(data) {
    return { to: data.supporterEmail as string };
  },
  buildSubject(data) {
    return `Checked In: ${data.eventTitle as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#059669",
      headerTitle: "Checked In",
      title: `You're checked in to ${data.eventTitle as string}!`,
      body: `<p>You've been checked in by ${data.creatorName as string}.</p>
             <table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">Event</td><td style="padding:6px 0;font-weight:600;">${data.eventTitle as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;">${data.eventDate as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Time</td><td style="padding:6px 0;">${data.eventTime as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Location</td><td style="padding:6px 0;">${data.eventLocation as string}</td></tr>
             </table>
             <p>Enjoy the event!</p>`,
    };
  },
};

export const gatheringDeclined: EmailService = {
  purpose: "gathering_declined",
  async resolveRecipients(data) {
    return { to: data.supporterEmail as string };
  },
  buildSubject(data) {
    return `Check-in Update for ${data.eventTitle as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#dc2626",
      headerTitle: "Check-in Declined",
      title: `Check-in declined for ${data.eventTitle as string}`,
      body: `<p>Your check-in for <strong>${data.eventTitle as string}</strong> was declined.</p>
             ${data.note ? `<p><strong>Reason:</strong><br>${data.note as string}</p>` : ""}
             <p>If you believe this is a mistake, please contact ${data.creatorName as string} directly.</p>`,
    };
  },
};

export const gatheringUndo: EmailService = {
  purpose: "gathering_undo",
  async resolveRecipients(data) {
    return { to: data.supporterEmail as string };
  },
  buildSubject(data) {
    return `Check-in Status Updated: ${data.eventTitle as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#6b7280",
      headerTitle: "Check-in Reverted",
      title: `Check-in status updated for ${data.eventTitle as string}`,
      body: `<p>Your check-in for <strong>${data.eventTitle as string}</strong> has been reverted.</p>
             <p>Your status is now <strong>Pending</strong>.</p>`,
    };
  },
};
