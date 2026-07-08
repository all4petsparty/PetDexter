"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { preloadModels, grabFrame, checkLiveness, classifyFrame, imageToDataUrl, segmentPet, embedSignature } from "@/lib/vision";
import { sillyName, randomStats } from "@/lib/cardFactory";
import { submitCapture } from "@/lib/capture";
import { startDemoBattle } from "@/lib/battle";
import { currentCans, spendCan, formatDuration, grantCans, MAX_CANS } from "@/lib/economy";
import RewardedAd from "@/components/RewardedAd";

type Phase = "idle" | "loading_models" | "scanning" | "rejected";

/** Sample photos for trying the AI pipeline without a live pet in front of you. */
const DEMO_PETS = [
  { src: "/demo/dog.jpg", emoji: "🐶", label: "Corgi" },
  // same corgi, different framing — demonstrates re-identification
  { src: "/demo/dog2.jpg", emoji: "🐶", label: "Corgi again" },
  { src: "/demo/cat.jpg", emoji: "🐱", label: "Cat" },
  { src: "/demo/bird.jpg", emoji: "🐦", label: "Macaw" },
  { src: "/demo/rabbit.jpg", emoji: "🐰", label: "Bunny" },
];

// Demo scans get jittered coordinates around Manila so the map fills in
const DEMO_CENTER = { lat: 14.5995, lng: 120.9842 };

const REJECT_MESSAGES: Record<string, string> = {
  screen_detected: "That looks like a screen! 📺 PetCatch only counts real-life friends.",
  no_animal: "No pet spotted! 🔍 Get a dog, cat, rabbit, or bird in the frame.",
  too_still: "Too still! 🖼️ Static photos don't count — find a live wiggly friend.",
  no_cans: "Out of snack cans! 🥫 Wait for a refill or watch an ad for a bonus can.",
  error: "Scan hiccup! 😵 Give it another try.",
};

/**
 * Capture View — live HTML5 camera stream (getUserMedia) feeding the
 * on-device Transformers.js pipeline: liveness check, species/breed
 * classification with screen anti-spoofing, and 768-d signature extraction.
 * Only the vector + classification + photo leave the device.
 */
export default function CaptureView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeView = useAppStore((s) => s.activeView);
  const checkedInVenue = useAppStore((s) => s.checkedInVenue);
  const setCaptureFlow = useAppStore((s) => s.setCaptureFlow);
  const patchCaptureFlow = useAppStore((s) => s.patchCaptureFlow);
  const collection = useAppStore((s) => s.collection);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  // 0 = idle, 1 = pet spotted, 2 = signature read, 3 = cutting out
  const [scanStep, setScanStep] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const cansState = useAppStore((s) => s.cans);
  void cansState; // subscribe: re-render when cans change
  const { count: canCount, nextRefillMs } = currentCans();

  /** One scan costs one snack can (CatchCat-style energy). */
  function takeCan(): boolean {
    if (spendCan()) return true;
    setRejectReason("no_cans");
    setPhase("rejected");
    return false;
  }

  useEffect(() => {
    if (activeView !== "capture") return;
    let stream: MediaStream | undefined;

    preloadModels(); // start model download while the user frames the shot

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
      } catch {
        setCameraError("Camera unavailable — allow camera access to catch pets!");
      }
    })();

    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [activeView]);

  /**
   * Staged scan: classification is the only blocking step (~1-2s). The
   * catch minigame opens immediately after it passes; the cutout, the
   * DINOv2 signature, and the uniqueness verdict stream in while the
   * player drags the treat — the game itself hides the compute time.
   */
  async function processScan(dataUrl: string) {
    setScanStep(1);
    const scan = await classifyFrame(dataUrl);
    if (!scan.ok) {
      setRejectReason(scan.reason ?? "error");
      setPhase("rejected");
      setScanStep(0);
      return;
    }

    // A wild pet appeared! Open the minigame right away
    setCaptureFlow({ photoUrl: dataUrl, species: scan.species, cutoutUrl: null, outcome: null });
    setPhase("idle");
    setScanStep(0);

    // …and finish the heavy lifting in the background
    try {
      const cutoutUrl = await segmentPet(dataUrl);
      patchCaptureFlow({ cutoutUrl }); // the sticker pops in live
      // identity comes from the background-free cutout
      const signature = await embedSignature(cutoutUrl ?? dataUrl);
      const outcome = await submitCapture({
        dataUrl,
        signature,
        species: scan.species,
        breed: scan.breed,
        customName: sillyName(scan.species),
        stats: randomStats(),
        cutoutUrl,
      });
      patchCaptureFlow({ outcome });
    } catch {
      patchCaptureFlow({ failed: true });
    }
  }

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || phase === "scanning") return;
    if (!takeCan()) return;

    setPhase("scanning");
    setRejectReason(null);
    try {
      // Liveness heuristic (motion between two frames)
      const alive = await checkLiveness(video);
      if (!alive) {
        setRejectReason("too_still");
        setPhase("rejected");
        return;
      }
      await processScan(grabFrame(video));
    } catch {
      setRejectReason("error");
      setPhase("rejected");
    }
  }

  async function handleDemoScan(src: string) {
    if (phase === "scanning") return;
    if (!takeCan()) return;
    setPhase("scanning");
    setRejectReason(null);
    try {
      // Demo photos are stills, so the liveness check is skipped by design;
      // give each scan a spot near the demo city so the map fills in
      useAppStore.getState().setPosition({
        lat: DEMO_CENTER.lat + (Math.random() - 0.5) * 0.02,
        lng: DEMO_CENTER.lng + (Math.random() - 0.5) * 0.02,
      });
      await processScan(await imageToDataUrl(src));
    } catch {
      setRejectReason("error");
      setPhase("rejected");
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Catch a Pet! 📸</h1>
          <p className="text-ink/60">Point at a real animal to scan it.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => canCount < MAX_CANS && setShowAd(true)}
            className="tappable rounded-full bg-white px-3 py-1.5 text-sm font-extrabold shadow-md"
          >
            🥫 {canCount}/{MAX_CANS}
            {nextRefillMs != null && (
              <span className="ml-1 text-[10px] font-bold text-ink/40">+1 in {formatDuration(nextRefillMs)}</span>
            )}
          </button>
          {checkedInVenue && (
            <span className="animate-pop-in rounded-full bg-grass px-3 py-1 text-xs font-bold text-white">
              📍 {checkedInVenue.name}
            </span>
          )}
        </div>
      </header>

      <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-ink shadow-lg">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center font-bold text-white">
            {cameraError}
          </div>
        )}
        <div
          className={`pointer-events-none absolute inset-8 rounded-[2rem] border-4 border-dashed ${
            phase === "scanning" ? "animate-pulse border-grass" : "border-sunny/80"
          }`}
        />
        {/* Corner framing brackets (video-style viewfinder) */}
        {(["top-4 left-4 border-t-4 border-l-4 rounded-tl-xl",
           "top-4 right-4 border-t-4 border-r-4 rounded-tr-xl",
           "bottom-4 left-4 border-b-4 border-l-4 rounded-bl-xl",
           "bottom-4 right-4 border-b-4 border-r-4 rounded-br-xl"] as const).map((pos) => (
          <span key={pos} className={`pointer-events-none absolute h-8 w-8 border-tangerine ${pos}`} />
        ))}
        {/* Live scan checklist (video-style "Body found / Head found") */}
        {phase === "scanning" && (
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {[
              { step: 1, label: "Pet spotted" },
              { step: 2, label: "Fur signature read" },
              { step: 3, label: "Cutting out your friend" },
            ].map(({ step, label }) => (
              <span
                key={step}
                className={`animate-pop-in rounded-full px-3 py-1 text-xs font-bold shadow transition-all ${
                  scanStep > step
                    ? "bg-grass text-white"
                    : scanStep === step
                      ? "bg-white/95 text-ink"
                      : "bg-white/40 text-ink/40"
                }`}
              >
                {scanStep > step ? "✅" : scanStep === step ? "⏳" : "•"} {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {phase === "rejected" && rejectReason && (
        <p className="animate-pop-in rounded-2xl bg-tangerine/20 px-4 py-3 text-center font-bold text-tangerine-deep">
          {REJECT_MESSAGES[rejectReason]}
        </p>
      )}

      <button
        type="button"
        onClick={handleCapture}
        disabled={phase === "scanning" || Boolean(cameraError)}
        className="tappable mx-auto flex h-20 w-20 items-center justify-center rounded-full border-8 border-sunny bg-tangerine text-3xl shadow-xl disabled:opacity-50"
        aria-label="Capture"
      >
        {phase === "scanning" ? "⏳" : "🐾"}
      </button>
      <p className="text-center text-xs text-ink/40">
        AI runs 100% on your device — first scan downloads the model (~90 MB).
      </p>

      <section className="rounded-card bg-white p-4 shadow-md">
        <h2 className="font-extrabold">🧪 Demo scans</h2>
        <p className="mb-3 text-xs text-ink/50">
          No pet nearby? Run the real AI pipeline on a sample photo.
        </p>
        <div className="flex gap-3">
          {DEMO_PETS.map((pet) => (
            <button
              key={pet.src}
              type="button"
              onClick={() => handleDemoScan(pet.src)}
              disabled={phase === "scanning"}
              className="tappable flex flex-1 flex-col items-center gap-1 disabled:opacity-50"
            >
              <span className="relative block h-16 w-16 overflow-hidden rounded-2xl border-4 border-sunny">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pet.src} alt={pet.label} className="h-full w-full object-cover" />
              </span>
              <span className="text-xs font-bold text-ink/60">
                {pet.emoji} {pet.label}
              </span>
            </button>
          ))}
        </div>
        {/* Steal War (real trigger: two users scan the same pet at the same
            venue → server battle from migration 0002; demo rival until then) */}
        <button
          type="button"
          disabled={collection.length === 0 || phase === "scanning"}
          onClick={() => {
            const contested = collection[Math.floor(Math.random() * collection.length)];
            startDemoBattle(contested);
          }}
          className="tappable mt-3 w-full rounded-full bg-tangerine px-4 py-3 font-extrabold text-white shadow-md disabled:opacity-40"
        >
          ⚔️ Rival Steal War (demo)
        </button>
        {collection.length === 0 && (
          <p className="mt-1 text-center text-[11px] text-ink/40">
            Catch a pet first — rivals only fight over pets you both scanned!
          </p>
        )}
      </section>

      {showAd && (
        <RewardedAd
          rewardLabel="1 snack can"
          onComplete={() => grantCans(1)}
          onClose={() => setShowAd(false)}
        />
      )}
    </div>
  );
}
