import BetterNCM from "./betterncm-api";

export interface CommunityThemePalette {
	background: string;
	sidebar: string;
	surface: string;
	surfaceElevated: string;
	text: string;
	muted: string;
	accent: string;
	danger: string;
	success: string;
}

export interface WallpaperResource {
	path: string;
	name: string;
	extension: string;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp"]);
const MAX_SCAN_DEPTH = 3;
const MAX_SCAN_RESULTS = 120;
const MAX_IMAGE_BYTES = 24 * 1024 * 1024;

function normalizeHex(value: string, fallback = "#000000") {
	const trimmed = value.trim().replace(/^#/, "");
	if (/^[0-9a-f]{3}$/i.test(trimmed)) {
		return `#${trimmed.split("").map((char) => char + char).join("")}`.toLowerCase();
	}
	if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`.toLowerCase();
	return fallback;
}

function hexToRgb(hex: string) {
	const value = Number.parseInt(normalizeHex(hex).slice(1), 16);
	return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function luminance(hex: string) {
	const { r, g, b } = hexToRgb(hex);
	const linear = (channel: number) => {
		const value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function mix(first: string, second: string, amount: number) {
	const a = hexToRgb(first);
	const b = hexToRgb(second);
	const channel = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
	return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
}

export function paletteFromBase16(values: Record<string, string>): CommunityThemePalette {
	const base = (key: string, fallback: string) => normalizeHex(values[key] || values[key.toLowerCase()] || fallback, fallback);
	const background = base("base00", "#1e1e2e");
	const sidebar = base("base01", background);
	const surface = base("base02", mix(background, "#ffffff", 0.08));
	const muted = base("base03", "#6c7086");
	const text = base("base05", "#cdd6f4");
	const accent = base("base0D", "#89b4fa");
	return {
		background,
		sidebar,
		surface,
		surfaceElevated: base("base04", mix(surface, "#ffffff", 0.12)),
		text,
		muted,
		accent,
		danger: base("base08", "#f38ba8"),
		success: base("base0B", "#a6e3a1"),
	};
}

export function parseBase16(text: string): CommunityThemePalette | null {
	try {
		const parsed = JSON.parse(text) as Record<string, string>;
		if (parsed.base00 || parsed.Base00) return paletteFromBase16(parsed);
	} catch { /* YAML fallback below. */ }
	const values: Record<string, string> = {};
	for (const line of text.split(/\r?\n/)) {
		const match = line.match(/^\s*(base(?:0[0-9A-F]|1[0-5])|Base(?:0[0-9A-F]|1[0-5]))\s*:\s*["']?([0-9a-f]{6})["']?/i);
		if (match) values[match[1]] = match[2];
	}
	return values.base00 || values.Base00 ? paletteFromBase16(values) : null;
}

export async function extractPalette(blob: Blob): Promise<CommunityThemePalette> {
	if (blob.size > MAX_IMAGE_BYTES) throw new Error("图片超过 24 MB，已拒绝处理。");
	const url = URL.createObjectURL(blob);
	try {
		const image = new Image();
		image.decoding = "async";
		image.src = url;
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("图片无法解码。"));
		});
		const canvas = document.createElement("canvas");
		canvas.width = 48;
		canvas.height = 48;
		const context = canvas.getContext("2d", { willReadFrequently: true });
		if (!context) throw new Error("当前网易云环境不支持图片取色。");
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
		const buckets = new Map<string, { r: number; g: number; b: number; weight: number }>();
		for (let i = 0; i < data.length; i += 4) {
			const alpha = data[i + 3] / 255;
			if (alpha < 0.35) continue;
			const r = Math.round(data[i] / 32) * 32;
			const g = Math.round(data[i + 1] / 32) * 32;
			const b = Math.round(data[i + 2] / 32) * 32;
			const key = `${r},${g},${b}`;
			const current = buckets.get(key) || { r: 0, g: 0, b: 0, weight: 0 };
			current.r += data[i] * alpha;
			current.g += data[i + 1] * alpha;
			current.b += data[i + 2] * alpha;
			current.weight += alpha;
			buckets.set(key, current);
		}
		const colors = [...buckets.values()].sort((a, b) => b.weight - a.weight).slice(0, 8).map((item) => {
			const toHex = (value: number) => Math.round(value / item.weight).toString(16).padStart(2, "0");
			return `#${toHex(item.r)}${toHex(item.g)}${toHex(item.b)}`;
		});
		const background = colors.find((color) => luminance(color) < 0.28) || mix(colors[0] || "#1e1e2e", "#000000", 0.38);
		const accent = colors.find((color) => {
			const rgb = hexToRgb(color);
			return Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b) > 55 && luminance(color) > 0.12;
		}) || colors[1] || "#f43f5e";
		const text = luminance(background) < 0.32 ? "#f8fafc" : "#20202a";
		const muted = luminance(background) < 0.32 ? "#cbd5e1" : "#5b6170";
		return {
			background,
			sidebar: mix(background, "#000000", 0.16),
			surface: mix(background, "#ffffff", luminance(background) < 0.32 ? 0.12 : 0.08),
			surfaceElevated: mix(background, "#ffffff", 0.2),
			text,
			muted,
			accent,
			danger: "#fb7185",
			success: "#34d399",
		};
	} finally {
		URL.revokeObjectURL(url);
	}
}

function extensionOf(path: string) {
	const match = path.match(/\.[^\\/.]+$/);
	return match ? match[0].toLowerCase() : "";
}

function baseName(path: string) {
	return path.split(/[\\/]/).filter(Boolean).pop() || path;
}

export async function scanWallpaperEngine(rootPath: string): Promise<WallpaperResource[]> {
	const root = rootPath.trim().replace(/[\\/]$/, "");
	if (!root) throw new Error("请先填写 Wallpaper Engine Workshop 路径。");
	const result: WallpaperResource[] = [];
	const queue: Array<{ path: string; depth: number }> = [];
	const normalizedRoot = root.toLowerCase();

	// Workshop 根目录可能包含数千个项目，直接 readDir 会让旧版 CEF 的 JSON 响应过大。
	// 优先读取 Steam 的 appworkshop 清单，再逐个读取项目目录。
	if (normalizedRoot.endsWith("\\workshop\\content\\431960") || normalizedRoot.endsWith("/workshop/content/431960")) {
		const workshopManifest = root.replace(/[\\/]content[\\/]431960$/i, "") + "\\appworkshop_431960.acf";
		try {
			const manifest = await BetterNCM.fs.readFileText(workshopManifest);
			const ids = [...manifest.matchAll(/^\s*"(\d{8,})"\s*$/gim)].map((match) => match[1]);
			for (const id of ids.slice(0, 240)) queue.push({ path: `${root}\\${id}`, depth: 0 });
		} catch {
			throw new Error("无法读取 Steam Workshop 清单。请确认路径为 Steam\\steamapps\\workshop\\content\\431960，且网易云有权限访问。");
		}
	} else {
		queue.push({ path: root, depth: 0 });
	}

	while (queue.length && result.length < MAX_SCAN_RESULTS) {
		const current = queue.shift()!;
		let entries: string[];
		try {
			entries = await BetterNCM.fs.readDir(current.path);
		} catch {
			continue;
		}
		for (const entry of entries) {
			const filePath = entry.includes("\\") || entry.includes("/") ? entry : `${current.path}\\${entry}`;
			const extension = extensionOf(filePath);
			if (IMAGE_EXTENSIONS.has(extension)) {
				result.push({ path: filePath, name: baseName(filePath), extension });
				if (result.length >= MAX_SCAN_RESULTS) break;
				continue;
			}
			if (current.depth < MAX_SCAN_DEPTH && !extension) queue.push({ path: filePath, depth: current.depth + 1 });
		}
	}
	return result;
}


