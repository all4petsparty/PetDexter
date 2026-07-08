import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-cream px-5 pb-16 pt-6 font-display text-ink">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold shadow-md"
      >
        ← Back to PetCatch
      </Link>
      <article className="prose-sm rounded-card bg-white p-6 shadow-md [&_h1]:text-2xl [&_h1]:font-extrabold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-extrabold [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </article>
    </div>
  );
}
