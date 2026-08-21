import BetterNCM from "../../betterncm-api";
import {
	CommunityThemePalette,
	CommunityThemeSettings,
	clearCommunityWallpaper,
	getCommunityThemeSettings,
	saveCommunityThemeSettings,
	useCommunityWallpaper,
	validateCommunityCss,
} from "../../community-theme";
import { extractPalette, parseBase16, scanWallpaperEngine, WallpaperResource, WallpaperResourceType } from "../../theme-generator";

interface Props {
	settings: CommunityThemeSettings;
	onUpdate: (next: Partial<CommunityThemeSettings>) => void;
	onSettingsRefresh: (settings: CommunityThemeSettings) => void;
	onMessage: (message: string) => void;
}

interface GeneratedThemeEntry {
	directory: string;
	name: string;
	wallpaperTitle?: string;
	generatedThemeName?: string;
	description?: string;
	tags?: string[];
	sourceKey: string;
	palette: CommunityThemePalette;
	effects?: { opacity?: number; blur?: number; radius?: number; overlay?: number };
	wallpaperPath?: string;
	mediaType?: WallpaperResourceType;
	contentPath?: string;
}

interface GeneratedThemeIndex {
	count: number;
	themes: GeneratedThemeEntry[];
}

interface LocalGeneratedSettings extends Partial<CommunityThemeSettings> {
	wallpaperPath?: string;
	wallpaperType?: WallpaperResourceType;
	wallpaperMediaPath?: string;
}

const DEFAULT_LIBRARY_PATH = "D:\\A软件安装\\BetterNCM\\Data\\themes";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function joinPath(...parts: string[]) {
	return parts.map((part, index) => index ? part.replace(/^[\\/]+|[\\/]+$/g, "") : part.replace(/[\\/]+$/g, "")).filter(Boolean).join("\\");
}

function isPalette(value: unknown): value is CommunityThemePalette {
	if (!value || typeof value !== "object") return false;
	const palette = value as Record<string, unknown>;
	return ["background", "sidebar", "surface", "surfaceElevated", "text", "muted", "accent", "danger", "success"]
		.every((key) => typeof palette[key] === "string" && HEX_COLOR.test(palette[key] as string));
}

const MEDIA_LABELS: Record<WallpaperResourceType, string> = {
	image: "图片",
	video: "视频",
	web: "Web",
	scene: "Scene",
	unknown: "壁纸",
};

function parentPath(path: string) {
	return path.replace(/[\\/][^\\/]+$/, "");
}

async function inspectWallpaperProject(previewPath: string) {
	const root = parentPath(previewPath);
	try {
		const metadata = JSON.parse(await BetterNCM.fs.readFileText(joinPath(root, "project.json"))) as { type?: string; file?: string };
		const normalized = String(metadata.type || "").toLowerCase();
		const mediaType: WallpaperResourceType = normalized === "video" || normalized === "web" || normalized === "scene" || normalized === "image" ? normalized : "unknown";
		return { mediaType, contentPath: metadata.file ? joinPath(root, metadata.file) : "" };
	} catch {
		return { mediaType: "unknown" as WallpaperResourceType, contentPath: "" };
	}
}

const LocalWallpaperPreview: React.FC<{ path?: string; title: string }> = ({ path, title }) => {
	const hostRef = React.useRef<HTMLDivElement>(null);
	const [visible, setVisible] = React.useState(false);
	const [url, setUrl] = React.useState("");

	React.useEffect(() => {
		const host = hostRef.current;
		if (!host || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
		}, { rootMargin: "160px" });
		observer.observe(host);
		return () => observer.disconnect();
	}, []);

	React.useEffect(() => {
		if (!visible || !path) return;
		let cancelled = false;
		let objectUrl = "";
		void BetterNCM.fs.readFile(path).then((blob) => {
			if (cancelled) return;
			objectUrl = URL.createObjectURL(blob);
			setUrl(objectUrl);
		}).catch(() => setUrl(""));
		return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
	}, [visible, path]);

	return <div ref={hostRef} className="bncm-wallpaper-preview" aria-label={title}>
		{url ? <img src={url} alt="" draggable={false} /> : <span>正在读取预览…</span>}
	</div>;
};

const WallpaperHeroPreview: React.FC<{ theme?: GeneratedThemeEntry }> = ({ theme }) => {
	const [mediaUrl, setMediaUrl] = React.useState("");
	const mediaType = theme?.mediaType || "unknown";
	React.useEffect(() => {
		let cancelled = false;
		if (!theme?.contentPath || (mediaType !== "video" && mediaType !== "web")) { setMediaUrl(""); return; }
		void (async () => {
			try {
				let next = "";
				if (mediaType === "video") next = await BetterNCM.fs.mountFile(theme.contentPath!);
				else {
					const projectRoot = parentPath(theme.wallpaperPath || theme.contentPath!);
					const mountedRoot = (await BetterNCM.fs.mountDir(projectRoot)).replace(/[\\/]+$/, "");
					const entry = theme.contentPath!.slice(projectRoot.length).replace(/^[\\/]+/, "").split(/[\\/]/).map(encodeURIComponent).join("/");
					next = `${mountedRoot}/${entry}`;
				}
				if (!cancelled) setMediaUrl(next);
			} catch { if (!cancelled) setMediaUrl(""); }
		})();
		return () => { cancelled = true; };
	}, [theme?.contentPath, theme?.wallpaperPath, mediaType]);

	if (!theme) return null;
	return <div className="bncm-wallpaper-hero">
		<LocalWallpaperPreview path={theme.wallpaperPath} title={theme.wallpaperTitle || theme.name} />
		{mediaType === "video" && mediaUrl && <video className="bncm-wallpaper-hero-media" src={mediaUrl} autoPlay loop muted playsInline />}
		{mediaType === "web" && mediaUrl && <iframe className="bncm-wallpaper-hero-media" src={mediaUrl} title={theme.wallpaperTitle || theme.name} sandbox="allow-scripts" tabIndex={-1} />}
		<div className="bncm-wallpaper-hero-shade" />
		<div className="bncm-wallpaper-hero-copy">
			<em>{MEDIA_LABELS[mediaType]}{mediaType === "scene" ? "（当前静态预览）" : mediaType === "video" || mediaType === "web" ? "动态预览" : "预览"}</em>
			<strong>{theme.wallpaperTitle || theme.name}</strong>
			<span>{theme.generatedThemeName || theme.description || "Wallpaper Engine 本地主题"}</span>
		</div>
	</div>;
};

const CommunityGeneratedThemeLibrary: React.FC<Props> = ({ onSettingsRefresh, onMessage }) => {
	const [libraryPath, setLibraryPath] = React.useState(DEFAULT_LIBRARY_PATH);
	const [themes, setThemes] = React.useState<GeneratedThemeEntry[]>([]);
	const [filter, setFilter] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [applying, setApplying] = React.useState("");
	const [previewing, setPreviewing] = React.useState("");

	const loadLibrary = async (quiet = false) => {
		setLoading(true);
		try {
			const parsed = JSON.parse(await BetterNCM.fs.readFileText(joinPath(libraryPath, "index.json"))) as GeneratedThemeIndex;
			if (!parsed || !Array.isArray(parsed.themes)) throw new Error("主题索引格式不正确。");
			const valid = parsed.themes.filter((theme) => theme.directory && theme.name && isPalette(theme.palette));
			const enriched = await Promise.all(valid.map(async (theme) => {
				try {
					const local = JSON.parse(await BetterNCM.fs.readFileText(joinPath(libraryPath, theme.directory, "local-settings.json"))) as LocalGeneratedSettings;
					const wallpaperPath = local.wallpaperPath || theme.wallpaperPath || "";
					const metadata = wallpaperPath ? await inspectWallpaperProject(wallpaperPath) : { mediaType: "unknown" as WallpaperResourceType, contentPath: "" };
					return { ...theme, wallpaperPath, mediaType: local.wallpaperType || theme.mediaType || metadata.mediaType, contentPath: local.wallpaperMediaPath || theme.contentPath || metadata.contentPath };
				} catch {
					return theme;
				}
			}));
			setThemes(enriched);
			if (!quiet) onMessage(`已载入 ${enriched.length} 个按 Wallpaper Engine 标题命名的本地主题。`);
		} catch (error) {
			setThemes([]);
			if (!quiet) onMessage(error instanceof Error ? `主题库读取失败：${error.message}` : "主题库读取失败。");
		} finally {
			setLoading(false);
		}
	};

	React.useEffect(() => { void loadLibrary(true); }, []);

	const applyTheme = async (theme: GeneratedThemeEntry) => {
		setApplying(theme.sourceKey);
		try {
			const themeRoot = joinPath(libraryPath, theme.directory);
			const local = JSON.parse(await BetterNCM.fs.readFileText(joinPath(themeRoot, "local-settings.json"))) as LocalGeneratedSettings;
			const rawCss = typeof local.customCss === "string" ? local.customCss : await BetterNCM.fs.readFileText(joinPath(themeRoot, "theme.css"));
			const css = /BetterNCM Community generated skin:/i.test(rawCss) ? "" : rawCss;
			const cssError = validateCommunityCss(css);
			if (cssError) throw new Error(cssError);
			if (!isPalette(local.palette || theme.palette)) throw new Error("主题调色板不完整。");
			if (!local.wallpaperPath) throw new Error("主题没有记录对应的本地 Wallpaper Engine 预览图路径。");
			const current = getCommunityThemeSettings();
			const wallpaperType = local.wallpaperType || theme.mediaType || "unknown";
			const wallpaperMediaPath = local.wallpaperMediaPath || theme.contentPath || "";
			const next: CommunityThemeSettings = {
				...current,
				themeId: "generated",
				palette: (local.palette || theme.palette) as CommunityThemePalette,
				accent: ((local.palette || theme.palette) as CommunityThemePalette).accent,
				intensity: Math.max(20, Math.min(100, Number(local.intensity || theme.effects?.opacity || 60))),
				blur: Math.max(0, Math.min(36, Number(local.blur ?? theme.effects?.blur ?? 4))),
				customCss: css,
				customCssName: theme.name,
				wallpaperPath: local.wallpaperPath,
				wallpaperName: theme.wallpaperTitle || theme.name,
				wallpaperType,
				wallpaperMediaPath,
			};
			saveCommunityThemeSettings(next);
			await useCommunityWallpaper(local.wallpaperPath, theme.wallpaperTitle || theme.name, { type: wallpaperType, mediaPath: wallpaperMediaPath });
			onSettingsRefresh(getCommunityThemeSettings());
			onMessage(`已应用《${theme.name}》，壁纸与主题配色均来自对应的本地 Wallpaper Engine 项目。`);
		} catch (error) {
			onMessage(error instanceof Error ? `应用主题失败：${error.message}` : "应用主题失败。");
		} finally {
			setApplying("");
		}
	};

	const query = filter.trim().toLowerCase();
	const visible = themes.filter((theme) => !query || [theme.name, theme.wallpaperTitle, theme.description, ...(theme.tags || [])].join(" ").toLowerCase().includes(query));
	const previewTheme = themes.find((theme) => theme.sourceKey === previewing) || visible[0];

	return <div className="bncm-generated-library">
		<div className="bncm-generated-library-head">
			<div>
				<strong>Wallpaper Engine 本地主题库</strong>
				<span>{themes.length ? `${themes.length} 个主题，名称与壁纸标题对应` : "读取本机生成的主题包"}</span>
			</div>
			<button type="button" disabled={loading} onClick={() => void loadLibrary()}>{loading ? "载入中…" : "刷新主题库"}</button>
		</div>
		<div className="bncm-theme-generator-row">
			<input value={libraryPath} onChange={(event) => setLibraryPath(event.target.value)} placeholder="本地主题库目录" />
			{themes.length > 0 && <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="搜索壁纸标题、主题名或标签" />}
		</div>
		{previewTheme && <WallpaperHeroPreview theme={previewTheme} />}
		{themes.length > 0 && <div className="bncm-generated-theme-grid">
			{visible.slice(0, 120).map((theme) => <button
				key={theme.sourceKey}
				type="button"
				className="bncm-generated-theme-card"
				disabled={Boolean(applying)}
				onClick={() => void applyTheme(theme)}
				onMouseEnter={() => setPreviewing(theme.sourceKey)}
				onFocus={() => setPreviewing(theme.sourceKey)}
				style={{
					borderColor: theme.palette.accent,
					color: theme.palette.text,
					background: `linear-gradient(145deg, ${theme.palette.background}, ${theme.palette.surface} 58%, ${theme.palette.sidebar})`,
				}}
				title={theme.description || theme.name}
			>
				<LocalWallpaperPreview path={theme.wallpaperPath} title={theme.wallpaperTitle || theme.name} />
				<div className="bncm-generated-theme-scrim" />
				<div className="bncm-generated-theme-copy">
					<strong>{applying === theme.sourceKey ? "正在应用…" : (theme.wallpaperTitle || theme.name)}</strong>
					{theme.generatedThemeName && <span>{theme.generatedThemeName}</span>}
					<small>{theme.description || theme.name}</small>
				</div>
				<em className="bncm-generated-theme-type">{MEDIA_LABELS[theme.mediaType || "unknown"]}</em>
				<i style={{ background: theme.palette.accent }} />
			</button>)}
		</div>}
		{themes.length > 0 && !visible.length && <p>没有匹配的主题。</p>}
	</div>;
};

export const CommunityThemeGenerator: React.FC<Props> = ({ settings, onUpdate, onSettingsRefresh, onMessage }) => {
	const [rootPath, setRootPath] = React.useState("D:\\steam\\steamapps\\workshop\\content\\431960");
	const [resources, setResources] = React.useState<WallpaperResource[]>([]);
	const [scanning, setScanning] = React.useState(false);

	const generateFromImage = async (path: string, name: string, type: WallpaperResourceType = "image", mediaPath = "") => {
		try {
			onMessage(`正在分析 ${name}，请稍候…`);
			const palette = await extractPalette(await BetterNCM.fs.readFile(path));
			onUpdate({ themeId: "generated", palette, accent: palette.accent });
			await useCommunityWallpaper(path, name, { type, mediaPath });
			onSettingsRefresh(getCommunityThemeSettings());
			onMessage(`已根据《${name}》生成主题。原始 Wallpaper Engine 文件仍保留在本机。`);
		} catch (error) {
			onMessage(error instanceof Error ? error.message : "Wallpaper Engine 资源读取失败，请确认路径和权限。");
		}
	};

	const importBase16File = async () => {
		const path = await BetterNCM.app.openFileDialog("Base16 (*.json;*.yaml;*.yml)|*.json;*.yaml;*.yml", "");
		if (!path) return;
		try {
			const palette = parseBase16(await BetterNCM.fs.readFileText(path));
			if (!palette) throw new Error("未识别到 Base16 配置，请选择包含 base00-base0F 的 JSON/YAML 文件。");
			onUpdate({ themeId: "generated", palette, accent: palette.accent });
			onMessage("Base16 配色已转换为 BetterNCM 本地主题。");
		} catch (error) {
			onMessage(error instanceof Error ? error.message : "Base16 文件读取失败。");
		}
	};

	const chooseLocalImage = async () => {
		const path = await BetterNCM.app.openFileDialog("图片 (*.png;*.jpg;*.jpeg;*.webp)|*.png;*.jpg;*.jpeg;*.webp", "");
		if (path) await generateFromImage(path, path.split(/[\\/]/).pop() || "本地图片");
	};

	return <div className="bncm-theme-generator-stack">
		<CommunityGeneratedThemeLibrary settings={settings} onUpdate={onUpdate} onSettingsRefresh={onSettingsRefresh} onMessage={onMessage} />
		<div className="bncm-theme-generator">
			<p>也可以直接扫描 Wallpaper Engine Workshop。列表优先显示壁纸在 `project.json` 中的真实标题，不再显示无意义的 `preview.jpg`。</p>
			<div className="bncm-theme-generator-row">
				<input value={rootPath} onChange={(event) => setRootPath(event.target.value)} placeholder="Wallpaper Engine Workshop 路径" />
				<button type="button" disabled={scanning} onClick={async () => {
					setScanning(true);
					try {
						const found = await scanWallpaperEngine(rootPath);
						setResources(found);
						onMessage(found.length ? `找到 ${found.length} 个按壁纸标题标识的本地预览图。` : "没有找到常见图片格式。");
					} catch (error) {
						onMessage(error instanceof Error ? error.message : "扫描 Wallpaper Engine 失败。");
					} finally { setScanning(false); }
				}}>{scanning ? "扫描中…" : "扫描本地资源"}</button>
			</div>
			<div className="bncm-theme-generator-actions">
				<button type="button" onClick={() => void chooseLocalImage()}>选择本地图片并生成</button>
				<button type="button" onClick={() => void importBase16File()}>导入 Base16</button>
				{settings.wallpaperPath && <button type="button" onClick={() => { clearCommunityWallpaper(); onSettingsRefresh(getCommunityThemeSettings()); onMessage("已移除壁纸，保留生成的配色。"); }}>移除壁纸</button>}
			</div>
			{resources.length > 0 && <div className="bncm-theme-resource-list">{resources.slice(0, 120).map((resource) => <button className="bncm-theme-resource-card" key={resource.path} type="button" onClick={() => void generateFromImage(resource.path, resource.title || resource.name, resource.mediaType || "unknown", resource.contentPath || "")} title={resource.path}>
				<LocalWallpaperPreview path={resource.path} title={resource.title || resource.name} />
				<span className="bncm-theme-resource-scrim" />
				<strong>{resource.title || resource.name}</strong>
				<em>{MEDIA_LABELS[resource.mediaType || "unknown"]}</em>
			</button>)}</div>}
			{settings.palette && <div className="bncm-theme-palette-preview">{[settings.palette.background, settings.palette.surface, settings.palette.text, settings.palette.accent].map((color) => <span key={color} style={{ background: color }} title={color} />)}</div>}
		</div>
	</div>;
};
