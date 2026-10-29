import { useSyncExternalStore } from "react";

let installPrompt = null;
let installed = false;
let revision = 0;
const listeners = new Set();

function notify() {
  revision += 1;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    installPrompt = null;
    notify();
  });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => revision;

export function usePwaInstall() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    canInstall: Boolean(installPrompt) && !installed,
    install: async () => {
      if (!installPrompt) return false;
      const prompt = installPrompt;
      installPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      notify();
      return choice.outcome === "accepted";
    }
  };
}
