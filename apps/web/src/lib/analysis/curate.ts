import type { GatherResult, RepoFile, CuratedFile, CurationReason } from "./types"

export interface CurationResult {
  files: CuratedFile[]
  fileTree: string[]
  excludedCount: number
}

const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", "coverage",
  ".turbo", ".vercel", ".cache", "vendor", "target", "__pycache__",
  ".venv", "venv", ".idea", ".vscode", "bin", "obj", ".svelte-kit",
])

const LOCKFILES = new Set([
  "pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb",
  "cargo.lock", "poetry.lock", "gemfile.lock", "composer.lock",
])

const BINARY_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp", "tiff", "avif",
  "woff", "woff2", "ttf", "eot", "otf",
  "mp4", "mp3", "wav", "avi", "mov", "webm", "flac", "ogg", "mkv",
  "zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "exe", "dll", "so", "dylib", "bin", "wasm", "node", "class", "jar",
  "db", "sqlite", "sqlite3", "lock", "lockb",
])

const MANIFESTS = new Set([
  "package.json", "requirements.txt", "pyproject.toml", "go.mod", "cargo.toml",
  "gemfile", "composer.json", "pom.xml", "build.gradle", "setup.py",
  "pubspec.yaml", "package.swift",
])

const CONFIG_NAMES = new Set([
  "tsconfig.json", "jsconfig.json", "next.config.js", "next.config.mjs",
  "next.config.ts", "tailwind.config.js", "tailwind.config.ts",
  "vite.config.js", "vite.config.ts", "webpack.config.js", "rollup.config.js",
  "babel.config.js", ".babelrc", "jest.config.js", "vitest.config.ts",
  "svelte.config.js", "nuxt.config.ts", "astro.config.mjs", "dockerfile",
  "docker-compose.yml", "docker-compose.yaml", "turbo.json", "nx.json",
  "postcss.config.js", "postcss.config.mjs", "drizzle.config.ts",
])

const ENTRY_NAMES = new Set([
  "index.ts", "index.js", "index.tsx", "index.jsx", "main.ts", "main.js",
  "main.tsx", "main.py", "main.go", "app.ts", "app.js", "app.tsx",
  "server.ts", "server.js", "__main__.py", "mod.rs", "lib.rs",
])

const CODE_EXT = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "java", "rb",
  "php", "c", "cpp", "h", "hpp", "cs", "swift", "kt", "scala", "vue", "svelte",
])

const SOURCE_DIRS = [
  "src/", "app/", "lib/", "components/", "server/", "api/", "core/",
  "internal/", "pkg/", "packages/",
]

const LOWVALUE_DIRS = [
  "examples/", "example/", "fixtures/", "__mocks__/", "mocks/", "demo/",
  "samples/", "sample/", "docs/", "doc/",
]

function ext(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1)
  const dot = base.lastIndexOf(".")
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase()
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

function isCodeFile(path: string): boolean {
  return CODE_EXT.has(ext(path))
}

function isHardExcluded(path: string): boolean {
  const segments = path.split("/")
  for (const seg of segments) {
    if (EXCLUDED_DIRS.has(seg)) return true
  }
  const base = basename(path).toLowerCase()
  if (LOCKFILES.has(base)) return true
  if (BINARY_EXT.has(ext(path))) return true
  if (base.endsWith(".min.js") || base.endsWith(".min.css") || base.endsWith(".map")) {
    return true
  }
  if (base === ".env" || base.startsWith(".env.")) return true
  return false
}

function isConfigByPattern(base: string): boolean {
  return (
    base.startsWith(".eslintrc") ||
    base.startsWith("tsconfig.") ||
    base.endsWith(".config.js") ||
    base.endsWith(".config.ts") ||
    base.endsWith(".config.mjs")
  )
}

function isSchemaFile(path: string): boolean {
  return (
    path.endsWith("schema.prisma") ||
    path.endsWith(".graphql") ||
    path.endsWith("openapi.yaml") ||
    path.endsWith("openapi.json")
  )
}

function isEntryPath(path: string): boolean {
  return (
    /^src\/app\/(page|layout)\.tsx?$/.test(path) ||
    /^app\/(page|layout)\.tsx?$/.test(path) ||
    /^pages\/_app\.tsx?$/.test(path) ||
    /^src\/main\.tsx?$/.test(path) ||
    /^cmd\/[^/]+\/main\.go$/.test(path)
  )
}

function isTest(path: string, base: string): boolean {
  return (
    /\.(test|spec)\.[jt]sx?$/.test(base) ||
    path.includes("__tests__/") ||
    path.startsWith("test/") ||
    path.startsWith("tests/") ||
    path.includes("/test/") ||
    path.includes("/tests/") ||
    path.startsWith("e2e/") ||
    /_test\.go$/.test(base) ||
    /^test_.*\.py$/.test(base)
  )
}

function normalizePath(fromDir: string, spec: string): string {
  const parts = (fromDir ? fromDir.split("/") : []).concat(spec.split("/"))
  const stack: string[] = []
  for (const p of parts) {
    if (p === "" || p === ".") continue
    if (p === "..") stack.pop()
    else stack.push(p)
  }
  return stack.join("/")
}

function resolveImport(fromDir: string, spec: string, pathSet: Set<string>): string | null {
  const combined = normalizePath(fromDir, spec)
  const candidates = [
    combined,
    `${combined}.ts`, `${combined}.tsx`, `${combined}.js`, `${combined}.jsx`,
    `${combined}.mjs`, `${combined}.cjs`,
    `${combined}/index.ts`, `${combined}/index.tsx`,
    `${combined}/index.js`, `${combined}/index.jsx`,
  ]
  for (const c of candidates) {
    if (pathSet.has(c)) return c
  }
  return null
}

const IMPORT_RE =
  /import\s+[^'"]*?from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g

function computeImportCounts(files: RepoFile[]): Map<string, number> {
  const pathSet = new Set(files.map((f) => f.path))
  const counts = new Map<string, number>()

  for (const f of files) {
    if (!isCodeFile(f.path)) continue
    const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : ""
    IMPORT_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = IMPORT_RE.exec(f.contents)) !== null) {
      const spec = m[1] ?? m[2] ?? m[3]
      if (!spec || !spec.startsWith(".")) continue
      const resolved = resolveImport(dir, spec, pathSet)
      if (resolved) counts.set(resolved, (counts.get(resolved) ?? 0) + 1)
    }
  }
  return counts
}

function readmeReferencedPaths(readme: string | null, files: RepoFile[]): Set<string> {
  const refs = new Set<string>()
  if (!readme) return refs
  const lower = readme.toLowerCase()
  for (const f of files) {
    if (f.path.length >= 6 && lower.includes(f.path.toLowerCase())) {
      refs.add(f.path)
    }
  }
  return refs
}

function scoreFile(
  file: RepoFile,
  importCounts: Map<string, number>,
): { score: number; reason: CurationReason } {
  const path = file.path
  const base = basename(path).toLowerCase()
  const depth = path.split("/").length - 1
  const imports = importCounts.get(path) ?? 0

  if (/^readme(\.|$)/i.test(basename(path))) return { score: 1000, reason: "readme" }
  if (MANIFESTS.has(base)) return { score: 950, reason: "manifest" }
  if (isSchemaFile(path)) return { score: 900, reason: "config" }
  if (CONFIG_NAMES.has(base) || isConfigByPattern(base)) return { score: 850, reason: "config" }

  if (isTest(path, base)) {
    return { score: 100 + Math.min(imports * 2, 40), reason: "other" }
  }
  if (LOWVALUE_DIRS.some((d) => path.startsWith(d) || path.includes(`/${d}`))) {
    const docish = path.startsWith("docs/") || path.includes("/docs/")
    return { score: docish ? 200 : 90, reason: "other" }
  }

  let isEntry = isEntryPath(path)
  if (!isEntry && ENTRY_NAMES.has(base)) {
    isEntry = depth <= 2 || SOURCE_DIRS.some((d) => path.startsWith(d))
  }

  const inSource = SOURCE_DIRS.some((d) => path.startsWith(d))
  let baseScore: number
  let reason: CurationReason
  if (isEntry) {
    baseScore = 800
    reason = "entry_point"
  } else if (inSource) {
    baseScore = 500
    reason = "source"
  } else if (isCodeFile(path)) {
    baseScore = 400
    reason = "source"
  } else {
    baseScore = 200
    reason = "other"
  }

  const importBoost = Math.min(imports * 15, 300)
  if (importBoost > 0 && importBoost >= baseScore * 0.4) {
    reason = "high_import"
  }
  const depthPenalty = Math.max(0, depth - 2) * 8

  return { score: baseScore + importBoost - depthPenalty, reason }
}

export function curateFiles(gather: GatherResult): CurationResult {
  const included: RepoFile[] = []
  let excludedCount = 0

  for (const f of gather.files) {
    if (isHardExcluded(f.path)) {
      excludedCount++
      continue
    }
    included.push(f)
  }

  const importCounts = computeImportCounts(included)
  const referenced = readmeReferencedPaths(gather.metadata.readme, included)

  const curated: CuratedFile[] = included.map((f) => {
    const scored = scoreFile(f, importCounts)
    let score = scored.score
    let reason = scored.reason
    if (
      referenced.has(f.path) &&
      reason !== "readme" &&
      reason !== "manifest" &&
      reason !== "config"
    ) {
      score += 120
      if (reason === "source" || reason === "other") reason = "referenced"
    }
    return {
      path: f.path,
      contents: f.contents,
      bytes: f.bytes,
      estimatedTokens: Math.ceil(f.bytes / 4),
      score,
      reason,
    }
  })

  curated.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
  const fileTree = included.map((f) => f.path).sort()

  return { files: curated, fileTree, excludedCount }
}