import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, it } from "vitest";

it("preserves nested junction inference in emitted lookup declarations", () => {
  const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));
  const configPath = resolve("../.nuxt/tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve("../.nuxt"));
  const sources = {
    "#item-app": resolve("../src/runtime/items/app/use-directus-item-by-path.ts"),
    "#item-server": resolve("../src/runtime/items/server/use-directus-item-by-path.ts"),
    "#item-fetch": resolve("../src/runtime/items/fetch-by-path.ts")
  };
  // Emit against the module builder's schema, then consume with a concrete application schema.
  const declarations = new Map<string, string>();
  const emitOptions: ts.CompilerOptions = {
    ...parsed.options,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    noCheck: true
  };
  const emitter = ts.createProgram(Object.values(sources), emitOptions);
  const paths: Record<string, string[]> = {
    "#directus": [resolve("./fixtures/item-inference.ts")]
  };
  for (const [alias, path] of Object.entries(sources)) {
    const source = emitter.getSourceFile(path);
    expect(source).toBeDefined();
    if (!source) throw new Error(`Missing lookup source: ${path}`);
    const declarationPath = path.replace(/\.ts$/, ".d.ts");
    emitter.emit(source, (_name, text) => declarations.set(declarationPath, text));
    paths[alias] = [declarationPath];
  }
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
    paths
  };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile;
  const fileExists = host.fileExists;
  host.readFile = (path) => declarations.get(path) ?? readFile(path);
  host.fileExists = (path) => declarations.has(path) || fileExists(path);
  host.getSourceFile = (path, languageVersion) => {
    const text = host.readFile(path);
    return text === undefined ? undefined : ts.createSourceFile(path, text, languageVersion);
  };
  const consumer = ts.createProgram([resolve("./fixtures/item-inference.ts")], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(consumer);
  expect(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: (path) => path,
      getNewLine: () => "\n"
    })
  ).toBe("");
});
