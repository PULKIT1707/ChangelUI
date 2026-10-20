import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger, IconButton } from "changelui";
import { useState } from "react";
import type { Route } from "../router";
import { NavContent } from "./nav-content";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/**
 * Below lg the navigation lives in a left Drawer (design 10.3). The hamburger is the Drawer trigger,
 * so it carries aria-expanded and gets focus back when the drawer closes.
 */
export function MobileNav({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <IconButton aria-label="Open navigation" variant="ghost" tone="neutral" size="sm" className="lg:hidden">
          <MenuIcon />
        </IconButton>
      </DrawerTrigger>
      <DrawerContent side="left" size="sm" className="flex flex-col gap-4 overflow-y-auto">
        <DrawerTitle className="px-3 text-base">ChangelUI</DrawerTitle>
        <nav aria-label="Main">
          <NavContent route={route} layoutGroup="drawer" onNavigate={() => setOpen(false)} filterClassName="bg-pui-surface" />
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
