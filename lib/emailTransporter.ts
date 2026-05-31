import nodemailer from "nodemailer";

console.log(`[SMTP_CONFIG] SMTP_USER="${process.env.SMTP_USER ? 'SET' : 'MISSING'}", SMTP_PASS="${process.env.SMTP_PASS ? 'SET' : 'MISSING'}"`);

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify().then(() => {
  console.log("[SMTP_CONFIG] Main transporter is ready");
}).catch((err) => {
  console.error("[SMTP_CONFIG] Main transporter verify failed:", err.message);
});

export const helloTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_HELLO,
    pass: process.env.SMTP_SP_PASS,
  },
});

export const updatesTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_UPDATES,
    pass: process.env.SMTP_SP_PASS,
  },
});

export const founderTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_FOUNDER,
    pass: process.env.SMTP_FOUNDER_PASS,
  },
});
