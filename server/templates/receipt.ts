type ReceiptItem = {
  nameAr: string;
  quantity: number;
  lineTotal: number;
};

type BuildReceiptTemplateInput = {
  customerName?: string | null;
  orderId: string;
  orderNumber: string;
  createdAtIso: string;
  items: ReceiptItem[];
  totalAmount: number;
  paymentMethod: "CASH" | "CARD";
  walletAddedAmount?: number;
  walletNewBalance?: number;
};

function money(value: number) {
  return `${value.toFixed(2)} ج.م`;
}

export function buildReceiptEmailHtml(input: BuildReceiptTemplateInput) {
  const dateLabel = new Date(input.createdAtIso).toLocaleString("ar-EG");

  const rows = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px; text-align:right; color:#0f172a;">${item.nameAr}</td>
          <td style="padding:10px 12px; text-align:center; color:#334155;">${item.quantity.toFixed(3)}</td>
          <td style="padding:10px 12px; text-align:left; color:#0f172a; font-family:'Be Vietnam Pro', Inter, Arial, sans-serif;">${money(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  const walletSection =
    typeof input.walletAddedAmount === "number" && typeof input.walletNewBalance === "number"
      ? `
      <div style="margin-top:16px; border-radius:16px; background:#eef9f4; padding:14px;">
        <p style="margin:0 0 8px; color:#006c4a; font-weight:800;">تحديث المحفظة (الفكة)</p>
        <p style="margin:0 0 6px; color:#334155;">تمت إضافة: <span style="font-family:'Be Vietnam Pro', Inter, Arial, sans-serif; font-weight:700;">${money(
          input.walletAddedAmount,
        )}</span></p>
        <p style="margin:0; color:#334155;">الرصيد الجديد: <span style="font-family:'Be Vietnam Pro', Inter, Arial, sans-serif; font-weight:700;">${money(
          input.walletNewBalance,
        )}</span></p>
      </div>
    `
      : "";

  return `
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>إيصال Pristine POS</title>
  </head>
  <body style="margin:0; padding:24px; background:#ecf6f1; font-family:Inter, Arial, sans-serif; color:#0f172a; direction:rtl; text-align:right;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; margin:0 auto; background:#f8fcfa; border-radius:16px;">
      <tr>
        <td style="padding:24px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="display:inline-block; background:#d8eee4; color:#006c4a; border-radius:999px; padding:8px 14px; font-weight:800;">Pristine POS</div>
            <div style="color:#64748b; font-size:13px;">شكراً لاختياركم بريستين</div>
          </div>

          <div style="margin-top:16px; border-radius:16px; background:#ffffff; padding:16px;">
            <p style="margin:0 0 6px; color:#334155;">رقم الطلب: <strong>${input.orderNumber}</strong></p>
            <p style="margin:0 0 6px; color:#334155;">رقم العملية: <strong>${input.orderId}</strong></p>
            <p style="margin:0; color:#334155;">التاريخ: <strong>${dateLabel}</strong></p>
            ${input.customerName ? `<p style="margin:8px 0 0; color:#334155;">العميل: <strong>${input.customerName}</strong></p>` : ""}
          </div>

          <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px; border-collapse:separate; border-spacing:0 8px;">
            <thead>
              <tr>
                <th style="padding:8px 12px; text-align:right; color:#64748b; font-size:13px;">الصنف</th>
                <th style="padding:8px 12px; text-align:center; color:#64748b; font-size:13px;">الكمية</th>
                <th style="padding:8px 12px; text-align:left; color:#64748b; font-size:13px;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top:14px; border-radius:16px; background:#ffffff; padding:16px;">
            <p style="margin:0 0 6px; color:#334155;">طريقة الدفع: <strong>${input.paymentMethod === "CASH" ? "نقداً" : "بطاقة"}</strong></p>
            <p style="margin:0; color:#006c4a; font-size:20px; font-weight:900;">الإجمالي: <span style="font-family:'Be Vietnam Pro', Inter, Arial, sans-serif;">${money(
              input.totalAmount,
            )}</span></p>
          </div>

          ${walletSection}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
