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
    <main className="min-h-screen bg-[#f7f9fb] text-[#191c1e] antialiased mb-24 font-sans" dir="rtl">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <TopActions isAuthenticated={Boolean(session)} role={session?.role} />
          <form action="/products" method="GET" className="flex-1 max-w-xl mx-auto">
            <div className="relative flex items-center bg-[#e8f3ee] rounded-xl px-4 py-2">
              <span className="material-symbols-outlined text-slate-600 mr-2 text-sm">search</span>
              <input
                type="text"
                name="q"
                defaultValue={params.q}
                className="bg-transparent border-none focus:ring-0 text-sm w-full text-right outline-none"
                placeholder="ابحث عن منتج..."
              />
              {params.category && <input type="hidden" name="category" value={params.category} />}
            </div>
          </form>
          <Link href="/" className="text-sm md:text-base font-bold text-[#006c4a]">Pristine POS</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-3xl bg-gradient-to-l from-[#006c4a] to-[#3fb687] p-6 text-white shadow-[0_20px_40px_rgba(0,108,74,0.2)]">
          <h1 className="text-2xl md:text-3xl font-black">كل المنتجات</h1>
          <p className="mt-2 text-sm md:text-base text-white/90">واجهة حديثة وسريعة لعرض المنتجات وإضافتها إلى السلة.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 mt-6">
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          <Link
            href="/products"
            className={`flex-shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm border-2 transition-colors ${
              !params.category
                ? "bg-emerald-50 text-emerald-700 border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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
                className={`flex-shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm border-2 transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100">
            <p className="text-base font-medium text-slate-500">لا توجد منتجات مطابقة للفلتر الحالي.</p>
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
