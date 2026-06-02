import { craft, timer, mail, log, noop } from "@routecraft/routecraft";
import { env } from "../lib/env.js";

/**
 * A self-contained mail loop you can watch run locally. It is opt-in: start it
 * with `bun run mail-demo`, which boots a local GreenMail test server (SMTP +
 * IMAP on localhost) and then runs these two capabilities against it. Nothing
 * here touches a real mailbox.
 *
 *   mail-sender  --timer-->  SMTP  -->  (GreenMail)  -->  IMAP  --> mail-reader
 *
 * `mail-sender` posts a message every few seconds; `mail-reader` watches the
 * inbox over IMAP (IDLE), processes each new message, and marks it seen.
 */

export const mailSender = craft()
  .id("mail-sender")
  .from(timer({ intervalMs: 8000, delayMs: 1500 }))
  .transform(() => ({
    to: env.mail.user,
    subject: `Scheduled report ${new Date().toISOString()}`,
    text: "This message was sent on a timer and will be read back over IMAP.",
  }))
  .tap(log(({ body }) => `Sending mail to ${body.to}: "${body.subject}"`))
  .to(mail());

export const mailReader = craft()
  .id("mail-reader")
  // Poll mode (vs the default IMAP IDLE) re-scans the inbox on an interval. It
  // is the robust choice against lightweight test servers like GreenMail, whose
  // IDLE push notifications are not always delivered.
  .from(mail("INBOX", { unseen: true, markSeen: true, pollIntervalMs: 3000 }))
  .transform((message) => ({
    from: message.from,
    subject: message.subject,
    preview: (message.body.text ?? "").trim().slice(0, 80),
  }))
  .tap(log(({ body }) => `Received mail from ${body.from}: "${body.subject}"`))
  .to(noop());

export default [mailSender, mailReader];
