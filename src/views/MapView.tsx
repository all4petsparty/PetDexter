"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAppStore } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";

const MANILA: [number, number] = [120.9842, 14.5995];

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

function mapStyle(): string {
  return MAPTILER_KEY
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
    : "https://demotiles.maplibre.org/style.json"; // free keyless fallback
}

type DiscoveryFeature = GeoJSON.Feature<GeoJSON.Point, { id: string; species: string }>;

/**
 * Discoveries Map — MapLibre GL + MapTiler tiles with clustered pins of
 * community catches. Pins are playful DOM markers (species emoji / cluster
 * counts) synced to the clustered GeoJSON source on every map render.
 */
export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  const collection = useAppStore((s) => s.collection);
  const { position, setPosition, checkedInVenue, setCheckedInVenue } = useAppStore();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Mount the map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: MANILA,
      // demo style only has country-level detail — zoom out so it's visible
      zoom: MAPTILER_KEY ? 11 : 3.5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__petcatchMap = map;
    }

    map.on("load", () => {
      map.addSource("discoveries", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 55,
      });
      // Invisible-but-queryable layer: queryRenderedFeatures on it reports
      // only the current zoom's tiles (querySourceFeatures leaks stale
      // parent-tile clusters after zooming)
      map.addLayer({
        id: "discoveries-anchor",
        type: "circle",
        source: "discoveries",
        // opacity 0 would exclude features from queryRenderedFeatures
        paint: { "circle-radius": 20, "circle-opacity": 0.01 },
      });

      const sync = () => syncMarkers(map, markersRef.current);
      map.on("move", sync);
      map.on("moveend", sync);
      // idle = tiles fully settled; clears stale parent-tile cluster markers
      map.on("idle", sync);
      map.on("sourcedata", (e) => {
        if (e.sourceId === "discoveries") sync();
      });
      setMapReady(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Feed the source: local PetDex catches + community discoveries (if connected)
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource<maplibregl.GeoJSONSource>("discoveries");
    if (!source) return;

    (async () => {
      const features: DiscoveryFeature[] = collection
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [c.lng!, c.lat!] },
          properties: { id: c.id, species: c.species },
        }));

      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        try {
          const { getSupabase } = await import("@/lib/supabase");
          const { data } = await getSupabase()
            .from("map_discoveries")
            .select("id, species, lat, lng")
            .limit(2000);
          const localIds = new Set(collection.map((c) => c.id));
          for (const row of data ?? []) {
            if (localIds.has(row.id)) continue;
            features.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [row.lng, row.lat] },
              properties: { id: row.id, species: row.species },
            });
          }
        } catch {
          // community feed is progressive enhancement
        }
      }

      source.setData({ type: "FeatureCollection", features });
    })();
  }, [collection, mapReady]);

  async function handleCheckIn() {
    setChecking(true);
    setMessage(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
        })
      );
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPosition(coords);
      mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 15 });

      const { getSupabase } = await import("@/lib/supabase");
      const { data, error } = await getSupabase().rpc("check_in", {
        p_lat: coords.lat,
        p_lng: coords.lng,
      });
      if (error) throw error;

      const venue = Array.isArray(data) ? data[0] : data;
      if (venue) {
        setCheckedInVenue({
          id: venue.venue_id,
          name: venue.venue_name,
          distanceM: venue.distance_m,
        });
        setMessage(`Checked in at ${venue.venue_name}! 🎉 New catches get its stamp.`);
      } else {
        setCheckedInVenue(null);
        setMessage("No partner venue within 50 m — keep exploring! 🗺️");
      }
    } catch (err) {
      setMessage(
        err instanceof Error && err.message.includes("env vars")
          ? "Location found! 📍 Connect Supabase to enable venue check-ins."
          : "Couldn't get your location — check permissions and try again."
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-3xl font-extrabold text-ink">Discovery Map 🗺️</h1>
        <p className="text-ink/60">Every pet caught by the community, pinned live.</p>
      </header>

      <div className="relative h-96 overflow-hidden rounded-card shadow-lg">
        <div ref={containerRef} className="h-full w-full" />
        {position && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow">
            📍 {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleCheckIn}
        disabled={checking}
        className="tappable rounded-full bg-grass px-6 py-4 text-lg font-extrabold text-white shadow-md disabled:opacity-60"
      >
        {checking
          ? "Sniffing around… 👃"
          : checkedInVenue
            ? `📍 Checked in: ${checkedInVenue.name}`
            : "Check In Here 📍"}
      </button>

      {message && (
        <p className="animate-pop-in rounded-2xl bg-sunny/40 px-4 py-3 text-center font-semibold">
          {message}
        </p>
      )}
    </div>
  );
}

/** Keep playful DOM markers in sync with the clustered source. */
function syncMarkers(map: maplibregl.Map, markers: Map<string, maplibregl.Marker>) {
  if (!map.getSource("discoveries") || !map.getLayer("discoveries-anchor")) return;
  const features = map.queryRenderedFeatures({ layers: ["discoveries-anchor"] });
  const seen = new Set<string>();

  for (const feature of features) {
    const props = feature.properties as Record<string, unknown>;
    const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
    const key = props.cluster ? `cluster-${props.cluster_id}` : `pet-${props.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let marker = markers.get(key);
    if (!marker) {
      const el = document.createElement("div");
      el.className =
        "flex items-center justify-center rounded-full bg-white shadow-lg border-4 cursor-pointer " +
        "transition-transform hover:scale-110";
      if (props.cluster) {
        el.style.cssText = "width:44px;height:44px;border-color:#ff8a3d;font-weight:800;color:#2d2a32;";
        el.textContent = String(props.point_count);
        el.addEventListener("click", async () => {
          const source = map.getSource<maplibregl.GeoJSONSource>("discoveries");
          const zoom = await source!.getClusterExpansionZoom(props.cluster_id as number);
          map.easeTo({ center: coords, zoom });
        });
      } else {
        el.style.cssText = "width:40px;height:40px;border-color:#4fc3f7;font-size:20px;";
        el.textContent = SPECIES_EMOJI[props.species as string] ?? "🐾";
      }
      marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
      markers.set(key, marker);
    } else {
      marker.setLngLat(coords);
    }
  }

  for (const [key, marker] of markers) {
    if (!seen.has(key)) {
      marker.remove();
      markers.delete(key);
    }
  }
}
