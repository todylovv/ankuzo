import { useEffect, useState } from "react";

export type PageId = "home" | "games" | "stats" | "about";

function readPage(): PageId {
  const hash = window.location.hash.replace(/^#/, "").split("/")[0];
  return hash === "games" || hash === "stats" || hash === "about" ? hash : "home";
}

function readHashParts() {
  return window.location.hash.replace(/^#/, "").split("/").filter(Boolean);
}

export function useHashPage(): PageId {
  const [page, setPage] = useState<PageId>(readPage);

  useEffect(() => {
    const onHash = () => setPage(readPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const [, sectionId] = readHashParts();
    if (page === "games" || page === "stats" || page === "about") {
      if (sectionId) {
        requestAnimationFrame(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: "instant", block: "start" });
        });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      return;
    }

    const id = window.location.hash.replace(/^#/, "");
    if (id && id !== "home") {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
      });
      return;
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  return page;
}

export function useHashId(): string {
  const [id, setId] = useState(() => readHashParts()[0] || "home");

  useEffect(() => {
    const onHash = () => setId(readHashParts()[0] || "home");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return id;
}
