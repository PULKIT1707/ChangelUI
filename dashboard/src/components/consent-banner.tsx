import { Button } from "changelui";
import { useEffect, useRef } from "react";
import { analytics as defaultAnalytics, type Analytics } from "../lib/analytics/client";
import { useConsent } from "../lib/analytics/consent";
import { docHref } from "../router";

/** CSS variable on <html>: the banner's height plus its bottom gap, used as `main` bottom padding. */
export const CONSENT_OFFSET_VAR = "--pui-consent-offset";
/** `bottom-3` in px: the gap below the banner that the offset also covers. */
const BOTTOM_GAP = 12;

export interface ConsentBannerProps {
  /** The analytics client (tests inject a configured one); defaults to the dashboard singleton. */
  client?: Analytics;
}

/**
 * First-visit privacy choice (plan decision 11): a non-modal region fixed to the bottom (full width
 * on mobile, bottom-left on desktop, clear of the bottom-right Toaster). It is never auto-focused,
 * has no heading (the page h1 stays first) and ignores Escape. Accept and Decline share one Button
 * style. After a choice it unmounts and focus moves to #content.
 */
export function ConsentBanner({ client = defaultAnalytics }: ConsentBannerProps) {
  const { showBanner } = useConsent(client.consent);
  return showBanner ? <BannerBody client={client} /> : null;
}

function BannerBody({ client }: { client: Analytics }) {
  const ref = useRef<HTMLElement>(null);

  // Keeps page bottoms reachable above the banner while it is shown.
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) return;
    const update = () => root.style.setProperty(CONSENT_OFFSET_VAR, `${Math.ceil(el.getBoundingClientRect().height) + BOTTOM_GAP}px`);
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty(CONSENT_OFFSET_VAR);
    };
  }, []);

  const choose = (choice: "accept" | "decline") => {
    if (choice === "accept") client.accept("banner");
    else client.decline("banner");
    // The banner unmounts with the focused button; continue from the page content instead.
    document.getElementById("content")?.focus({ preventScroll: true });
  };

  // A labelled <section> is a region landmark; an explicit role="region" fails jsx-a11y/no-redundant-roles.
  return (
    <section
      ref={ref}
      aria-label="Privacy choices"
      className="fixed inset-x-3 bottom-3 z-40 rounded-pui-lg border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-lg backdrop-blur-(--pui-surface-blur) sm:inset-x-auto sm:left-3 sm:max-w-md"
    >
      <p className="text-sm leading-relaxed text-pui-muted-foreground">
        This site counts anonymous, cookieless page and feature statistics unless your browser sends Do Not Track or
        Global Privacy Control. Accept to also allow session replay with masked text, and heatmaps.{" "}
        <a
          href={docHref("privacy")}
          className="rounded-pui-sm font-medium text-pui-surface-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
        >
          Privacy details
        </a>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" tone="neutral" size="md" onClick={() => choose("accept")}>
          Accept
        </Button>
        <Button variant="outline" tone="neutral" size="md" onClick={() => choose("decline")}>
          Decline
        </Button>
      </div>
    </section>
  );
}
