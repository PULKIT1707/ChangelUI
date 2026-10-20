import type { PropDoc } from "./types";

/**
 * Typed props-table helper: `propDocs<ButtonProps>()([...])` rejects any `name` that is not a key of
 * the component's props, so the table cannot drift from the API.
 */
export function propDocs<P>() {
  return (docs: ReadonlyArray<PropDoc & { name: keyof P & string }>): PropDoc[] => [...docs];
}
