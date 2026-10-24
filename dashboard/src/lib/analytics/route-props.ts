// `$pageview` properties for a validated Route (analytics plan, Event catalog). Only product facts:
// the route kind, its stable key, the category and the item or template slug.
import { routeKey, type Route } from "../../router";
import type { PageviewProps } from "./events";

export function pageviewProps(route: Route): PageviewProps {
  const base = { route_kind: route.kind, route_key: routeKey(route) };
  switch (route.kind) {
    case "home":
    case "notFound":
      return { ...base, category: null, component: null };
    case "docs":
      return { ...base, category: "docs", component: null };
    case "category":
      return { ...base, category: route.category, component: null };
    case "item":
      return { ...base, category: route.category, component: route.slug };
    case "templates":
      return { ...base, category: "templates", component: null };
    case "template":
      return { ...base, category: "templates", component: route.slug };
    case "picks":
      return { ...base, category: "picks", component: null };
  }
}
