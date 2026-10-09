import { create } from "zustand";

type Theme = "light" | "dark";

const KEY = "asistenkeu_theme";

const apply = (t: Theme) => {
  document.documentElement.classList.toggle("dark", t === "dark");
};

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  init: () => {
    const saved = (localStorage.getItem(KEY) as Theme | null) || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    apply(saved);
    set({ theme: saved });
  },
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(KEY, next);
    set({ theme: next });
  },
}));
