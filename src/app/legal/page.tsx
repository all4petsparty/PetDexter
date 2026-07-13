import Link from "next/link";

export const metadata = { title: "Legal — PetDexter" };

export default function LegalHub() {
  return (
    <>
      <h1>Legal</h1>
      <p className="text-ink/60">View our legal documents and policies.</p>
      <div className="mt-4 flex flex-col gap-3 not-prose">
        <Link
          href="/legal/terms"
          className="tappable flex items-center gap-3 rounded-2xl bg-cream px-4 py-4 shadow-sm"
        >
          <span className="text-2xl">📄</span>
          <span>
            <span className="block font-extrabold">Terms &amp; Conditions</span>
            <span className="text-sm text-ink/60">Read our terms of service</span>
          </span>
          <span className="ml-auto text-tangerine-deep">›</span>
        </Link>
        <Link
          href="/legal/privacy"
          className="tappable flex items-center gap-3 rounded-2xl bg-cream px-4 py-4 shadow-sm"
        >
          <span className="text-2xl">🛡️</span>
          <span>
            <span className="block font-extrabold">Privacy Policy</span>
            <span className="text-sm text-ink/60">How we handle your data</span>
          </span>
          <span className="ml-auto text-tangerine-deep">›</span>
        </Link>
      </div>
    </>
  );
}
