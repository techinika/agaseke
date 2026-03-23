import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
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
