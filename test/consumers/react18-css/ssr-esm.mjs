// Node ESM SSR smoke (design 12.4): import the root and renderToString a few items with React 18.
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DotPattern,
  NumberTicker,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
} from "changelui";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

const errors = [];
const originalError = console.error;
console.error = (...args) => {
  errors.push(args.map(String).join(" "));
  originalError(...args);
};

const html = renderToString(
  h(
    "div",
    null,
    h(Button, null, "Server button"),
    h(Switch, { "aria-label": "Server switch" }),
    h(
      Tabs,
      { defaultValue: "a" },
      h(TabsList, { "aria-label": "Server tabs" }, h(TabsTrigger, { value: "a" }, "A"), h(TabsTrigger, { value: "b" }, "B")),
      h(TabsContent, { value: "a" }, "Panel A"),
    ),
    h(Dialog, null, h(DialogTrigger, null, "Open"), h(DialogContent, null, h(DialogTitle, null, "Title"))),
    h(Toaster, null),
    h(NumberTicker, { value: 42 }),
    h(DotPattern, null),
  ),
);

const expected = ["Server button", 'role="switch"', 'role="tablist"', "Panel A", "Open", "<svg"];
const missing = expected.filter((s) => !html.includes(s));
if (missing.length > 0 || errors.length > 0) {
  console.log(html);
  throw new Error(`ssr-esm failed: missing ${JSON.stringify(missing)}, console.error ${JSON.stringify(errors)}`);
}
console.log(`ssr-esm ok (${html.length} chars)`);
