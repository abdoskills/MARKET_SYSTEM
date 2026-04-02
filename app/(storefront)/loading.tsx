export default function StorefrontLoading() {
  return (
    <main className="min-h-screen bg-[#f7f9fb] px-6 pt-24 pb-12" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-10 w-48 animate-pulse rounded-xl bg-slate-200" />

        <div className="mb-8 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 w-28 animate-pulse rounded-full bg-slate-200" />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <article key={idx} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="aspect-square animate-pulse rounded-xl bg-slate-200" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200" />
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
