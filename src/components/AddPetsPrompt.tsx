"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import Portal from "@/components/Portal";
import CaptureMyPet from "@/components/CaptureMyPet";

/**
 * One-time "add your own pets" suggestion shown the first time a user
 * reaches the main app (spec §5's "Add My Pet" starting path). Distinct
 * from WelcomeBack (which nudges every fresh session) — this fires
 * exactly once ever, tracked via myPetsPromptSeen, and takes priority
 * over WelcomeBack so the two never stack.
 */
export default function AddPetsPrompt() {
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const myPetsPromptSeen = useAppStore((s) => s.myPetsPromptSeen);
  const setMyPetsPromptSeen = useAppStore((s) => s.setMyPetsPromptSeen);
  const authUser = useAppStore((s) => s.authUser);
  const collection = useAppStore((s) => s.collection);
  const guestImportDoneFor = useAppStore((s) => s.guestImportDoneFor);

  const [open, setOpen] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  useEffect(() => {
    if (!hasOnboarded || myPetsPromptSeen) return;
    // don't collide with the first-sign-in guest-import prompt
    const importPending = authUser && collection.length > 0 && guestImportDoneFor !== authUser.id;
    if (importPending) return;
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [hasOnboarded, myPetsPromptSeen, authUser, collection.length, guestImportDoneFor]);

  function dismiss() {
    setMyPetsPromptSeen(true);
    setOpen(false);
  }

  if (showCapture) {
    return <CaptureMyPet onClose={() => { dismiss(); setShowCapture(false); }} />;
  }
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm" onClick={dismiss}>
        <div
          className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-4 rounded-card bg-white p-6 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-5xl">🏠</span>
          <h2 className="text-2xl font-extrabold">Add your own pets!</h2>
          <p className="text-sm font-semibold text-ink/60">
            Give your own furry, feathery, or floofy family members the star treatment. Throw a
            treat to snap their photo, tell us their name, and they'll live in <b>My Pets</b> —
            completely free, no Discovery Snacks needed.
          </p>
          <button
            type="button"
            onClick={() => setShowCapture(true)}
            className="tappable w-full rounded-full bg-bubblegum px-6 py-4 text-lg font-extrabold text-white shadow-md"
          >
            Ready to capture 📸
          </button>
          <button type="button" onClick={dismiss} className="text-sm font-bold text-ink/40">
            Maybe later
          </button>
        </div>
      </div>
    </Portal>
  );
}
