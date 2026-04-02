import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { formatEgp } from "@/lib/format/locale";
import { revalidatePath } from "next/cache";

export default async function OrdersPage() {
  const session = await getServerSession();

  const walletProfile = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { phone: true },
      })
    : null;

  async function cancelOrderAction(formData: FormData) {
    "use server";

    const orderId = String(formData.get("orderId") ?? "").trim();
    if (!orderId) return;

    const activeSession = await getServerSession();
    if (!activeSession) return;

    const activeUser = await prisma.user.findUnique({
      where: { id: activeSession.userId },
      select: { phone: true },
    });

    await prisma.order.updateMany({
      where: {
        id: orderId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        OR: [
          { createdByUserId: activeSession.userId },
          ...(activeUser?.phone
            ? [{ customer: { phone: { equals: activeUser.phone } } }]
            : []),
        ],
      },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });

    revalidatePath("/orders");
  }

  if (!session) {
    return (
      <main className="min-h-[max(884px,100dvh)] pb-24 lg:pb-0 transition-colors bg-[#fcf9f2] text-[#1c1c18] font-sans antialiased" dir="rtl">
        <header className="fixed top-0 z-50 w-full bg-[#fcf9f2]/80 backdrop-blur-xl dark:bg-[#002117]/80">
          <div className="flex w-full items-center justify-between px-6 py-4">
            <Link href="/" className="scale-102 transition-transform active:scale-95 text-[#003527] dark:text-emerald-50">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
            </Link>
            <h1 className="font-serif text-lg tracking-wide text-[#003527] dark:text-emerald-50">طلباتي</h1>
            <div className="h-10 w-10"></div>
          </div>
        </header>
        <div className="mx-auto mb-16 max-w-4xl space-y-12 px-6 pt-32 text-center text-[#1c1c18]">
          <h2 className="text-2xl font-serif font-bold text-[#003527]">تسجيل الدخول مطلوب</h2>
          <p className="text-[#404944]">الرجاء تسجيل الدخول لعرض طلباتك</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/login" className="px-6 py-3 bg-[#003527] text-white rounded-lg font-bold">تسجيل الدخول</Link>
          </div>
        </div>
      </main>
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { createdByUserId: session.userId },
        ...(walletProfile?.phone
          ? [{ customer: { phone: { equals: walletProfile.phone } } }]
          : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      items: {
        include: {
          product: {
            select: { nameAr: true }
          }
        }
      }
    }
  });

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "PENDING": return { label: "قيد المراجعة", color: "bg-[#fed65b]/20 text-[#735c00]" };
      case "IN_PROGRESS": return { label: "جاري التجهيز", color: "bg-[#b0f0d6]/30 text-[#003527]" };
      case "COMPLETED": return { label: "تم التوصيل", color: "bg-[#064e3b]/10 text-[#064e3b]" };
      case "CANCELED": return { label: "ملغي", color: "bg-[#ba1a1a]/10 text-[#ba1a1a]" };
      default: return { label: status, color: "bg-gray-100 text-gray-700" };
    }
  };

  return (
    <main className="min-h-[max(884px,100dvh)] pb-24 lg:pb-0 transition-colors bg-[#fcf9f2] text-[#1c1c18] font-sans antialiased" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 z-50 w-full bg-[#fcf9f2]/80 backdrop-blur-xl dark:bg-[#002117]/80">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <Link href="/" className="scale-102 transition-transform active:scale-95 text-[#003527] dark:text-emerald-50">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
          </Link>
          <h1 className="font-serif text-lg tracking-wide text-[#003527] dark:text-emerald-50">طلباتي</h1>
          <div className="h-10 w-10"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto mb-16 max-w-4xl space-y-6 px-6 pt-24 text-[#1c1c18]">
        
        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="rounded bg-[#f6f3ec] p-3">
            <span className="material-symbols-outlined text-[#003527] text-3xl">receipt_long</span>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#003527]">سجل الطلبات</h2>
            <p className="text-xs text-[#404944] mt-1">تتبع حالة طلباتك الحالية والسابقة</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm h-64 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-[#e5e2db] mb-4">inbox</span>
            <p className="font-bold text-[#404944]">لا توجد طلبات سابقة</p>
            <Link href="/" className="mt-4 font-bold text-[#003527] underline">تصفح المنتجات</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getStatusDisplay(order.status);
              const canCancel = order.status === "PENDING" || order.status === "IN_PROGRESS";
              
              return (
                <div key={order.id} className="rounded-lg bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md border-r-4 border-[#003527]">
                  <div className="flex justify-between items-start mb-4 border-b border-[#f6f3ec] pb-4">
                    <div>
                      <p className="text-sm font-bold text-[#1c1c18]">طلب #{order.orderNumber}</p>
                      <p className="text-xs text-[#404944] mt-1">
                        {new Intl.DateTimeFormat("ar-EG", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-[11px] rounded uppercase font-bold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-[#735c00] mb-2">عناصر الطلب ({order.items.length})</p>
                    <div className="flex flex-col gap-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-[#404944]">
                          <span className="truncate max-w-[75%]">{item.product?.nameAr || "منتج"} <span className="text-[#a8b2c6]">x{Number(item.quantity)}</span></span>
                          <span className="font-bold">{formatEgp(Number(item.lineTotal))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-[#f6f3ec]">
                    <span className="text-sm font-bold text-[#404944]">الإجمالي</span>
                    <span className="font-serif text-lg font-bold text-[#003527]">{formatEgp(Number(order.totalAmount))}</span>
                  </div>

                  {canCancel && (
                    <form action={cancelOrderAction} className="mt-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-[#ba1a1a]/30 bg-[#ba1a1a]/5 py-2 text-sm font-bold text-[#ba1a1a] transition hover:bg-[#ba1a1a]/10"
                      >
                        إلغاء الطلب
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

       {/* Bottom Navigation Bar (Mobile) */}
       <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t bg-[#fcf9f2] border-stone-200/30 pb-safe shadow-[0_-4px_24px_rgba(28,28,24,0.04)] md:hidden">
        <Link href="/" className="flex flex-col items-center justify-center px-4 py-4 text-[#003527]/60 hover:bg-[#e5e2db]/30">
          <span className="material-symbols-outlined">home</span>
          <span className="mt-1 font-sans text-[10px]">الرئيسية</span>
        </Link>
        <Link href="/cart" className="flex flex-col items-center justify-center px-4 py-4 text-[#003527]/60 hover:bg-[#e5e2db]/30">
          <span className="material-symbols-outlined">local_mall</span>
          <span className="mt-1 font-sans text-[10px]">المتجر</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center justify-center px-4 py-4 font-bold text-[#735c00] duration-200 scale-110">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          <span className="mt-1 font-sans text-[10px]">الطلبات</span>
        </Link>
        <Link href="/account" className="flex flex-col items-center justify-center px-4 py-4 text-[#003527]/60 hover:bg-[#e5e2db]/30">
          <span className="material-symbols-outlined">person</span>
          <span className="mt-1 font-sans text-[10px]">حسابي</span>
        </Link>
      </nav>
    </main>
  );
}
