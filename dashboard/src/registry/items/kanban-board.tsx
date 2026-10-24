import { Avatar, KanbanBoard, toast, type KanbanBoardProps, type KanbanCard } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  limit: number;
  enforceLimits: boolean;
  addCard: boolean;
};
const defaults: DemoProps = { limit: 3, enforceLimits: false, addCard: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "limit", label: "In progress WIP limit", min: 1, max: 6, step: 1 },
  { type: "boolean", prop: "enforceLimits", label: "Enforce limits" },
  { type: "boolean", prop: "addCard", label: "Add card button" },
];
const person = (name: string) => <Avatar size="xs" name={name} />;
const seed: KanbanCard[] = [
  { id: "1", columnId: "backlog", title: "Audit onboarding emails", labels: [{ label: "Growth", tone: "success" }], meta: "PUI-118", assignee: person("Mia Chen") },
  { id: "2", columnId: "backlog", title: "Dark mode for invoices", description: "Invoices print with a white background regardless of theme.", labels: [{ label: "Bug", tone: "danger" }], meta: "PUI-131" },
  { id: "3", columnId: "backlog", title: "CSV export for reports", labels: [{ label: "Feature", tone: "info" }], meta: "PUI-140", assignee: person("Leo Park") },
  { id: "4", columnId: "progress", title: "Usage-based billing", description: "Meter API calls and show projected spend.", labels: [{ label: "Billing", tone: "warning" }], meta: "Due Fri", assignee: person("Ana Ruiz") },
  { id: "5", columnId: "progress", title: "Search ranking v2", labels: [{ label: "Feature", tone: "info" }], meta: "PUI-122", assignee: person("Sam Lee") },
  { id: "6", columnId: "progress", title: "Fix flaky checkout test", labels: [{ label: "Bug", tone: "danger" }], meta: "PUI-127" },
  { id: "7", columnId: "done", title: "Team invites redesign", labels: [{ label: "Design", tone: "primary" }], meta: "PR #482", assignee: person("Mia Chen") },
  { id: "8", columnId: "done", title: "SSO with SAML", labels: [{ label: "Security", tone: "neutral" }], meta: "Shipped", assignee: person("Leo Park") },
];
function Preview({ props }: { props: DemoProps }) {
  const [cards, setCards] = useState<KanbanCard[]>(seed);
  const columns = [
    { id: "backlog", title: "Backlog" },
    { id: "progress", title: "In progress", limit: props.limit, tone: "primary" as const },
    { id: "done", title: "Done", tone: "success" as const },
  ];
  return (
    <div className="w-full max-w-[76rem]">
      <KanbanBoard
        columns={columns}
        cards={cards}
        onCardsChange={setCards}
        enforceLimits={props.enforceLimits}
        onAddCard={
          props.addCard
            ? (columnId) => setCards((c) => [...c, { id: String(Date.now()), columnId, title: "New task", meta: "Draft" }])
            : undefined
        }
        onCardClick={(card) => toast(`Open “${card.title}”`)}
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-[34rem] origin-top-left scale-[0.6]">
      <KanbanBoard
        columns={[
          { id: "backlog", title: "Backlog" },
          { id: "progress", title: "In progress", limit: 2, tone: "primary" },
        ]}
        defaultCards={seed.slice(0, 5)}
      />
    </div>
  );
}
/** A hiring pipeline with custom card bodies. */
function HiringDemo() {
  const [cards, setCards] = useState<KanbanCard[]>([
    { id: "a", columnId: "applied", title: "Priya Nair", description: "Senior designer · Remote" },
    { id: "b", columnId: "applied", title: "Tom Becker", description: "Frontend engineer · Berlin" },
    { id: "c", columnId: "screen", title: "Jules Martin", description: "Product manager · Paris" },
    { id: "d", columnId: "offer", title: "Kenji Sato", description: "Data engineer · Tokyo" },
  ]);
  return (
    <KanbanBoard
      label="Hiring pipeline"
      columns={[
        { id: "applied", title: "Applied" },
        { id: "screen", title: "Phone screen", tone: "info" },
        { id: "offer", title: "Offer", limit: 1, tone: "success" },
      ]}
      cards={cards}
      onCardsChange={(next, move) => {
        setCards(next);
        if (move.toColumnId === "offer") toast.success(`Offer stage: ${next.find((c) => c.id === move.cardId)?.title ?? ""}`);
      }}
      enforceLimits
      renderCard={(card) => (
        <span className="flex items-center gap-2.5">
          <Avatar size="sm" name={card.title} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-pui-foreground">{card.title}</span>
            <span className="truncate text-xs text-pui-muted-foreground">{card.description}</span>
          </span>
        </span>
      )}
    />
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const [cards, setCards] = useState(initialCards);\n\n<KanbanBoard\n  columns={[\n    { id: "backlog", title: "Backlog" },\n    { id: "progress", title: "In progress", limit: ${props.limit} },\n    { id: "done", title: "Done" },\n  ]}\n  cards={cards}\n  onCardsChange={setCards}${props.enforceLimits ? "\n  enforceLimits" : ""}${props.addCard ? "\n  onAddCard={(columnId) => createCard(columnId)}" : ""}\n/>`,
  propsTable: propDocs<KanbanBoardProps>()([
    { name: "columns", type: "{ id, title, limit?, tone? }[]", required: true, description: "Columns in order; limit is the WIP limit." },
    { name: "cards", type: "{ id, columnId, title, description?, labels?, meta?, assignee? }[]", description: "Controlled cards (with defaultCards for uncontrolled)." },
    { name: "onCardsChange", type: "(cards, move) => void", description: "New order after a drop, plus { cardId, fromColumnId, toColumnId, index }." },
    { name: "enforceLimits", type: "boolean", default: "false", description: "Refuse moves into a column at its limit (otherwise warn)." },
    { name: "onCardClick", type: "(card) => void", description: "Click (not drag) or Enter on a card." },
    { name: "onAddCard", type: "(columnId) => void", description: "Shows an Add card button per column." },
    { name: "renderCard", type: "(card) => ReactNode", description: "Custom card body." },
    { name: "announcements", type: "Partial<KanbanAnnouncements>", description: "Screen reader messages (lifted, moved, dropped, cancelled, blocked)." },
    { name: "label", type: "string", default: '"Board"', description: "Accessible name of the board." },
  ]),
  keyboard: [
    { keys: "Space", action: "Pick up / drop the focused card" },
    { keys: "↑ ↓", action: "Move within the column" },
    { keys: "← →", action: "Move to the previous / next column" },
    { keys: "Esc", action: "Cancel the move" },
    { keys: "Enter", action: "Open the card (with onCardClick), otherwise pick up / drop" },
  ],
  a11y: [
    'Cards are role="button" with aria-roledescription="draggable card" and instructions via aria-describedby.',
    'Every pick-up, move, drop, cancel and blocked move is announced in an assertive live region with column and position.',
    "Column counts read their limit and over-limit state in text, not only color.",
  ],
  reducedMotion: "Cards jump to their new place without the layout glide, and the dragged card doesn't tilt.",
  examples: [{ title: "Hiring pipeline", description: "renderCard with avatars and an enforced limit of 1 offer.", Demo: HiringDemo, wide: true }],
};
export default item;
