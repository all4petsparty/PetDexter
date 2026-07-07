"use client";

import { useAppStore, type ViewKey } from "@/lib/store";
import {
  MapIcon,
  CollectionIcon,
  PawIcon,
  TrophyIcon,
  ProfileIcon,
} from "@/components/icons";

const TABS: {
  key: ViewKey;
  label: string;
  Icon: (props: { className?: string }) => React.ReactNode;
  activeColor: string;
}[] = [
  { key: "map", label: "Map", Icon: MapIcon, activeColor: "bg-sky text-white" },
  { key: "collection", label: "PetDex", Icon: CollectionIcon, activeColor: "bg-grass text-white" },
  { key: "capture", label: "Catch!", Icon: PawIcon, activeColor: "bg-tangerine text-white" },
  { key: "leaderboards", label: "Ranks", Icon: TrophyIcon, activeColor: "bg-sunny text-ink" },
  { key: "profile", label: "Me", Icon: ProfileIcon, activeColor: "bg-bubblegum text-white" },
];

export default function BottomNav() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl border-t-4 border-sunny bg-white px-2 pt-2 shadow-[0_-8px_30px_rgba(45,42,50,0.12)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <ul className="flex items-end justify-around">
        {TABS.map(({ key, label, Icon, activeColor }) => {
          const isActive = activeView === key;
          const isCapture = key === "capture";
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => setActiveView(key)}
                aria-current={isActive ? "page" : undefined}
                className={`tappable mx-auto flex w-full flex-col items-center gap-0.5 py-1 font-semibold ${
                  isCapture ? "-mt-7" : ""
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-2xl transition-all ${
                    isCapture
                      ? `h-16 w-16 rounded-full border-4 border-white shadow-lg ${
                          isActive ? "bg-tangerine-deep" : "bg-tangerine"
                        } text-white`
                      : `h-9 w-14 ${isActive ? `${activeColor} animate-pop-in` : "text-ink/40"}`
                  }`}
                >
                  <Icon className={isCapture ? "h-8 w-8" : "h-6 w-6"} />
                </span>
                <span
                  className={`text-[11px] ${
                    isActive ? "text-ink" : "text-ink/40"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
