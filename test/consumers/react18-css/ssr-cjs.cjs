// Node CJS SSR smoke (design 12.4): require() the root and /cn, render a Button with React 18.
const { Button } = require("changelui");
const { cn } = require("changelui/cn");
const { createElement: h } = require("react");
const { renderToString } = require("react-dom/server");

const merged = cn("p-1", "p-2");
const html = renderToString(h(Button, { className: merged }, "CJS button"));
if (merged !== "p-2" || !html.includes("CJS button") || !html.includes("<button")) {
  throw new Error(`ssr-cjs failed: cn=${merged} html=${html}`);
}
console.log(`ssr-cjs ok (${html.length} chars)`);
