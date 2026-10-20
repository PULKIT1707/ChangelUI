import { Button } from "changelui";
import { homeHref } from "../router";

export function NotFound() {
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
