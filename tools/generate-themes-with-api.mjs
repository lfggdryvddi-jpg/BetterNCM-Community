#!/usr/bin/env node
/**
 * Batch-generate BetterNCM Community skin packages from local Wallpaper Engine previews.
 *
 * Privacy model: only the file name, Workshop project id and locally extracted palette are
 * sent to the API. Original images and absolute local paths never leave the machine.
 * The API key must be supplied through OPENCODE_API_KEY, never as a command-line argument.
 */
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_WALLPAPER_ROOT = "D:\\steam\\steamapps\\workshop\\content\\431960";
const DEFAULT_OUTPUT = path.join(ROOT, "generated-themes");
const API_URL = (process.env.OPENCODE_API_URL || "https://opencode.ai/zen/v1/chat/completions").replace(/\/$/, "");
const MODEL = process.env.OPENCODE_MODEL || "big-pickle";
const API_KEY = process.env.OPENCODE_API_KEY;

const DEFAULT_PALETTE = {
  background: "#1e1e2e", sidebar: "#181825", surface: "#29283b", surfaceElevated: "#383750",
  text: "#f8fafc", muted: "#cbd5e1", accent: "#89b4fa", danger: "#fb7185", success: "#34d399",
};
const HEX = /^#[0-9a-f]{6}$/i;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp"]);

function usage() {
  console.log(`用法：
  node tools/generate-themes-with-api.mjs [选项]

选项：
  --wallpaper-root <目录>  Wallpaper Engine Workshop 根目录
  --output <目录>         输出目录，默认 generated-themes
  --limit <数量>          本次最多处理多少张，默认 3
  --batch-size <数量>     每次 API 请求处理多少张，默认 4
  --max-projects <数量>   最多读取多少个 Workshop 项目，默认 240
  --dry-run               只扫描和取色，不调用 API
  --no-resume             不跳过已有结果，重新生成
  --help                  显示帮助

环境变量（不要写入代码或提交仓库）：
  OPENCODE_API_KEY        新生成的 OpenCode Zen API Key
  OPENCODE_MODEL          模型名，默认 big-pickle
  OPENCODE_API_URL        OpenAI-compatible Chat Completions 地址
`);
}

function parseArgs(argv) {
  const options = {
    wallpaperRoot: process.env.WALLPAPER_ROOT || DEFAULT_WALLPAPER_ROOT,
    output: DEFAULT_OUTPUT,
    limit: 3,
    batchSize: 4,
    maxProjects: 240,
    dryRun: false,
    resume: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") { usage(); process.exit(0); }
    if (arg === "--dry-run") { options.dryRun = true; continue; }
    if (arg === "--no-resume") { options.resume = false; continue; }
    const next = () => {
      if (!argv[i + 1]) throw new Error(`${arg} 缺少参数。`);
      i += 1; return argv[i];
    };
    if (arg === "--wallpaper-root") options.wallpaperRoot = next();
    else if (arg === "--output") options.output = path.resolve(next());
    else if (arg === "--limit") options.limit = Math.max(1, Number(next()));
    else if (arg === "--batch-size") options.batchSize = Math.max(1, Math.min(12, Number(next())));
    else if (arg === "--max-projects") options.maxProjects = Math.max(1, Number(next()));
    else throw new Error(`未知参数：${arg}`);
  }
  if (!Number.isFinite(options.limit) || !Number.isFinite(options.batchSize) || !Number.isFinite(options.maxProjects)) {
    throw new Error("数量参数必须是数字。");
  }
  return options;
}

async function scanWallpapers(root, maxItems, maxProjects) {
  const helper = path.join(ROOT, "tools", "extract-wallpaper-palettes.ps1");
  const { stdout, stderr } = await execFileAsync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", helper,
    "-Root", root, "-MaxItems", String(maxItems), "-MaxProjects", String(maxProjects),
  ], { maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  if (stderr.trim()) process.stderr.write(stderr);
  const parsed = JSON.parse(stdout.trim() || "[]");
  return Array.isArray(parsed) ? parsed : [parsed];
}

function normalizeHex(value, fallback) {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;
}
function safePalette(value, fallback = DEFAULT_PALETTE) {
  const result = {};
  for (const key of Object.keys(DEFAULT_PALETTE)) result[key] = normalizeHex(value?.[key], fallback[key] || DEFAULT_PALETTE[key]);
  return result;
}
function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
function slugify(value, fallback) {
  const result = String(value || "").normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56);
  return result || fallback;
}
function slugifyAscii(value, fallback) {
  const result = String(value || "").normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56);
  return result || fallback;
}
function safeDirectoryName(value, fallback) {
  const cleaned = String(value || "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").replace(/[. ]+$/g, "").trim();
  return (cleaned || fallback).slice(0, 96);
}
function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${value >> 16}, ${value >> 8 & 255}, ${value & 255}`;
}
function jsonFromModel(text, resources = []) {
  const cleaned = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsedBlocks = [];
  for (let start = 0; start < cleaned.length; start += 1) {
    const opener = cleaned[start];
    if (opener !== "[" && opener !== "{") continue;
    const stack = [opener];
    let inString = false; let escaped = false;
    for (let index = start + 1; index < cleaned.length; index += 1) {
      const char = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === "[" || char === "{") stack.push(char);
      else if (char === "]" || char === "}") {
        const expected = char === "]" ? "[" : "{";
        if (stack.at(-1) !== expected) break;
        stack.pop();
        if (!stack.length) {
          try { parsedBlocks.push(JSON.parse(cleaned.slice(start, index + 1))); } catch { /* Keep scanning. */ }
          break;
        }
      }
    }
  }
  const expectedKeys = new Set(resources.map((resource) => `${resource.projectId}:${resource.name}`));
  const candidates = parsedBlocks.map((value) => Array.isArray(value) ? value : value?.themes).filter(Array.isArray);
  const score = (themes) => themes.reduce((total, theme) => {
    if (!theme || typeof theme !== "object") return total - 5;
    let points = expectedKeys.has(theme.sourceKey) ? 20 : 0;
    if (typeof theme.name === "string" && theme.name.length >= 2 && theme.name !== "有意境的中文名") points += 5;
    if (typeof theme.description === "string" && theme.description.length >= 8) points += 3;
    if (theme.palette && Object.values(theme.palette).filter((value) => typeof value === "string" && HEX.test(value)).length >= 7) points += 8;
    if (theme.effects && Number.isFinite(Number(theme.effects.opacity))) points += 2;
    return total + points;
  }, themes.length === resources.length ? 10 : 0);
  candidates.sort((first, second) => score(second) - score(first));
  if (candidates.length && score(candidates[0]) > 0) return candidates[0];
  throw new Error("API 没有返回可识别的主题 JSON 数组。");
}

function requestPayload(resources) {
  return {
    task: "根据每个 Wallpaper Engine 壁纸的真实标题和本地调色板，设计名称相对应的 BetterNCM Community 网易云音乐主题。不要复述路径，不要生成图片。",
    constraints: {
      product: "网易云音乐桌面端 3.x + BetterNCM Community",
      output: "strict JSON object only: { themes: [...] }",
      language: "简体中文",
      accessibility: "深色界面，保证主要文字与背景有足够对比度",
      wallpaperPolicy: "原图只在本地使用；必须参考 wallpaperTitle 命名，禁止使用随机字母数字或 preview 作为主题名",
    },
    schema: {
      sourceKey: "string, must equal input sourceKey",
      name: "string, 2-24 Chinese characters",
      description: "string, <=120 Chinese characters",
      tags: "array of 2-6 short lowercase English tags",
      mode: "dark or light",
      palette: "object with background, sidebar, surface, surfaceElevated, text, muted, accent, danger, success as #RRGGBB",
      effects: "object with panel opacity 45-82 (lower shows more wallpaper), blur 0-12, radius 6-18, overlay 0.08-0.35",
    },
    resources: resources.map((resource) => ({
      sourceKey: `${resource.projectId}:${resource.name}`,
      fileName: resource.name,
      workshopProjectId: resource.projectId,
      wallpaperTitle: resource.title || resource.name,
      wallpaperTags: resource.tags || [],
      localPalette: resource.palette,
    })),
  };
}

async function callApi(resources, attempt = 0) {
  const body = {
    model: MODEL,
    temperature: 0.7,
    max_tokens: 6000,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: '你是资深桌面音乐软件主题设计师。严格只输出 {"themes":[...]} JSON 对象，不要 Markdown，不要解释。' },
      { role: "user", content: JSON.stringify(requestPayload(resources)) },
    ],
  };
  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    if (attempt < 2) { await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1))); return callApi(resources, attempt + 1); }
    throw new Error(`API 网络请求失败：${error.message}`);
  }
  const text = await response.text();
  if (!response.ok) {
    if (attempt < 2 && (response.status === 408 || response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1))); return callApi(resources, attempt + 1);
    }
    throw new Error(`API 返回 HTTP ${response.status}：${text.slice(0, 800)}`);
  }
  let result;
  try { result = JSON.parse(text); } catch { throw new Error(`API 返回不是 JSON：${text.slice(0, 500)}`); }
  const content = result?.choices?.[0]?.message?.content ?? result?.output_text ?? result?.content;
  try {
    if (Array.isArray(content)) return jsonFromModel(content.map((part) => part.text || part.content || "").join(""), resources);
    return jsonFromModel(content, resources);
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      return callApi(resources, attempt + 1);
    }
    throw error;
  }
}

function normalizeTheme(raw, resource) {
  const sourceKey = `${resource.projectId}:${resource.name}`;
  const wallpaperTitle = String(resource.title || resource.name.replace(/\.[^.]+$/, "") || `Wallpaper ${resource.projectId}`).trim();
  const generatedThemeName = String(raw?.name || "音乐主题").trim();
  const displayName = generatedThemeName.toLowerCase() === wallpaperTitle.toLowerCase() ? wallpaperTitle : `${wallpaperTitle} · ${generatedThemeName}`;
  const palette = safePalette(raw?.palette, safePalette(resource.palette));
  const effects = {
    opacity: Math.round(clamp(raw?.effects?.opacity, 45, 82, 60)),
    blur: Math.round(clamp(raw?.effects?.blur, 0, 12, 4)),
    radius: Math.round(clamp(raw?.effects?.radius, 6, 18, 12)),
    overlay: clamp(raw?.effects?.overlay, 0.08, 0.35, 0.16),
  };
  const rawTags = Array.isArray(raw?.tags) ? raw.tags : [];
  const sourceTags = Array.isArray(resource.tags) ? resource.tags : [];
  const tags = [...rawTags, ...sourceTags].map((tag) => slugifyAscii(tag, "music")).filter(Boolean).slice(0, 12);
  const rawDescription = String(raw?.description || "根据本地配色生成的网易云主题。").trim();
  return {
    sourceKey,
    id: slugifyAscii(wallpaperTitle, `wallpaper-${resource.projectId}`),
    name: displayName.slice(0, 80),
    wallpaperTitle: wallpaperTitle.slice(0, 96),
    generatedThemeName: generatedThemeName.slice(0, 40),
    description: `基于 Wallpaper Engine 壁纸《${wallpaperTitle}》设计。${rawDescription}`.slice(0, 240),
    tags: [...new Set(tags.length ? tags : ["wallpaper", "music"])],
    mode: raw?.mode === "light" ? "light" : "dark",
    palette,
    effects,
    source: { type: "wallpaper-engine-local", projectId: resource.projectId, fileName: resource.name, wallpaperTitle, mediaType: resource.mediaType || "unknown", localOnly: true },
  };
}

function themeCss(theme) {
  const p = theme.palette;
  const e = theme.effects;
  const base = `html[data-bncm-community-theme], html[data-bncm-community-theme] body`;
  const opacity = e.opacity / 100;
  const mainOpacity = Math.min(0.78, opacity * 0.72).toFixed(3);
  const sidebarOpacity = Math.min(0.86, opacity * 0.82).toFixed(3);
  const cardOpacity = Math.min(0.7, opacity * 0.58).toFixed(3);
  return `/* BetterNCM Community generated skin: ${theme.name} */
/* Image-first theme: the local Wallpaper Engine preview remains the visible background. */
:root {
  --bncm-generated-background: ${p.background};
  --bncm-generated-sidebar: ${p.sidebar};
  --bncm-generated-surface: ${p.surface};
  --bncm-generated-surface-elevated: ${p.surfaceElevated};
  --bncm-generated-text: ${p.text};
  --bncm-generated-muted: ${p.muted};
  --bncm-generated-accent: ${p.accent};
  --bncm-generated-accent-rgb: ${rgb(p.accent)};
  --bncm-generated-opacity: ${opacity};
  --bncm-generated-main-opacity: ${mainOpacity};
  --bncm-generated-sidebar-opacity: ${sidebarOpacity};
  --bncm-generated-card-opacity: ${cardOpacity};
  --bncm-generated-blur: ${e.blur}px;
  --bncm-generated-radius: ${e.radius}px;
}
${base} { color: ${p.text} !important; background-color: ${p.background} !important; }
html[data-bncm-community-theme] #app,
html[data-bncm-community-theme] #g_iframe { background-color: ${p.background} !important; }
html[data-bncm-community-theme] .g-sd,
html[data-bncm-community-theme] [data-bncm-community-surface="sidebar"] { background: ${p.sidebar} !important; }
html[data-bncm-community-theme] .m-top,
html[data-bncm-community-theme] [data-bncm-community-surface="topbar"],
html[data-bncm-community-theme] .m-playbar,
html[data-bncm-community-theme] [data-bncm-community-surface="player"] { background: ${p.surface} !important; backdrop-filter: blur(var(--bncm-generated-blur)); }
html[data-bncm-community-theme] [data-bncm-community-surface="main"],
html[data-bncm-community-theme] .m-table { background: ${p.surface} !important; border-radius: var(--bncm-generated-radius); }
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] body,
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] #app,
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] #g_iframe { background-color: transparent !important; }
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] [class*="StyledBackground"] {
  background-image: linear-gradient(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12)), var(--bncm-community-wallpaper) !important;
  background-size: cover, cover !important;
  background-position: center, center !important;
  background-repeat: no-repeat, no-repeat !important;
  filter: none !important;
  opacity: 1 !important;
}
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] .g-sd,
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] [data-bncm-community-surface="sidebar"] { background: rgba(${rgb(p.sidebar)}, var(--bncm-generated-sidebar-opacity)) !important; }
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] .m-top,
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] [data-bncm-community-surface="topbar"],
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] .m-playbar,
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] [data-bncm-community-surface="player"] { background: rgba(${rgb(p.surface)}, var(--bncm-generated-opacity)) !important; backdrop-filter: blur(var(--bncm-generated-blur)); }
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] [data-bncm-community-surface="main"] { background: rgba(${rgb(p.background)}, var(--bncm-generated-main-opacity)) !important; backdrop-filter: blur(var(--bncm-generated-blur)); }
html[data-bncm-community-theme][data-bncm-community-wallpaper="true"] .m-table { background: rgba(${rgb(p.surface)}, var(--bncm-generated-card-opacity)) !important; }
html[data-bncm-community-theme] a:hover,
html[data-bncm-community-theme] [aria-selected="true"],
html[data-bncm-community-theme] [aria-current="page"] { color: ${p.accent} !important; }
html[data-bncm-community-theme] button:hover,
html[data-bncm-community-theme] input[type="range"] { accent-color: ${p.accent}; }
html[data-bncm-community-theme] .m-table th,
html[data-bncm-community-theme] .m-table td { color: ${p.text} !important; border-color: color-mix(in srgb, ${p.text} 12%, transparent) !important; }
html[data-bncm-community-theme] .m-table .sub,
html[data-bncm-community-theme] .u-hide { color: ${p.muted} !important; }
html[data-bncm-community-theme] .m-playbar::before,
html[data-bncm-community-theme] [class*="DefaultBarWrapper_"]::before { background: linear-gradient(90deg, transparent, rgba(${rgb(p.accent)}, ${e.overlay}), transparent) !important; }
`;
}

async function writeTheme(output, theme, resource) {
  const directoryName = safeDirectoryName(theme.wallpaperTitle || theme.name, `Wallpaper ${resource.projectId}`);
  let dir = path.join(output, directoryName); let suffix = 2;
  while (true) { try { await fs.access(dir); dir = path.join(output, `${directoryName}（${suffix++}）`); } catch { break; } }
  await fs.mkdir(dir, { recursive: true });
  const manifest = {
    schema: 1, id: theme.id, name: theme.name, version: "1.0.0", author: "BetterNCM Community local generator",
    description: theme.description, entry: "theme.css", license: "CC0-1.0 (generated code; source artwork remains third-party)",
    compatibility: { betterncm: "BetterNCM Community", ncm: "3.x" }, tags: theme.tags,
  };
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(dir, "theme.json"), JSON.stringify({ ...theme, source: { ...theme.source, pathOmitted: true } }, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(dir, "theme.css"), themeCss(theme), "utf8");
  await fs.writeFile(path.join(dir, "CREDITS.md"), `# ${theme.name}\n\n${theme.description}\n\n- 来源类型：本地 Wallpaper Engine 预览图\n- Workshop 项目：\`${resource.projectId}\`\n- 原图文件名：\`${resource.name}\`\n- 原图未复制、未上传、未包含在此主题包中。请在公开发布前确认原作者许可。\n- 生成代码：BetterNCM Community 本地批量主题生成器\n`, "utf8");
  await fs.writeFile(path.join(dir, "local-settings.json"), JSON.stringify({
    version: 3, themeId: "generated", accent: theme.palette.accent, intensity: theme.effects.opacity,
    blur: theme.effects.blur, customCss: themeCss(theme), customCssName: theme.name,
    wallpaperPath: resource.path, wallpaperName: theme.wallpaperTitle || resource.title || resource.name,
    wallpaperType: resource.mediaType || "unknown", wallpaperMediaPath: resource.contentPath || "", palette: theme.palette,
  }, null, 2) + "\n", "utf8");
  return path.basename(dir);
}

async function discoverExistingThemes(output) {
  const discovered = [];
  let entries = [];
  try { entries = await fs.readdir(output, { withFileTypes: true }); } catch { return discovered; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const theme = JSON.parse(await fs.readFile(path.join(output, entry.name, "theme.json"), "utf8"));
      if (!theme?.sourceKey) continue;
      discovered.push({
        directory: entry.name,
        sourceKey: theme.sourceKey,
        name: theme.name,
        description: theme.description,
        tags: theme.tags,
        palette: theme.palette,
        effects: theme.effects,
      });
    } catch { /* Ignore incomplete theme directories. */ }
  }
  return discovered;
}

async function saveIndex(indexPath, results, dryRun) {
  await fs.writeFile(indexPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: dryRun ? null : MODEL,
    count: results.length,
    themes: results,
  }, null, 2) + "\n", "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun && !API_KEY) {
    throw new Error("未找到 OPENCODE_API_KEY。聊天中曾出现的密钥已经暴露，不应继续使用；请撤销旧密钥并在当前 PowerShell 设置新密钥后重试：$env:OPENCODE_API_KEY = '新密钥'");
  }
  console.log(`扫描 Wallpaper Engine：${options.wallpaperRoot}`);
  const resources = await scanWallpapers(options.wallpaperRoot, options.limit, options.maxProjects);
  if (!resources.length) throw new Error("没有找到可读取的图片预览。请确认 Workshop 路径、Steam 清单和文件权限。");
  console.log(`找到 ${resources.length} 个可取色资源。输出：${options.output}`);
  await fs.mkdir(options.output, { recursive: true });
  await fs.writeFile(path.join(options.output, ".gitignore"), "*/local-settings.json\n", "utf8");

  const indexPath = path.join(options.output, "index.json");
  let existing = [];
  if (options.resume) {
    try {
      const previous = JSON.parse(await fs.readFile(indexPath, "utf8"));
      existing = Array.isArray(previous.themes) ? previous.themes : [];
    } catch { /* First run or incomplete output. */ }
    const discovered = await discoverExistingThemes(options.output);
    const bySource = new Map([...existing, ...discovered].map((item) => [item.sourceKey, item]));
    existing = [...bySource.values()];
    if (discovered.length) await saveIndex(indexPath, existing, options.dryRun);
  }
  const existingKeys = new Set(existing.map((item) => item.sourceKey));
  const pending = options.resume ? resources.filter((resource) => !existingKeys.has(`${resource.projectId}:${resource.name}`)) : resources;
  if (!pending.length) {
    console.log("所有选中的资源已有生成结果；如需重做请加 --no-resume。 ");
    return;
  }

  const results = [...existing];
  for (let index = 0; index < pending.length; index += options.batchSize) {
    const batch = pending.slice(index, index + options.batchSize);
    let generated;
    if (options.dryRun) {
      generated = batch.map((resource) => ({ sourceKey: `${resource.projectId}:${resource.name}`, name: "本地配色", description: "根据本地调色板生成的测试主题", tags: ["wallpaper"], palette: resource.palette, effects: { opacity: 60, blur: 4, radius: 12, overlay: 0.16 } }));
    } else {
      console.log(`调用 OpenCode Zen：${index + 1}-${index + batch.length}/${pending.length}，模型 ${MODEL}`);
      const response = await callApi(batch);
      generated = Array.isArray(response) ? response : response?.themes;
      if (!Array.isArray(generated)) throw new Error("API 返回缺少主题数组。");
    }
    for (const [resourceIndex, resource] of batch.entries()) {
      const sourceKey = `${resource.projectId}:${resource.name}`;
      const raw = generated.find((item) => item?.sourceKey === sourceKey) || generated.find((item) => item?.fileName === resource.name) || generated[resourceIndex];
      if (!raw) { console.warn(`跳过：API 没有返回 ${sourceKey}`); continue; }
      const theme = normalizeTheme(raw, resource);
      const dir = await writeTheme(options.output, theme, resource);
      results.push({ directory: dir, sourceKey, name: theme.name, description: theme.description, tags: theme.tags, palette: theme.palette, effects: theme.effects });
    }
    await saveIndex(indexPath, results, options.dryRun);
    if (index + options.batchSize < pending.length) await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  await saveIndex(indexPath, results, options.dryRun);
  console.log(options.dryRun ? `Dry run 完成：生成 ${results.length - existing.length} 个本地测试包，没有调用 API。` : `完成：本次生成 ${results.length - existing.length} 个主题包，共 ${results.length} 个。`);
}

main().catch((error) => { console.error(`错误：${error.message}`); process.exitCode = 1; });




