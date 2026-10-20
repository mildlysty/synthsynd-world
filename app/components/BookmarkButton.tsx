"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "synthsynd-world:bookmarks";
const CHANGE_EVENT = "synthsynd-world:bookmarks-changed";

export function getBookmarkedIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export default function BookmarkButton({ itemId }: { itemId: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const refresh = () => setSaved(getBookmarkedIds().includes(itemId));
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [itemId]);

  function toggle() {
    const ids = getBookmarkedIds();
    const next = saved ? ids.filter((id) => id !== itemId) : [...new Set([...ids, itemId])];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(!saved);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? "Remove bookmark" : "Save bookmark"} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-purple-500 hover:text-white">{saved ? "★ Saved" : "☆ Save"}</button>;
}
