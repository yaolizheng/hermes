import { createTransport } from "nodemailer";

export async function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

export async function getUID() {
  return String(Date.now()) + String(await getRandomInt(10000));
}

export function sleep(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function sendEmail(
  from: string,
  to: string,
  subject: string,
  html: string
) {
  // smtp://127.0.0.1:1025
  let transporter = createTransport({
    host: "127.0.0.1",
    port: 1025,
    secure: false,
  });

  let mailOptions = {
    from: from,
    to: to,
    subject: subject,
    html: html,
  };

  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(`error: ${error}`);
      throw new Error("fail to send");
    }
    console.log(`Message Sent ${info.response}`);
  });
}
