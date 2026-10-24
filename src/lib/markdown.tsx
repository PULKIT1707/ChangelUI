"use client";
// Light markdown shared by ChatMessage and MarkdownEditor: a block parser plus inline tokens,
// rendered as React nodes (no HTML injection). Internal: the public parser is re-exported by ChatMessage.
import * as React from "react";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import { cn } from "./cn";
import { CheckIcon, CopyIcon } from "./icons";
import { blockReset, controlReset, focusRing, listReset } from "./styles";

export type ChatMarkdownBlock =
  | { type: "p"; lines: string[] }
  | { type: "h"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[]; start: number }
  | { type: "quote"; lines: string[] }
  | { type: "code"; lang: string; code: string; open: boolean };

const FENCE = /^\s*```\s*([\w+#.-]*)\s*$/;
const HEADING = /^(#{1,4})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+/;
const ORDERED = /^\s*(\d+)[.)]\s+/;
const QUOTE = /^\s*>\s?/;

function startsBlock(line: string): boolean {
  return FENCE.test(line) || HEADING.test(line) || BULLET.test(line) || ORDERED.test(line) || QUOTE.test(line);
}

/** Splits light markdown into blocks; an unclosed fence (mid-stream) stays an open code block. */
export function parseChatMarkdown(source: string): ChatMarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ChatMarkdownBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      let open = true;
      i++;
      while (i < lines.length) {
        const l = lines[i] ?? "";
        i++;
        if (/^\s*```\s*$/.test(l)) {
          open = false;
          break;
        }
        body.push(l);
      }
      blocks.push({ type: "code", lang: fence[1] ?? "", code: body.join("\n"), open });
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: "h", level: heading[1]?.length ?? 1, text: heading[2] ?? "" });
      i++;
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = !BULLET.test(line);
      const pattern = ordered ? ORDERED : BULLET;
      const start = ordered ? Number(ORDERED.exec(line)?.[1] ?? 1) : 1;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(pattern, ""));
        i++;
      }
      blocks.push(ordered ? { type: "ol", items, start } : { type: "ul", items });
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        quoted.push((lines[i] ?? "").replace(QUOTE, ""));
        i++;
      }
      blocks.push({ type: "quote", lines: quoted });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() && !startsBlock(lines[i] ?? "")) {
      para.push(lines[i] ?? "");
      i++;
    }
    blocks.push({ type: "p", lines: para });
  }
  return blocks;
}

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\s][^*\n]*\*|(?<!\w)_[^_\s][^_\n]*_(?!\w))|(\[[^\]\n]+\]\([^)\s]+\))/g;
const SAFE_HREF = /^(https?:|mailto:|\/|#)/i;

export function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const token = match[0];
    const key = `${keyBase}-${n++}`;
    if (match[1]) {
      out.push(
        <code key={key} className={cn(blockReset, "rounded-pui-sm bg-pui-muted px-1 py-0.5 font-mono text-[0.85em] text-pui-foreground")}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      out.push(
        <strong key={key} className={cn(blockReset, "font-semibold text-pui-foreground")}>
          {renderInline(token.slice(2, -2), key)}
        </strong>,
      );
    } else if (match[3]) {
      out.push(
        <em key={key} className={cn(blockReset, "italic")}>
          {renderInline(token.slice(1, -1), key)}
        </em>,
      );
    } else if (match[4]) {
      const close = token.indexOf("](");
      const label = token.slice(1, close);
      const href = token.slice(close + 2, -1);
      out.push(
        SAFE_HREF.test(href) ? (
          <a
            key={key}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={cn(blockReset, focusRing, "rounded-pui-sm font-medium text-pui-primary-text underline decoration-pui-primary-text/40 underline-offset-2 hover:decoration-pui-primary-text")}
          >
            {renderInline(label, key)}
          </a>
        ) : (
          label
        ),
      );
    }
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CodeBlock({ lang, code, caret }: { lang: string; code: string; caret: React.ReactNode }) {
  const { copy, copied } = useCopyToClipboard({ timeoutMs: 1600 });
  return (
    <div className={cn(blockReset, "overflow-hidden rounded-pui-lg border border-pui-border bg-pui-muted/45")}>
      <div className={cn(blockReset, "flex h-8 items-center justify-between border-b border-pui-border ps-3 pe-1")}>
        <span className={cn(blockReset, "font-mono text-[0.6875rem] text-pui-muted-foreground")}>{lang || "code"}</span>
        <button
          type="button"
          onClick={() => void copy(code)}
          className={cn(
            controlReset,
            focusRing,
            "inline-flex h-6 cursor-pointer items-center gap-1 rounded-pui-sm px-1.5 text-[0.6875rem] text-pui-muted-foreground hover:bg-pui-muted hover:text-pui-foreground",
          )}
        >
          {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={cn(blockReset, "overflow-x-auto p-3 font-mono text-xs leading-relaxed text-pui-foreground")}>
        <code className={cn(blockReset, "font-mono")}>
          {code}
          {caret}
        </code>
      </pre>
    </div>
  );
}

export function Markdown({ source, caret }: { source: string; caret: React.ReactNode }) {
  const blocks = React.useMemo(() => parseChatMarkdown(source), [source]);
  if (blocks.length === 0) return caret ? <p className={cn(blockReset)}>{caret}</p> : null;
  return (
    <>
      {blocks.map((block, b) => {
        const tail = b === blocks.length - 1 ? caret : null;
        const key = `b${b}`;
        switch (block.type) {
          case "code":
            return <CodeBlock key={key} lang={block.lang} code={block.code} caret={tail} />;
          case "h": {
            const Tag = (`h${Math.min(6, block.level + 2)}` as "h3" | "h4" | "h5" | "h6");
            return (
              <Tag key={key} className={cn(blockReset, "font-semibold text-pui-foreground", block.level <= 2 ? "text-base" : "text-sm")}>
                {renderInline(block.text, key)}
                {tail}
              </Tag>
            );
          }
          case "ul":
          case "ol": {
            const List = block.type;
            return (
              <List
                key={key}
                start={block.type === "ol" && block.start !== 1 ? block.start : undefined}
                className={cn(listReset, "flex flex-col gap-1 ps-5", block.type === "ul" ? "list-disc" : "list-decimal", "marker:text-pui-muted-foreground")}
              >
                {block.items.map((item, k) => (
                  <li key={k} className={cn(blockReset, "ps-0.5")}>
                    {renderInline(item, `${key}-${k}`)}
                    {k === block.items.length - 1 ? tail : null}
                  </li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <blockquote key={key} className={cn(blockReset, "border-s-2 border-pui-border ps-3 text-pui-muted-foreground")}>
                {block.lines.map((l, k) => (
                  <React.Fragment key={k}>
                    {k > 0 ? <br /> : null}
                    {renderInline(l, `${key}-${k}`)}
                  </React.Fragment>
                ))}
                {tail}
              </blockquote>
            );
          default:
            return (
              <p key={key} className={cn(blockReset)}>
                {block.lines.map((l, k) => (
                  <React.Fragment key={k}>
                    {k > 0 ? <br /> : null}
                    {renderInline(l, `${key}-${k}`)}
                  </React.Fragment>
                ))}
                {tail}
              </p>
            );
        }
      })}
    </>
  );
}
