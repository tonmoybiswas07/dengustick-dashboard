import { PageHeader } from "@/components/dashboard/PageHeader";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { queryAudit } from "@/lib/audit-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requirePermission("users:manage");
  const params = await searchParams;
  const result = await queryAudit(params);
  const action = typeof params.action === "string" ? params.action : "";
  const actor = typeof params.actor === "string" ? params.actor : "";
  const href = (page: number) => {
    const query = new URLSearchParams({ page: String(page) });
    if (action) query.set("action", action);
    if (actor) query.set("actor", actor);
    return `/audit?${query}`;
  };

  return (
    <section className="space-y-4">
      <PageHeader title="Audit log" description="Review recorded account and surveillance activity." />
      <form action="/audit" className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Action<Input name="action" defaultValue={action} maxLength={64} /></label>
        <label className="text-sm">Actor ID<Input name="actor" defaultValue={actor} maxLength={24} /></label>
        <Button type="submit">Filter</Button>
      </form>
      {!result && <p role="alert">Enter a valid action, actor ID, or page.</p>}
      {result?.rows.length === 0 && <p>No matching audit records.</p>}
      {!!result?.rows.length && (
        <div role="region" aria-label="Audit records" tabIndex={0} className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50"><tr>{["Time (Dhaka)", "Action", "Actor ID", "Resource ID", "Region ID", "Outcome"].map(
              (heading) => <th scope="col" key={heading} className="p-3">{heading}</th>,
            )}</tr></thead>
            <tbody>{result.rows.map((row) => (
              <tr key={row._id.toHexString()} className="border-t">
                <td className="p-3"><time dateTime={row.timestamp.toISOString()} className="whitespace-nowrap tabular-nums">{row.timestamp.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</time></td>
                <td className="p-3"><Badge variant="outline">{row.action}</Badge></td><td className="p-3">{row.actorId}</td>
                <td className="p-3">{row.resource} / {row.resourceId}</td>
                <td className="p-3">{row.regionId ?? "—"}</td><td className="p-3">{row.outcome}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {result && (
        <nav aria-label="Audit pages" className="flex flex-wrap items-center gap-4 text-sm">
          {result.page > 1 && <Link className="text-primary underline" href={href(result.page - 1)}>Previous</Link>}
          <span>Page {result.page}</span>
          {result.hasNext && <Link className="text-primary underline" href={href(result.page + 1)}>Next</Link>}
        </nav>
      )}
    </section>
  );
}
