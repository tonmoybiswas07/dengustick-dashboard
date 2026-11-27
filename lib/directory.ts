export const directoryPageSize = 50;

export async function loadDirectory<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 1000; page++) {
    const response = await fetch(`${path}?page=${page}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load directory");
    const result: { data: T[]; pagination: { hasNext: boolean } } = await response.json();
    rows.push(...result.data);
    if (!result.pagination.hasNext) return rows;
  }
  throw new Error("Directory exceeds the supported page range");
}
