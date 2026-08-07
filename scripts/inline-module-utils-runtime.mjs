import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const MODULE_UTILS_IMPORTS = {
  "module-utils/shared": "shared/index.js",
  "module-utils/server": "server/index.js"
};

/**
 * Copies module-utils into a module's runtime output and rewrites private runtime imports.
 *
 * Nuxt Module Builder emits runtime files with mkdist, which transpiles files but does not bundle
 * their dependencies. Keeping the source imports lets modules share the workspace utilities while
 * ensuring published runtime output contains the required code.
 *
 * @param moduleRoot - Absolute path to the module being built.
 * @param runtimeDirectory - Absolute emitted runtime directory.
 * @returns A promise that settles after runtime imports have been inlined.
 */
export async function inlineModuleUtilsRuntime(
  moduleRoot,
  runtimeDirectory = join(moduleRoot, "dist", "runtime")
) {
  const files = await findJavaScriptFiles(runtimeDirectory);
  const filesWithImports = [];

  for (const file of files) {
    const contents = await readFile(file, "utf8");
    if (Object.keys(MODULE_UTILS_IMPORTS).some((specifier) => contents.includes(specifier))) {
      filesWithImports.push({ contents, file });
    }
  }
  if (filesWithImports.length === 0) return;

  const bundledUtilsDirectory = join(runtimeDirectory, "module-utils");
  await cp(
    join(moduleRoot, "..", "..", "packages", "module-utils", "dist"),
    bundledUtilsDirectory,
    {
      recursive: true
    }
  );

  await Promise.all(
    filesWithImports.map(async ({ contents, file }) => {
      let bundledContents = contents;
      for (const [specifier, bundledFile] of Object.entries(MODULE_UTILS_IMPORTS)) {
        const path = relative(dirname(file), join(bundledUtilsDirectory, bundledFile));
        const replacement = path.startsWith(".") ? path : `./${path}`;
        bundledContents = bundledContents.replaceAll(specifier, replacement);
      }
      await writeFile(file, bundledContents);
    })
  );
}

/**
 * Lists JavaScript files recursively so only emitted runtime code is rewritten.
 * @param directory - Directory to search.
 * @returns Absolute JavaScript output paths.
 */
async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return findJavaScriptFiles(path);
      return entry.isFile() && path.endsWith(".js") ? [path] : [];
    })
  );
  return files.flat();
}
