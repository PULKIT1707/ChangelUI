import { Button } from "changelui";
import { useEffect } from "react";
import { analytics } from "../lib/analytics/client";
import { sanitizeNotFoundPath, type ReferrerKind } from "../lib/analytics/events";
import { homeHref } from "../router";

/** Only the kind of referrer is reported, never the referring URL. */
function referrerKind(referrer: string, ownOrigin: string): ReferrerKind {
  if (referrer === "") return "direct";
  try {
    return new URL(referrer).origin === ownOrigin ? "internal" : "external";
  } catch {
    return "external";
  }
}

export function NotFound() {
  useEffect(() => {
    analytics.track("route_not_found", {
      path: sanitizeNotFoundPath(window.location.hash),
      referrer_kind: referrerKind(document.referrer, window.location.origin),
    });
  }, []);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm text-pui-muted-foreground">404</p>
      <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none">
        Page not found
      </h1>
      <p className="text-pui-muted-foreground">That page does not exist. It may have moved, or the link has a typo.</p>
      <Button asChild>
        <a href={homeHref()}>Back to home</a>
      </Button>
    </div>
  );
}
