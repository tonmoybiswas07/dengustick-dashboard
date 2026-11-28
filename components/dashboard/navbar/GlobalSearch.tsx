"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Group = { label: string; items: { id: string; title: string; href: string }[] };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [result, setResult] = useState<{ query: string; groups: Group[]; error?: string }>();
  const query = term.trim();
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!open || query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        setResult({ query, groups: (await response.json()).groups });
      } catch {
        if (!controller.signal.aborted) setResult({ query, groups: [], error: "Search is temporarily unavailable." });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon" variant="ghost" aria-label="Search (Ctrl or Command K)" />}><Search className="size-5" /></DialogTrigger>
      <DialogContent initialFocus={searchInput} className="max-h-[80dvh] overflow-y-auto">
        <DialogTitle>Search dashboard</DialogTitle>
        <DialogDescription>Search records you can access. Use Tab to move through results.</DialogDescription>
        <Input ref={searchInput} aria-label="Search records" value={term} maxLength={80} onChange={(event) => setTerm(event.target.value)} />
        {query.length >= 2 && (result?.query !== query
          ? <p role="status">Searching…</p>
          : result.error ? <p role="alert">{result.error}</p>
          : result.groups.length === 0 ? <p role="status">No matching records.</p>
          : result.groups.map((group) => (
            <section key={group.label}>
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <ul>{group.items.map((item) => <li key={item.id}>
                <Link onClick={() => setOpen(false)} className="block break-words rounded p-2 hover:bg-accent focus-visible:outline-2" href={item.href}>{item.title}</Link>
              </li>)}</ul>
            </section>
          )))}
      </DialogContent>
    </Dialog>
  );
}
