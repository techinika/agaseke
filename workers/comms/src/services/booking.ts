import type { EmailService, EmailAddresses, EmailTemplateData } from "../types";

export const bookingRequest: EmailService = {
  purpose: "booking_request",
  async resolveRecipients(data) {
    return { to: data.creatorEmail as string };
  },
  buildSubject(data) {
    return `New booking request from ${data.bookerName as string}`;
  },
  async buildTemplateData(data) {
    return {
      headerColor: "#2563eb",
      headerTitle: "New Booking Request",
      title: `You have a new booking request from ${data.bookerName as string}`,
      body: `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">From</td><td style="padding:6px 0;font-weight:600;">${data.bookerName as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${data.bookerEmail as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;">${data.preferredDate as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Time</td><td style="padding:6px 0;">${data.preferredTime as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Type</td><td style="padding:6px 0;text-transform:capitalize;">${data.preferredType as string}</td></tr>
               ${data.tierName ? `<tr><td style="padding:6px 0;color:#888;">Tier</td><td style="padding:6px 0;">${data.tierName as string}</td></tr>` : ""}
               ${data.paymentAmount ? `<tr><td style="padding:6px 0;color:#888;">Amount</td><td style="padding:6px 0;font-weight:600;">${data.paymentAmount as string}</td></tr>` : ""}
             </table>
             ${data.reason ? `<p><strong>Reason:</strong><br>${data.reason as string}</p>` : ""}`,
      ctaText: "Manage Bookings",
      ctaUrl: `${data.appUrl}/creator/bookings`,
    };
  },
};

export const bookingResponse: EmailService = {
  purpose: "booking_response",
  async resolveRecipients(data) {
    return { to: data.bookerEmail as string };
  },
  buildSubject(data) {
    const status = data.status as string;
    const creatorName = data.creatorName as string;
    return status === "accepted"
      ? `Your booking with ${creatorName} is confirmed!`
      : `Update on your booking request with ${creatorName}`;
  },
  async buildTemplateData(data) {
    const status = data.status as string;
    const accepted = status === "accepted";
    const bookingDate = data.bookingDate as string;
    const bookingTime = data.bookingTime as string;

    const calendarLinks = accepted
      ? `<p style="margin-top:16px;">
           <a href="${data.googleCalUrl as string}" style="color:#2563eb;">Add to Google Calendar</a>
           &nbsp;·&nbsp;
           <a href="${data.yahooCalUrl as string}" style="color:#2563eb;">Yahoo Calendar</a>
           &nbsp;·&nbsp;
           <a href="${data.icsUrl as string}" style="color:#2563eb;">Apple/Outlook</a>
         </p>`
      : "";

    return {
      headerColor: accepted ? "#059669" : "#dc2626",
      headerTitle: accepted ? "Booking Confirmed" : "Booking Update",
      title: accepted
        ? `Your booking with ${data.creatorName as string} is confirmed!`
        : `Update on your booking request with ${data.creatorName as string}`,
      body: `<p>${accepted ? "Great news! Your booking has been accepted." : "Unfortunately, your booking request was declined."}</p>
             <table style="width:100%;border-collapse:collapse;margin:8px 0;">
               <tr><td style="padding:6px 0;color:#888;">Creator</td><td style="padding:6px 0;font-weight:600;">${data.creatorName as string}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Date</td><td style="padding:6px 0;">${bookingDate}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Time</td><td style="padding:6px 0;">${bookingTime}</td></tr>
               <tr><td style="padding:6px 0;color:#888;">Type</td><td style="padding:6px 0;text-transform:capitalize;">${data.preferredType as string}</td></tr>
               ${data.meetingLocation ? `<tr><td style="padding:6px 0;color:#888;">Location</td><td style="padding:6px 0;">${data.meetingLocation as string}</td></tr>` : ""}
               ${data.tierName ? `<tr><td style="padding:6px 0;color:#888;">Tier</td><td style="padding:6px 0;">${data.tierName as string}</td></tr>` : ""}
             </table>
             ${data.note ? `<p><strong>${accepted ? "Message" : "Reason"} from creator:</strong><br>${data.note as string}</p>` : ""}
             ${calendarLinks}`,
      ...(accepted ? { ctaText: "View Booking", ctaUrl: `${data.appUrl}/${data.creatorHandle as string}/booking` } : {}),
    };
  },
};
