import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let transporter;

function getTransporter() {
  if (!transporter) {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
      // Fail securely: don't silently pretend email was sent if SMTP isn't configured.
      // Local dev without SMTP creds falls back to logging the link so the flow is still testable.
      return null;
    }
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

async function send({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    // Dev-only fallback — never do this in a deployed environment; SMTP must be configured.
    logger.warn('SMTP not configured; logging email instead of sending', { to, subject });
    // eslint-disable-next-line no-console
    console.log(`\n--- DEV EMAIL (not sent) ---\nTo: ${to}\nSubject: ${subject}\n${text}\n----------------------------\n`);
    return;
  }
  await t.sendMail({ from: env.emailFrom, to, subject, html, text });
}

export async function sendVerificationEmail(toEmail, verifyUrl) {
  await send({
    to: toEmail,
    subject: 'Verify your email address',
    text: `Welcome! Verify your email by visiting: ${verifyUrl}\nThis link expires soon and can only be used once.`,
    html: `<p>Welcome! Please verify your email address.</p><p><a href="${verifyUrl}">Verify my email</a></p><p>This link expires soon and can only be used once.</p>`,
  });
}

export async function sendPasswordResetEmail(toEmail, resetUrl) {
  await send({
    to: toEmail,
    subject: 'Reset your password',
    text: `A password reset was requested for your account. Visit: ${resetUrl}\nIf you didn't request this, you can ignore this email — your password will not change.`,
    html: `<p>A password reset was requested for your account.</p><p><a href="${resetUrl}">Reset my password</a></p><p>If you didn't request this, you can ignore this email — your password will not change.</p>`,
  });
}

export async function sendPasswordChangedNotice(toEmail) {
  await send({
    to: toEmail,
    subject: 'Your password was changed',
    text: `This is a confirmation that your account password was just changed. If this wasn't you, contact support immediately.`,
    html: `<p>This is a confirmation that your account password was just changed.</p><p>If this wasn't you, contact support immediately.</p>`,
  });
}
