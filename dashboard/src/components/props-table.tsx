import type { PropDoc } from "../registry/types";

// Registry prop docs prefix compound-part rows with "<Part>: " (for example "TabsList: ..."),
// so one table is rendered per part (design 10.3, step 5).
const PART_RE = /^([A-Z][A-Za-z]*): /;

export function groupPropDocs(title: string, docs: readonly PropDoc[]): { part: string; docs: PropDoc[] }[] {
  const groups: { part: string; docs: PropDoc[] }[] = [];
  for (const doc of docs) {
    const match = PART_RE.exec(doc.description);
    const part = match?.[1] ?? title;
    const description = match ? doc.description.slice(match[0].length) : doc.description;
    let group = groups.find((g) => g.part === part);
    if (!group) {
      group = { part, docs: [] };
      groups.push(group);
    }
    group.docs.push({ ...doc, description });
  }
  return groups;
}

function PropsTableView({ part, docs, showHeading }: { part: string; docs: PropDoc[]; showHeading: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {showHeading ? <h3 className="font-mono text-sm font-semibold">{part}</h3> : null}
      {/* Focusable so the table can be scrolled with the keyboard on narrow screens. */}
      <div
        role="region"
        aria-label={`${part} props`}
        tabIndex={0}
        className="overflow-x-auto rounded-pui-lg border border-pui-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
      >
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">{part} props</caption>
          <thead className="bg-pui-muted text-xs uppercase tracking-wide text-pui-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Prop
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Type
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Default
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.name} className="border-t border-pui-border align-top">
                <th scope="row" className="whitespace-nowrap px-3 py-2 font-mono text-[13px] font-medium text-pui-primary-text">
                  {doc.name}
                  {doc.required ? (
                    <>
                      <span aria-hidden="true" className="text-pui-danger-text">
                        {" "}
                        *
                      </span>
                      <span className="sr-only"> (required)</span>
                    </>
                  ) : null}
                </th>
                <td className="px-3 py-2 font-mono text-[13px] text-pui-foreground">{doc.type}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] text-pui-muted-foreground">{doc.default ?? "–"}</td>
                <td className="px-3 py-2 text-pui-muted-foreground">{doc.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PropsTable({ title, docs }: { title: string; docs: readonly PropDoc[] }) {
  const groups = groupPropDocs(title, docs);
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <PropsTableView key={group.part} part={group.part} docs={group.docs} showHeading={groups.length > 1} />
      ))}
    </div>
  );
}
