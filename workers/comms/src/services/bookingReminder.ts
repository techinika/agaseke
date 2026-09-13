import type { Env, EmailTemplateData } from "../types";
import { firestoreGet, firestorePost, firestorePatch } from "../firestore";
import { deferAudit } from "../audit";
import { logEmailSend } from "../logger";
import { sendSesEmail } from "../ses";
import { renderEmailHtml, renderEmailText } from "../template";
import { fetchCreatorEmail } from "./helpers";

interface BookingDoc {
  id: string;
  fields: Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean }>;
}

const STATUS_ACCEPTED = "accepted";

function dateStrForKigali(offsetDays: number): string {
  const shifted = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(shifted);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function fetchBookingsForDate(env: Env, date: string): Promise<BookingDoc[]> {
  const data = await firestoreGet(
    env,
    `bookingRequests?filter=preferredDate=%22${date}%22`
  );
  if (!data?.documents) return [];

  const documents = data.documents as Array<Record<string, unknown>>;
  const docs: BookingDoc[] = [];
  for (const doc of documents) {
    const name = String(doc.name || "");
    const id = name.split("/").pop() || "";
    if (!id || !doc.fields) continue;
    docs.push({ id, fields: doc.fields as BookingDoc["fields"] });
  }
  return docs;
}

function createNotifications(
  env: Env,
  booking: BookingDoc,
  opts: {
    creatorUid?: string;
    bookerId?: string;
    creatorName: string;
    bookerName: string;
    preferredDate: string;
    preferredTime?: string;
  }
): void {
  const {
    creatorUid,
    bookerId,
    creatorName,
    bookerName,
    preferredDate,
    preferredTime,
  } = opts;
  const when = preferredTime ? `${preferredDate} at ${preferredTime}` : preferredDate;
  const now = new Date().toISOString();

  if (creatorUid) {
    deferAudit(
      firestorePost(env, "notifications", {
        fields: {
          userId: { stringValue: creatorUid },
          type: { stringValue: "booking_reminder" },
          title: { stringValue: "Upcoming booking tomorrow" },
          message: {
            stringValue: `Reminder: your meeting with ${bookerName} is scheduled for ${when}.`,
          },
          read: { booleanValue: false },
          createdAt: { timestampValue: now },
          link: { stringValue: "/creator/bookings" },
          actorName: { stringValue: bookerName || "Agaseke" },
        },
      })
    );
  }

  if (bookerId) {
    deferAudit(
      firestorePost(env, "notifications", {
        fields: {
          userId: { stringValue: bookerId },
          type: { stringValue: "booking_reminder" },
          title: { stringValue: "Upcoming booking tomorrow" },
          message: {
            stringValue: `Reminder: your meeting with ${creatorName} is scheduled for ${when}.`,
          },
          read: { booleanValue: false },
          createdAt: { timestampValue: now },
          link: { stringValue: "/bookings" },
          actorName: { stringValue: creatorName || "Agaseke" },
        },
      })
    );
  }
}

/**
 * Triggered by a daily cron. Finds bookings whose preferred date is tomorrow
 * (Africa/Kigali), and for each accepted booking still awaiting a reminder:
 * emails both parties, creates in-app notifications, and marks `reminderSent`.
 */
export async function sendBookingReminders(env: Env): Promise<{
  scanned: number;
  reminded: number;
  notified: number;
  errors: number;
}> {
  const result = { scanned: 0, reminded: 0, notified: 0, errors: 0 };
  const appUrl = env.APP_URL || "https://agaseke.me";
  const from = `${env.FROM_NAME} <${env.FROM_EMAIL}>`;

  const tomorrow = dateStrForKigali(1);
  const bookings = await fetchBookingsForDate(env, tomorrow);
  result.scanned = bookings.length;

  for (const booking of bookings) {
    const fields = booking.fields;
    if (fields.status?.stringValue !== STATUS_ACCEPTED) continue;
    if (fields.reminderSent?.booleanValue === true) continue;

    const bookingId = booking.id;
    const creatorUid = fields.creatorUid?.stringValue || "";
    const creatorName = fields.creatorName?.stringValue || "your host";
    const creatorHandle = fields.creatorHandle?.stringValue || "";
    const bookerId = fields.bookerId?.stringValue || "";
    const bookerName = fields.bookerName?.stringValue || "";
    const bookerEmail = fields.bookerEmail?.stringValue || "";
    const preferredDate = fields.preferredDate?.stringValue || tomorrow;
    const preferredTime = fields.preferredTime?.stringValue || "";
    const meetingLocation = fields.meetingLocation?.stringValue || "";
    const preferredType = fields.preferredType?.stringValue || "";

    const recipientEmails: { email: string; name: string; subject: string; body: string }[] = [];

    const when = preferredTime ? `${preferredDate} at ${preferredTime}` : preferredDate;
    const whereText = meetingLocation ? `${meetingLocation}${preferredType ? ` (${preferredType})` : ""}` : preferredType;

    if (bookerEmail) {
      recipientEmails.push({
        email: bookerEmail,
        name: bookerName || bookerEmail.split("@")[0] || "there",
        subject: `Reminder: Your meeting with ${creatorName} is tomorrow`,
        body: `Hi ${bookerName || "there"},<br/><br/>This is a friendly reminder that your meeting with <strong>${creatorName}</strong> is scheduled for <strong>${when}</strong>.${whereText ? ` It will take place at ${whereText}.` : ""}<br/><br/>Please be ready and on time.`,
      });
    }

    const creatorEmail = await fetchCreatorEmail(creatorUid, env);
    if (creatorEmail) {
      recipientEmails.push({
        email: creatorEmail,
        name: creatorName || creatorEmail.split("@")[0] || "there",
        subject: `Reminder: You have a meeting with ${bookerName} tomorrow`,
        body: `Hi ${creatorName || "there"},<br/><br/>This is a friendly reminder that you have a meeting with <strong>${bookerName || "a supporter"}</strong> scheduled for <strong>${when}</strong>.${whereText ? ` It will take place at ${whereText}.` : ""}<br/><br/>Open your bookings dashboard to confirm the details.`,
      });
    }

    const creatorCtaUrl = creatorHandle ? `/${creatorHandle}/community` : "/community";
    const emails: Array<{ email: string; html: string; text: string }> = [];

    for (const recipient of recipientEmails) {
      const ctaUrl = recipient.email === creatorEmail ? "/creator/bookings" : creatorCtaUrl;
      const templateData: EmailTemplateData = {
        headerColor: "#ea580c",
        headerTitle: "Agaseke",
        title: "Meeting reminder",
        body: recipient.body,
        ctaText: ctaUrl.startsWith("/creator")
          ? "Open bookings dashboard"
          : "Open community page",
        ctaUrl,
        footerNote: "Sent via Agaseke",
      };
      emails.push({
        email: recipient.email,
        html: renderEmailHtml(templateData, appUrl, env.ASSETS_URL || appUrl),
        text: renderEmailText(recipient.body, appUrl),
      });
    }

    try {
      for (const email of emails) {
        const messageId = await sendSesEmail(env, {
          to: [email.email],
          subject: recipientEmails.find((r) => r.email === email.email)?.subject || "Booking reminder",
          html: email.html,
          text: email.text,
        });

        deferAudit(
          firestorePost(env, "sentEmails", {
            fields: {
              email: { stringValue: email.email },
              status: { stringValue: "sent" },
              from: { stringValue: from },
              messageId: { stringValue: messageId },
              purpose: { stringValue: "booking_reminder" },
              subject: {
                stringValue:
                  recipientEmails.find((r) => r.email === email.email)?.subject ||
                  "Booking reminder",
              },
              sentAt: { timestampValue: new Date().toISOString() },
            },
          })
        );
      }

      result.reminded += emails.length;
      result.notified += (creatorUid ? 1 : 0) + (bookerId ? 1 : 0);
      createNotifications(env, booking, {
        creatorUid,
        bookerId,
        creatorName,
        bookerName,
        preferredDate,
        preferredTime,
      });

      await firestorePatch(env, `bookingRequests/${bookingId}`, {
        reminderSent: { booleanValue: true },
        reminderSentAt: { timestampValue: new Date().toISOString() },
      });

      deferAudit(
        logEmailSend(env, {
          purpose: "booking_reminder",
          recipientCount: emails.length,
          recipients: emails.map((e) => e.email).join(", "),
          subject: recipientEmails[0]?.subject || "Booking reminder",
          uid: creatorUid,
        })
      );
    } catch (err) {
      result.errors += 1;
      console.error(
        `Booking reminder failed for ${bookingId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  console.info(`Booking reminders run complete: ${JSON.stringify(result)}`);
  return result;
}