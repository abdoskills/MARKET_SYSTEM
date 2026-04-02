import nodemailer from "nodemailer";
import { buildReceiptEmailHtml } from "@/server/templates/receipt";

const SMTP_USER = process.env.SMTP_USER ?? "abdoskills27@gmail.com";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD ?? "hbuv esys babw nzue";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

type VerificationEmailInput = {
  to: string;
  fullName?: string | null;
  code: string;
};

type PasswordResetEmailInput = {
  to: string;
  fullName?: string | null;
  resetLink: string;
};

type ReceiptEmailInput = {
  to: string;
  fullName?: string | null;
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
    totalAmount: number;
    paymentMethod: "CASH" | "CARD";
  };
  items: Array<{
    nameAr: string;
    quantity: number;
    lineTotal: number;
  }>;
  walletUpdate?: {
    addedAmount: number;
    newBalance: number;
  };
};

function renderShell(input: { title: string; subtitle: string; contentHtml: string }) {
  return `
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0; padding:24px; background:#ecf6f1; font-family:'Be Vietnam Pro', Inter, Segoe UI, Arial, sans-serif; color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; margin:0 auto; background:#f6fbf9; border-radius:32px; padding:32px; border:none;">
      <tr>
        <td style="text-align:center;">
          <div style="display:inline-block; background:#d8eee4; color:#006c4a; padding:10px 18px; border-radius:999px; font-weight:700; font-size:13px; letter-spacing:.3px;">Pristine POS</div>
          <h1 style="margin:16px 0 8px; font-size:30px; line-height:1.2; color:#006c4a; font-weight:800;">${input.title}</h1>
          <p style="margin:0 0 24px; color:#4b5563; font-size:15px;">${input.subtitle}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff; border-radius:32px; padding:28px; border:none;">
          ${input.contentHtml}
        </td>
      </tr>
      <tr>
        <td style="padding-top:18px; text-align:center; color:#6b7280; font-size:12px;">
          Verdant Ledger security notice • This email was sent automatically.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(input: VerificationEmailInput) {
  const greeting = input.fullName?.trim() ? `Hi ${input.fullName.trim()},` : "Hi,";

  const html = renderShell({
    title: "Verify your email",
    subtitle: "Use this secure 6-digit code within 10 minutes.",
    contentHtml: `
      <p style="margin:0 0 16px; font-size:15px; color:#111827;">${greeting}</p>
      <p style="margin:0 0 22px; font-size:14px; color:#374151;">Enter this code on the verification page to activate your account.</p>
      <div style="text-align:center; margin:0 0 22px;">
        <span style="display:inline-block; background:#e8f4ef; color:#006c4a; border-radius:18px; padding:14px 20px; font-size:32px; letter-spacing:8px; font-weight:800;">${input.code}</span>
      </div>
      <p style="margin:0; font-size:13px; color:#6b7280;">If you did not create an account, you can ignore this message.</p>
    `,
  });

  await transporter.sendMail({
    from: `"Pristine POS Security" <${SMTP_USER}>`,
    to: input.to,
    subject: "Verify your Pristine POS account",
    html,
  });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const greeting = input.fullName?.trim() ? `Hi ${input.fullName.trim()},` : "Hi,";

  const html = renderShell({
    title: "Reset your password",
    subtitle: "This secure reset link expires in 1 hour.",
    contentHtml: `
      <p style="margin:0 0 16px; font-size:15px; color:#111827;">${greeting}</p>
      <p style="margin:0 0 20px; font-size:14px; color:#374151;">Click the button below to set a new password:</p>
      <div style="text-align:center; margin:0 0 20px;">
        <a href="${input.resetLink}" style="display:inline-block; background:#006c4a; color:#ffffff; text-decoration:none; border-radius:999px; padding:12px 22px; font-weight:700;">Reset password</a>
      </div>
      <p style="margin:0 0 8px; font-size:13px; color:#6b7280;">Or copy this link:</p>
      <p style="margin:0; word-break:break-all; font-size:12px; color:#006c4a;">${input.resetLink}</p>
    `,
  });

  await transporter.sendMail({
    from: `"Pristine POS Security" <${SMTP_USER}>`,
    to: input.to,
    subject: "Password reset for Pristine POS",
    html,
  });
}

export async function sendReceipt(input: ReceiptEmailInput) {
  const html = buildReceiptEmailHtml({
    customerName: input.fullName,
    orderId: input.order.id,
    orderNumber: input.order.orderNumber,
    createdAtIso: input.order.createdAt,
    items: input.items,
    totalAmount: input.order.totalAmount,
    paymentMethod: input.order.paymentMethod,
    walletAddedAmount: input.walletUpdate?.addedAmount,
    walletNewBalance: input.walletUpdate?.newBalance,
  });

  await transporter.sendMail({
    from: `"Pristine POS Receipts" <${SMTP_USER}>`,
    to: input.to,
    subject: `إيصال الطلب ${input.order.orderNumber}`,
    html,
  });
}
