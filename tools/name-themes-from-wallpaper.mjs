#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const libraryRoot = path.resolve(process.argv[2] || "generated-themes");
const workshopRoot = path.resolve(process.argv[3] || "D:\\steam\\steamapps\\workshop\\content\\431960");

function cleanTitle(value, fallback) {
  const title = String(value || "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").replace(/[. ]+$/g, "").trim();
  return (title || fallback).slice(0, 96);
}
function mergeTags(first = [], second = []) {
  const tags = [...first, ...second].map((value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")).filter(Boolean);
  return [...new Set(tags)].slice(0, 12);
}
async function readJson(file) { return JSON.parse((await fs.readFile(file, "utf8")).replace(/^\uFEFF/, "")); }

const indexPath = path.join(libraryRoot, "index.json");
const index = await readJson(indexPath);
const entries = Array.isArray(index.themes) ? index.themes : [];
const planned = [];
const usedNames = new Set();

for (const entry of entries) {
  const sourceId = String(entry.sourceKey || "").split(":")[0];
  let project = {};
  try { project = await readJson(path.join(workshopRoot, sourceId, "project.json")); } catch { /* Preserve generated metadata. */ }
  const wallpaperTitle = cleanTitle(project.title, `Wallpaper ${sourceId}`);
  const creativeName = cleanTitle(entry.name, "网易云主题");
  const displayName = creativeName.toLowerCase() === wallpaperTitle.toLowerCase() ? wallpaperTitle : `${wallpaperTitle} · ${creativeName}`;
  let directory = wallpaperTitle;
  if (usedNames.has(directory.toLowerCase())) directory = `${directory}（Workshop ${sourceId}）`;
  usedNames.add(directory.toLowerCase());
  planned.push({ entry, sourceId, project, wallpaperTitle, creativeName, displayName, directory });
}

// Move through unique temporary names first so titles that exchange names cannot collide.
for (let indexNumber = 0; indexNumber < planned.length; indexNumber += 1) {
  const item = planned[indexNumber];
  const oldPath = path.join(libraryRoot, item.entry.directory);
  item.tempDirectory = `.__rename-${indexNumber}-${item.sourceId}`;
  await fs.rename(oldPath, path.join(libraryRoot, item.tempDirectory));
}

for (const item of planned) {
  const directoryPath = path.join(libraryRoot, item.directory);
  await fs.rename(path.join(libraryRoot, item.tempDirectory), directoryPath);
  const manifestPath = path.join(directoryPath, "manifest.json");
  const themePath = path.join(directoryPath, "theme.json");
  const settingsPath = path.join(directoryPath, "local-settings.json");
  const manifest = await readJson(manifestPath);
  const theme = await readJson(themePath);
  const settings = await readJson(settingsPath);
  const description = `基于 Wallpaper Engine 壁纸《${item.wallpaperTitle}》设计。${String(theme.description || item.entry.description || "").trim()}`.slice(0, 240);
  const tags = mergeTags(theme.tags || item.entry.tags, item.project.tags);

  manifest.name = item.displayName;
  manifest.description = description;
  manifest.tags = tags.length ? tags : ["wallpaper", "music"];
  theme.name = item.displayName;
  theme.wallpaperTitle = item.wallpaperTitle;
  theme.generatedThemeName = item.creativeName;
  theme.description = description;
  theme.tags = manifest.tags;
  theme.source = { ...theme.source, wallpaperTitle: item.wallpaperTitle };
  settings.customCssName = item.displayName;
  settings.wallpaperName = item.wallpaperTitle;

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  await fs.writeFile(themePath, JSON.stringify(theme, null, 2) + "\n", "utf8");
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(directoryPath, "CREDITS.md"), `# ${item.displayName}\n\n${description}\n\n- Wallpaper Engine 标题：\`${item.wallpaperTitle}\`\n- Workshop 项目：\`${item.sourceId}\`\n- 原图未复制、未上传、未包含在此主题包中。\n- 公开发布前请确认 Wallpaper Engine 原作者许可。\n`, "utf8");

  Object.assign(item.entry, {
    directory: item.directory,
    name: item.displayName,
    wallpaperTitle: item.wallpaperTitle,
    generatedThemeName: item.creativeName,
    description,
    tags: manifest.tags,
  });
}
index.count = entries.length;
index.namedFromWallpaperMetadata = true;
index.themes = entries;
await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`已按 Wallpaper Engine 标题整理 ${entries.length} 个主题：${libraryRoot}`);

