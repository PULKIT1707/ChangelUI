import type { ControlSpec } from "../registry/types";

function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function formatProp(name: string, value: unknown): string | null {
  if (value === undefined) return null;
  if (value === true) return name;
  if (value === false) return `${name}={false}`;
  if (typeof value === "number") return `${name}={${value}}`;
  if (typeof value === "string") return value.includes('"') ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`;
  return `${name}={${JSON.stringify(value)}}`;
}

/**
 * Generates a JSX snippet that lists only non-default props (design 10.2), in ControlSpec order
 * (remaining props follow in insertion order). Children are indented by 2 spaces.
 */
export function toJsx<P extends Record<string, unknown>>(
  name: string,
  props: P,
  defaults: P,
  children?: string,
  controls: readonly ControlSpec<P>[] = [],
): string {
  const order = controls.map((c) => c.prop as string);
  const keys = Object.keys(props).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
  });
  const attrs = keys
    .filter((key) => !isEqual(props[key], defaults[key]))
    .map((key) => formatProp(key, props[key]))
    .filter((attr): attr is string => attr !== null);
  const open = attrs.length > 0 ? `<${name} ${attrs.join(" ")}` : `<${name}`;
  if (children === undefined || children === "") return `${open} />`;
  const body = children
    .split("\n")
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join("\n");
  return `${open}>\n${body}\n</${name}>`;
}
