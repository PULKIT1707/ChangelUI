import { CommentsThread, type CommentAuthor, type CommentsThreadProps, type ThreadComment } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  resolved: boolean;
  anchor: boolean;
  slowNetwork: boolean;
};
const defaults: DemoProps = { resolved: false, anchor: true, slowNetwork: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "resolved", label: "Resolved" },
  { type: "boolean", prop: "anchor", label: "Quoted anchor" },
  { type: "boolean", prop: "slowNetwork", label: "Slow network" },
];
const ME: CommentAuthor = { id: "me", name: "Sam Rivera", handle: "sam" };
const PRIYA: CommentAuthor = { id: "priya", name: "Priya Nair", handle: "priya" };
const LEO: CommentAuthor = { id: "leo", name: "Leo Park", handle: "leo" };
const MAYA: CommentAuthor = { id: "maya", name: "Maya Chen", handle: "maya" };
const NOW = Date.UTC(2026, 9, 23, 15, 0);
const SEED: ThreadComment[] = [
  {
    id: "c1",
    author: PRIYA,
    body: "This empty state says “No data” even when filters hide everything. Can it echo the active filters? @sam",
    createdAt: NOW - 3 * 3_600_000,
    reactions: [{ emoji: "👍", count: 2 }],
  },
  {
    id: "c2",
    author: LEO,
    body: "+1. We could reuse the no-results variant and add a Clear filters action.",
    createdAt: NOW - 2 * 3_600_000,
    reactions: [{ emoji: "🎉", count: 1, reacted: true }],
  },
  { id: "c3", author: ME, body: "On it. @leo can you check the copy once it lands?", createdAt: NOW - 25 * 60_000, edited: true },
];
function Preview({ props }: { props: DemoProps }) {
  const [comments, setComments] = useState(SEED);
  const [resolved, setResolved] = useState(props.resolved);
  const [shown, setShown] = useState(props.resolved);
  if (shown !== props.resolved) {
    setShown(props.resolved);
    setResolved(props.resolved);
  }
  return (
    <div className="w-full max-w-md">
      <CommentsThread
        comments={comments}
        currentUser={ME}
        mentionable={[PRIYA, LEO, MAYA]}
        resolved={resolved}
        onResolvedChange={setResolved}
        resolvedBy={ME}
        now={NOW}
        anchor={
          props.anchor ? (
            <span className="font-mono">
              <span className="text-pui-muted-foreground">orders-table.tsx · L88 </span>
              {"<EmptyState title=\"No data\" />"}
            </span>
          ) : undefined
        }
        onReply={(body) =>
          new Promise<void>((done) =>
            setTimeout(
              () => {
                setComments((list) => [...list, { id: `r${list.length}`, author: ME, body, createdAt: NOW }]);
                done();
              },
              props.slowNetwork ? 900 : 0,
            ),
          )
        }
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-72">
      <CommentsThread comments={SEED.slice(0, 2)} currentUser={ME} now={NOW} />
    </div>
  );
}
/** Resolved threads stay out of the way as one line until someone peeks or reopens. */
function ResolvedDemo() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <CommentsThread
        defaultResolved
        resolvedBy={PRIYA}
        currentUser={ME}
        now={NOW}
        comments={[
          { id: "a", author: MAYA, body: "Button label should be “Save changes”, not “Submit”.", createdAt: NOW - 86_400_000 },
          { id: "b", author: ME, body: "Updated in the latest build.", createdAt: NOW - 80_000_000 },
        ]}
      />
      <CommentsThread
        defaultResolved
        resolvedBy={LEO}
        currentUser={ME}
        now={NOW}
        comments={[{ id: "c", author: LEO, body: "Spacing between the cards is 20px here and 24px on mobile.", createdAt: NOW - 2 * 86_400_000 }]}
      />
    </div>
  );
}
/** A failed post keeps the draft and says why. */
function ErrorDemo() {
  return (
    <div className="mx-auto w-full max-w-md">
      <CommentsThread
        currentUser={ME}
        now={NOW}
        placeholder="Try replying: this one fails"
        comments={[{ id: "a", author: MAYA, body: "Do we need a confirm step before deleting a workspace?", createdAt: NOW - 40 * 60_000 }]}
        onReply={() => new Promise<void>((_, fail) => setTimeout(() => fail(new Error("You’re offline. Your reply is saved here; send it when you reconnect.")), 600))}
      />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<CommentsThread\n  comments={comments}\n  currentUser={me}\n  mentionable={teammates}${props.anchor ? "\n  anchor={<code>orders-table.tsx · L88</code>}" : ""}${props.resolved ? "\n  defaultResolved" : ""}\n  onReply={(body) => api.reply(threadId, body)}\n  onReact={(id, emoji) => api.react(id, emoji)}\n/>`,
  propsTable: propDocs<CommentsThreadProps>()([
    { name: "comments", type: "ThreadComment[]", required: true, description: "{ id, author, body, createdAt, reactions?, edited? }, oldest first." },
    { name: "currentUser", type: "CommentAuthor", required: true, description: "{ id, name, handle?, avatarUrl? } of the person replying." },
    { name: "mentionable", type: "CommentAuthor[]", default: "thread authors", description: "People suggested after @." },
    { name: "onReply", type: "(body) => void | Promise<void>", description: "A promise shows Posting; a rejection keeps the draft and shows its message." },
    { name: "onReact", type: "(commentId, emoji) => void", description: "Reactions update at once and report here." },
    { name: "resolved", type: "boolean", description: "Controlled resolved state." },
    { name: "defaultResolved", type: "boolean", default: "false", description: "Start folded." },
    { name: "onResolvedChange", type: "(resolved) => void", description: "Resolve or Reopen pressed." },
    { name: "resolvedBy", type: "CommentAuthor", description: "Shown in the folded summary." },
    { name: "anchor", type: "ReactNode", description: "What the thread is about, quoted at the top." },
    { name: "reactionChoices", type: "string[]", default: '["👍", "🎉", "👀", "❤️"]', description: "Quick reactions on hover or focus." },
    { name: "now", type: "number", default: "client clock", description: "Reference time for relative labels." },
    { name: "placeholder", type: "string", default: '"Reply…"', description: "Composer placeholder." },
  ]),
  keyboard: [
    { keys: "⌘/Ctrl + Enter", action: "Send the reply" },
    { keys: "@ then ↑ / ↓", action: "Choose someone to mention" },
    { keys: "Enter / Tab", action: "Insert the highlighted mention" },
    { keys: "Esc", action: "Close the mention list" },
  ],
  a11y: [
    "The composer is a combobox while @mention suggestions show, with aria-activedescendant on the listbox options.",
    "Reactions are toggle buttons with their count and state in the name; quick reactions appear on hover and on keyboard focus.",
    "Folded threads keep a summary button with aria-expanded, and a failed reply is announced as an alert.",
  ],
  reducedMotion: "The thread folds and new replies appear without height or slide animation.",
  examples: [
    { title: "Resolved threads", description: "Each folds into who resolved it, the count and the last word.", Demo: ResolvedDemo },
    { title: "Reply fails", description: "The draft stays and the reason is shown.", Demo: ErrorDemo },
  ],
};
export default item;
