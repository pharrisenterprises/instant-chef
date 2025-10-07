'use client';

type Menu = {
  id: string;
  title: string;
  description?: string;
  heroImageUrl?: string;
  portions?: number;
};

export default function MenuCardsSection({ menus }: { menus: Menu[] | null | undefined }) {
  if (!menus || menus.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
        No menus yet. Generate one above and we’ll show it here when it’s ready.
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {menus.map((m) => (
        <article key={m.id} className="rounded-xl border shadow-sm overflow-hidden">
          {m.heroImageUrl && <img src={m.heroImageUrl} alt="" className="w-full h-56 object-cover" />}
          <div className="p-4">
            <h3 className="font-semibold">{m.title}</h3>
            {m.description && <p className="text-sm text-gray-600 mt-1">{m.description}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
