// Makes the dist/*.cjs.map files package-relative (design 5.1).
// tsup's CJS splitting pass runs sucrase over each esbuild chunk with the absolute output path as
// its file name, then merges the two maps. "file" ends up absolute, and the segments esbuild never
// mapped (the CJS interop glue) keep pointing at that absolute, never-written intermediate file, so
// the published maps would carry the build machine's home directory.
// This rewrite sets "file" to the .cjs basename, turns those self-references into generated-only
// segments and drops that source; any other absolute source becomes relative to the map.
// Idempotent; prints the number of rewritten maps.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SourceMapConsumer, SourceMapGenerator, type RawSourceMap } from "source-map-js";

/** Pure: a package-relative copy of one CJS map. `outputPath` is the absolute path of its .cjs file. */
export function relativeCjsMap(map: RawSourceMap, outputPath: string): RawSourceMap {
  const isSelf = (source: string): boolean => isAbsolute(source) && resolve(source) === resolve(outputPath);
  const toRelative = (source: string): string =>
    isAbsolute(source) ? relative(dirname(outputPath), source).split("\\").join("/") : source;
  const consumer = new SourceMapConsumer(map);
  const generator = new SourceMapGenerator({ file: basename(outputPath) });
  consumer.eachMapping((m) => {
    const generated = { line: m.generatedLine, column: m.generatedColumn };
    if (m.source === null || m.originalLine === null || m.originalColumn === null || isSelf(m.source)) {
      // Keep the segment boundary so the previous mapping does not swallow the glue code.
      generator.addMapping({ generated });
      return;
    }
    const original = { line: m.originalLine, column: m.originalColumn };
    generator.addMapping({ generated, original, source: toRelative(m.source), name: m.name });
  });
  for (const source of consumer.sources) {
    if (isSelf(source)) continue;
    const content = consumer.sourceContentFor(source, true);
    if (content !== null) generator.setSourceContent(toRelative(source), content);
  }
  return generator.toJSON();
}

function main(): void {
  const dist = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "dist");
  let rewritten = 0;
  for (const file of readdirSync(dist)) {
    if (!file.endsWith(".cjs.map")) continue;
    const path = join(dist, file);
    const before = readFileSync(path, "utf8");
    const map = JSON.parse(before) as RawSourceMap;
    const after = JSON.stringify(relativeCjsMap(map, join(dist, file.slice(0, -".map".length))));
    if (after !== before) {
      writeFileSync(path, after);
      rewritten++;
    }
  }
  console.log(`fix-cjs-sourcemaps: ${rewritten} map(s) rewritten`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
