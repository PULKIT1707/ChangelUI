import type { Route } from "../router";
import { NavContent } from "./nav-content";

/** lg and up: a fixed 260px column under the top bar that scrolls independently (design 10.3). */
export function Sidebar({ route }: { route: Route }) {
  return (
    <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-[260px] overflow-y-auto overscroll-contain border-r border-pui-border bg-pui-background px-3 pb-6 lg:block">
      <nav aria-label="Main">
        <NavContent route={route} layoutGroup="sidebar" filterShortcut filterClassName="bg-pui-background pt-5" />
      </nav>
    </aside>
  );
}
