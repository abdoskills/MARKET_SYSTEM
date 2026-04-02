import nodemailer from "nodemailer";
import { buildReceiptEmailHtml } from "@/server/templates/receipt";

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE ?? "false") === "true";

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    })
  : nodemailer.createTransport({
      service: "gmail",
      auth: SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    });

function getFromAddress(fallbackName: string) {
  if (!SMTP_USER) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }
  return `"${fallbackName}" <${SMTP_USER}>`;
}

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
  <body style="margin:0; padding:24px; background:#fcf9f2; font-family:'Be Vietnam Pro', Inter, Segoe UI, Arial, sans-serif; color:#404944;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:40px; padding:40px 32px; border:none; box-shadow:0 28px 90px rgba(0,53,39,0.09);">
      <tr>
        <td style="text-align:center;">
          <div style="display:inline-block; color:#003527; font-family:'Noto Serif', Georgia, 'Times New Roman', serif; font-style:italic; font-weight:700; font-size:24px; letter-spacing:.2px;">L'Artisan Laitier</div>
          <h1 style="margin:22px 0 10px; font-size:36px; line-height:1.2; color:#003527; font-family:'Noto Serif', Georgia, 'Times New Roman', serif; font-weight:700;">${input.title}</h1>
          <p style="margin:0 0 26px; color:#404944; font-size:15px;">${input.subtitle}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff; border-radius:24px; padding:4px; border:none;">
          ${input.contentHtml}
        </td>
      </tr>
      <tr>
        <td style="padding-top:26px; text-align:center; color:#7b857f; font-size:11px; letter-spacing:1.6px; text-transform:uppercase; font-weight:600;">
          Verdant Ledger Security Notice
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(input: VerificationEmailInput) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const confirmLink = `${appUrl}/verify?email=${encodeURIComponent(input.to)}`;
  const greeting = input.fullName?.trim() ? `Hi ${input.fullName.trim()},` : "Hi,";

  const html = renderShell({
    title: "Verify your email",
    subtitle: "Use this secure 6-digit code within 10 minutes.",
    contentHtml: `
      <p style="margin:0 0 14px; font-size:15px; color:#404944;">${greeting}</p>
      <p style="margin:0 0 22px; font-size:14px; color:#404944;">Enter this code on the verification page to activate your account.</p>
      <div style="margin:0 0 22px; border-radius:24px; padding:24px 16px; text-align:center; background:linear-gradient(135deg, #10b981 0%, #064e3b 100%); box-shadow:0 18px 36px rgba(6,78,59,0.25);">
        <span style="display:inline-block; color:#F59E0B; font-size:34px; letter-spacing:0.4em; font-weight:800;">${input.code}</span>
      </div>
      <div style="text-align:center; margin:0 0 18px;">
        <a href="${confirmLink}" style="display:inline-block; background:#003527; color:#ffffff; text-decoration:none; border-radius:14px; padding:12px 22px; font-weight:700; box-shadow:0 10px 24px rgba(0,53,39,0.26);">Confirm Account</a>
      </div>
      <p style="margin:0; font-size:13px; color:#64716b;">If you did not create an account, you can ignore this message.</p>
    `,
  });

  try {
    await transporter.sendMail({
      from: getFromAddress("L'Artisan Laitier Security"),
      to: input.to,
      subject: "Verify your L'Artisan Laitier account",
      html,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw error;
  }
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
    from: getFromAddress("L'Artisan Laitier Security"),
    to: input.to,
    subject: "Password reset for L'Artisan Laitier",
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
    from: getFromAddress("L'Artisan Laitier Receipts"),
    to: input.to,
    subject: `إيصال الطلب ${input.order.orderNumber}`,
    html,
  });
}
