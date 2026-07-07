"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import CardReveal from "@/components/CardReveal";
import BattleArena from "@/components/BattleArena";
import MapView from "@/views/MapView";
import CollectionView from "@/views/CollectionView";
import CaptureView from "@/views/CaptureView";
import LeaderboardsView from "@/views/LeaderboardsView";
import ProfileView from "@/views/ProfileView";

/**
 * Single-page shell: the five views are swapped by Zustand state rather
 * than routes, so tab switches are instant and camera/map state survives
 * (views stay mounted, hidden with CSS).
 */
export default function AppShell() {
  const activeView = useAppStore((s) => s.activeView);

  // Rehydrate the persisted PetDex after mount (skipHydration avoids SSR mismatch)
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  const views = [
    { key: "map", node: <MapView /> },
    { key: "collection", node: <CollectionView /> },
    { key: "capture", node: <CaptureView /> },
    { key: "leaderboards", node: <LeaderboardsView /> },
    { key: "profile", node: <ProfileView /> },
  ] as const;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 pb-28">
        {views.map(({ key, node }) => (
          <section
            key={key}
            hidden={activeView !== key}
            className={activeView === key ? "animate-pop-in" : ""}
          >
            {node}
          </section>
        ))}
      </main>
      <BottomNav />
      <CardReveal />
      <BattleArena />
    </div>
  );
}
