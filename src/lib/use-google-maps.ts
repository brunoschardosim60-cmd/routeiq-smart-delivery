import { useEffect, useState } from "react";

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    __routeiqMapsCb?: () => void;
    google?: any;
  }
}

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;
  if (!KEY) return Promise.reject(new Error("Chave do Google Maps ausente"));

  loadPromise = new Promise<void>((resolve, reject) => {
    window.__routeiqMapsCb = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places,geometry&loading=async&callback=__routeiqMapsCb&language=pt-BR&region=BR`;
    s.async = true;
    s.onerror = () => reject(new Error("Falha ao carregar o Google Maps"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(!!(typeof window !== "undefined" && window.google?.maps));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => mounted && setReady(true))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "Erro no mapa"));
    return () => {
      mounted = false;
    };
  }, []);

  return { ready, error };
}
