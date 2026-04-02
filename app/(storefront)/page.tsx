import CartDrawer from "@/components/storefront/CartDrawer";
import FloatingCartBar from "@/components/storefront/FloatingCartBar";
import ProductCard from "@/components/storefront/ProductCard";
import TopActions from "@/components/storefront/TopActions";
import { getStorefrontProducts, listActiveCategories } from "@/server/services/product.service";
import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession();
  const products = await getStorefrontProducts({ q: params.q, category: params.category });
  const categories = await listActiveCategories();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-white text-[#1c1c18] antialiased mb-8 font-sans" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-xl shadow-sm border-none">
        <div className="mx-auto w-full max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="text-lg md:text-xl font-bold font-serif tracking-wide text-[#003527] whitespace-nowrap">L'Artisan Laitier</Link>
            <div className="flex items-center gap-3">
              <TopActions isAuthenticated={Boolean(session)} role={session?.role} />
            </div>
          </div>

          <div className="mt-3">
            <form action="/" method="GET" className="relative flex items-center rounded-xl bg-surface-container-lowest border border-[#e5e2db] px-4 py-2 shadow-sm focus-within:border-[#003527] focus-within:ring-1 focus-within:ring-[#003527] transition-all">
              <span className="material-symbols-outlined ml-2 text-[#404944] text-[20px]">search</span>
              <input
                type="text"
                name="q"
                defaultValue={params.q}
                className="bg-transparent border-none focus:ring-0 text-sm w-full text-right outline-none text-[#1c1c18] placeholder:text-[#bfc9c3]"
                placeholder="بحث عن منتجات..."
              />
              {params.category && <input type="hidden" name="category" value={params.category} />}
            </form>
          </div>
        </div>
      </header>

      <div className="pt-32 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="mt-4 mb-8">
          <div className="relative h-48 md:h-72 rounded-3xl overflow-hidden shadow-ambient">
            <img 
              className="w-full h-full object-cover" 
              alt="Fresh organic milk"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQCzweZlJOzk87mtApG_oh_YCv92CIMJLVIvq2G7daJ1_rVvdW5dolHrjf8F29zhvrEU0v8bXmRUGbccWWV4ipXZLwxnqM5BQWr0_dNF1XvchE1oPaBfiNg428QK29kYrvuO5ypxsU7X0MH9wtRuc1Vi9ikacdEkRoYQKxxa3o2j9L8G8mKlaX1zvdjslDw0T8JHVszF2MrYcuwR8C8Mg4TNsCTtkmWOK3KVSC8HD3kbvYap9wmRLs9wXqcF-2cpBI3RrPSkylznFg"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 to-transparent flex flex-col justify-center p-8 text-white">
              <h2 className="text-2xl md:text-4xl font-bold font-serif tracking-tight mb-2">طازج يومياً</h2>
              <p className="text-sm md:text-base text-[#e5e2db] opacity-90 font-sans font-medium">خصم 20% على جميع منتجات الألبان</p>
              <Link href="/?category=dairy" className="mt-4 w-fit px-6 py-2 bg-[#003527] rounded-xl text-sm font-bold shadow-md hover:bg-[#064e3b] active:scale-[0.98] transition-all">
                تسوق الآن
              </Link>
            </div>
          </div>
        </section>

        {/* Categories Scrolling Pills */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[#003527] font-serif tracking-tight">الفئات</h3>
            <Link href="/" className="text-[#003527] text-sm font-bold hover:underline transition-all tracking-wide">عرض الكل</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            <Link
              href="/"
              className={`flex-shrink-0 px-6 py-2.5 rounded-full font-bold text-sm border-2 transition-all ${
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
                  href={`/?category=${cat.slug}${params.q ? `&q=${params.q}` : ''}`}
                  className={`flex-shrink-0 px-6 py-2.5 rounded-full font-bold text-sm border-2 transition-all ${
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

        {/* Product Grid */}
        <section className="mb-12">
          <h3 className="text-lg font-bold text-[#003527] font-serif tracking-tight mb-4">منتجات مميزة</h3>
          
          {products.length === 0 ? (
            <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-12 text-center shadow-ambient border-none">
              <p className="text-base font-bold font-sans text-[#404944]">عذراً، لا توجد منتجات مطابقة للبحث.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>

      <FloatingCartBar />
      <CartDrawer />
    </main>
  );
}
