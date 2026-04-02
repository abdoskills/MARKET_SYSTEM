import CartDrawer from "@/components/storefront/CartDrawer";
import FloatingCartBar from "@/components/storefront/FloatingCartBar";
import ProductCard from "@/components/storefront/ProductCard";
import TopActions from "@/components/storefront/TopActions";
import { getStorefrontProducts, listActiveCategories } from "@/server/services/product.service";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession();
  const products = await getStorefrontProducts({ q: params.q, category: params.category });
  const categories = await listActiveCategories();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-white text-[#1c1c18] antialiased mb-24 font-sans" dir="rtl">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-none shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <TopActions isAuthenticated={Boolean(session)} role={session?.role} />
          <form action="/products" method="GET" className="flex-1 max-w-xl mx-auto">
            <div className="relative flex items-center bg-surface-container-lowest border border-[#e5e2db] rounded-xl px-4 py-2 shadow-sm focus-within:border-[#003527] focus-within:ring-1 focus-within:ring-[#003527] transition-all">
              <span className="material-symbols-outlined text-[#404944] mr-2 text-sm">search</span>
              <input
                type="text"
                name="q"
                defaultValue={params.q}
                className="bg-transparent border-none focus:ring-0 text-sm w-full text-right outline-none text-[#1c1c18] placeholder:text-[#bfc9c3]"
                placeholder="ابحث عن منتج..."
              />
              {params.category && <input type="hidden" name="category" value={params.category} />}
            </div>
          </form>
          <Link href="/" className="text-sm md:text-base font-bold text-[#003527] font-serif tracking-wide">L'Artisan Laitier</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-3xl bg-[#003527] shadow-ambient p-8 text-[#e5e2db] flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight text-white mb-2">كل المنتجات</h1>
          <p className="mt-2 text-sm md:text-base text-[#bfc9c3]">واجهة حديثة وسريعة لعرض المنتجات وإضافتها إلى السلة.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 mt-6">
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          <Link
            href="/products"
            className={`flex-shrink-0 px-5 py-2.5 rounded-full font-bold text-sm border-2 transition-all ${
              !params.category
                ? "bg-[#003527] text-white border-transparent"
                : "bg-white/80 backdrop-blur-sm text-[#404944] border-[#e5e2db] hover:border-[#003527] hover:text-[#003527]"
            }`}
          >
            الكل
          </Link>
          {categories.map((cat) => {
            const isActive = params.category === cat.slug;
            return (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}${params.q ? `&q=${params.q}` : ""}`}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full font-bold text-sm border-2 transition-all ${
                  isActive
                    ? "bg-[#003527] text-white border-transparent"
                    : "bg-white/80 backdrop-blur-sm text-[#404944] border-[#e5e2db] hover:border-[#003527] hover:text-[#003527]"
                }`}
              >
                {cat.nameAr}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 mt-6 pb-10">
        {products.length === 0 ? (
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-12 text-center shadow-ambient border-none">
            <p className="text-base font-bold font-sans text-[#404944]">لا توجد منتجات مطابقة للفلتر الحالي.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <FloatingCartBar />
      <CartDrawer />
    </main>
  );
}
