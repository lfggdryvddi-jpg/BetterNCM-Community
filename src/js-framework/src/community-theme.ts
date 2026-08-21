import { fs as BetterNCMFs } from "./betterncm-api/fs";

export type CommunityThemeId = "default" | "midnight" | "aurora" | "glass" | "generated";
export type CommunityThemeSurface = "sidebar" | "topbar" | "main" | "player";
export type CommunityWallpaperType = "image" | "video" | "web" | "scene" | "unknown";

export interface CommunityThemeSettings {
	version: number;
	themeId: CommunityThemeId;
	intensity: number;
	blur: number;
	accent: string;
	customCss: string;
	customCssName: string;
	wallpaperPath: string;
	wallpaperName: string;
	wallpaperType: CommunityWallpaperType;
	wallpaperMediaPath: string;
	palette?: CommunityThemePalette;
}

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

export interface CommunityThemePreset {
	id: CommunityThemeId;
	name: string;
	description: string;
	preview: string;
	accent: string;
}

export interface CommunityThemeDiagnostics {
	sidebar: number;
	topbar: number;
	main: number;
	player: number;
}

export const COMMUNITY_THEME_STORAGE_KEY = "betterncm.community.theme";
export const COMMUNITY_THEME_SETTINGS_VERSION = 4;
export const COMMUNITY_CSS_MAX_BYTES = 512 * 1024;

export const COMMUNITY_THEME_PRESETS: CommunityThemePreset[] = [
	{
		id: "default",
		name: "网易云原色",
		description: "不改变网易云原始配色。",
		preview: "linear-gradient(135deg, #f9d768, #ec4141)",
		accent: "#ec4141",
	},
	{
		id: "midnight",
		name: "午夜深紫",
		description: "深色背景、紫色强调色和柔和卡片。",
		preview: "linear-gradient(135deg, #11131f, #7c3aed)",
		accent: "#8b5cf6",
	},
	{
		id: "aurora",
		name: "极光青蓝",
		description: "青蓝渐变，适合长时间使用。",
		preview: "linear-gradient(135deg, #082f49, #14b8a6)",
		accent: "#14b8a6",
	},
	{
		id: "glass",
		name: "玻璃玫瑰",
		description: "半透明面板、玫瑰强调色和背景模糊。",
		preview: "linear-gradient(135deg, #3b1028, #f43f5e)",
		accent: "#f43f5e",
	},
];

const DEFAULT_SETTINGS: CommunityThemeSettings = {
	version: COMMUNITY_THEME_SETTINGS_VERSION,
	themeId: "default",
	intensity: 82,
	blur: 16,
	accent: "#ec4141",
	customCss: "",
	customCssName: "",
	wallpaperPath: "",
	wallpaperName: "",
	wallpaperType: "unknown",
	wallpaperMediaPath: "",
};

const THEME_STYLE_ID = "betterncm-community-theme-style";
const CUSTOM_THEME_STYLE_ID = "betterncm-community-custom-theme-style";
const WALLPAPER_THEME_STYLE_ID = "betterncm-community-wallpaper-style";
const DYNAMIC_WALLPAPER_HOST_ID = "betterncm-community-dynamic-wallpaper";
const WALLPAPER_BACKGROUND_ATTRIBUTE = "data-bncm-community-wallpaper-background";
let communityWallpaperObjectUrl = "";
let communityDynamicWallpaper: { type: CommunityWallpaperType; url: string } | null = null;
const SURFACE_ATTRIBUTE = "data-bncm-community-surface";

const KNOWN_SURFACE_SELECTORS: Record<CommunityThemeSurface, string[]> = {
	sidebar: [
		".g-sd",
		'[class^="LeftScrollContainer_"]',
		'[class*="LeftScrollContainer_"]',
		'[class^="SideBar_"]',
		'[class*="SideBar_"]',
		'[class^="Sidebar_"]',
		'[class*="Sidebar_"]',
	],
	topbar: [
		".g-hd",
		'[class^="TopBar_"]',
		'[class*="TopBar_"]',
		'[class^="TitleBar_"]',
		'[class*="TitleBar_"]',
		'[class^="HeaderContainer_"]',
		'[class*="HeaderContainer_"]',
		'[class^="WindowOpBarContainer_"]',
		'[class*="WindowOpBarContainer_"]',
	],
	main: [
		".right-container",
		"section.g-mn:not(.better-ncm-manager)",
		'[class^="MainContainer_"]',
		'[class*="MainContainer_"]',
		'[class^="MainContent_"]',
		'[class*="MainContent_"]',
		'[class^="ContentContainer_"]',
	],
	player: [
		".m-playbar",
		"#page_pc_mini_bar",
		"footer.should-hide-under-vinyl-mode",
		".page-footer",
		'[class^="DefaultBarWrapper_"]',
		'[class*="DefaultBarWrapper_"]',
		'[class^="PlayerBar_"]',
		'[class*="PlayerBar_"]',
		'[class^="PlayBar_"]',
		'[class*="PlayBar_"]',
		'[class^="BottomBar_"]',
		'[class*="BottomBar_"]',
	],
};

const THEME_CSS = `
html[data-bncm-community-theme="midnight"],
html[data-bncm-community-theme="aurora"],
html[data-bncm-community-theme="glass"],
html[data-bncm-community-theme="generated"] {
	--bncm-community-text: #f8fafc;
	--bncm-community-muted: #cbd5e1;
	--bncm-community-border: rgba(255, 255, 255, 0.14);
	--bncm-community-shadow: 0 18px 50px rgba(0, 0, 0, 0.26);

	/* Override NCM 3.x skin tokens so text, icons and player controls stay readable. */
	--colorPrimary1: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorPrimary2: rgba(var(--bncm-community-accent-rgb), .9) !important;
	--colorPrimary3: rgba(var(--bncm-community-accent-rgb), .8) !important;
	--colorPrimary4: rgba(var(--bncm-community-accent-rgb), .6) !important;
	--colorPrimary5: rgba(var(--bncm-community-accent-rgb), .4) !important;
	--colorPrimary6: rgba(var(--bncm-community-accent-rgb), .3) !important;
	--colorPrimary7: rgba(var(--bncm-community-accent-rgb), .12) !important;
	--colorPrimary8: rgba(var(--bncm-community-accent-rgb), .08) !important;
	--colorBlack1: rgba(248, 250, 252, 1) !important;
	--colorBlack2: rgba(248, 250, 252, .92) !important;
	--colorBlack3: rgba(248, 250, 252, .84) !important;
	--colorBlack4: rgba(248, 250, 252, .76) !important;
	--colorBlack5: rgba(226, 232, 240, .68) !important;
	--colorBlack6: rgba(226, 232, 240, .58) !important;
	--colorBlack7: rgba(203, 213, 225, .48) !important;
	--colorBlack8: rgba(203, 213, 225, .38) !important;
	--colorBlack9: rgba(203, 213, 225, .3) !important;
	--colorBlack10: rgba(255, 255, 255, .14) !important;
	--colorBlack11: rgba(255, 255, 255, .09) !important;
	--colorBlack12: rgba(255, 255, 255, .05) !important;
	--colorSidebar1: rgba(248, 250, 252, 1) !important;
	--colorSidebar2: rgba(248, 250, 252, .78) !important;
	--colorSidebar3: rgba(226, 232, 240, .68) !important;
	--colorSidebar4: rgba(203, 213, 225, .5) !important;
	--colorSidebar5: rgba(255, 255, 255, .12) !important;
	--colorSidebar6: rgba(255, 255, 255, .07) !important;
	--colorSidebar7: rgba(var(--bncm-community-accent-rgb), .12) !important;
	--colorSidebar8: rgba(255, 255, 255, 1) !important;
	--colorSidebar9: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorSidebar10: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorBackground: var(--bncm-community-background) !important;
	--colorBackgroundWhite: var(--bncm-community-background) !important;
	--colorFunction1: rgba(226, 232, 240, .62) !important;
	--colorFunction2: rgba(255, 255, 255, .08) !important;
	--colorFunction3: rgba(var(--bncm-community-accent-rgb), .18) !important;
	--colorFunction4: rgba(var(--bncm-community-accent-rgb), .24) !important;
	--colorFunction5: rgba(255, 255, 255, .08) !important;
	--colorFunction6: rgba(var(--bncm-community-accent-rgb), .16) !important;
	--colorFunction7: rgba(var(--bncm-community-accent-rgb), .82) !important;
	--colorFunction8: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorFunction9: rgba(var(--bncm-community-accent-rgb), .12) !important;
	--colorFunction10: rgba(var(--bncm-community-accent-rgb), .16) !important;
	--colorFunction11: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorFunction12: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorFunction13: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorFunction14: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorSecondary1_1: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorSecondary1_2: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorSecondary2_3: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--colorSecondary4: rgba(var(--bncm-community-accent-rgb), 1) !important;
	--minibar-hover--mask-bg: linear-gradient(180deg, transparent, rgba(var(--bncm-community-accent-rgb), .12)) !important;
	color-scheme: dark;
}

html[data-bncm-community-theme="midnight"] {
	--bncm-community-background: #10111a;
	--bncm-community-background-gradient: linear-gradient(145deg, #10111a, #171329 54%, #0f172a);
	--bncm-community-sidebar: rgba(22, 20, 39, var(--bncm-community-opacity));
	--bncm-community-panel: rgba(31, 27, 54, var(--bncm-community-opacity));
}

html[data-bncm-community-theme="aurora"] {
	--bncm-community-background: #071923;
	--bncm-community-background-gradient: linear-gradient(145deg, #071923, #083344 52%, #082f49);
	--bncm-community-sidebar: rgba(7, 45, 62, var(--bncm-community-opacity));
	--bncm-community-panel: rgba(11, 70, 83, var(--bncm-community-opacity));
}

html[data-bncm-community-theme="glass"] {
	--bncm-community-background: #24111f;
	--bncm-community-background-gradient: linear-gradient(145deg, #24111f, #3b1028 52%, #29152b);
	--bncm-community-sidebar: rgba(53, 18, 47, var(--bncm-community-opacity));
	--bncm-community-panel: rgba(75, 24, 53, var(--bncm-community-opacity));
}

html[data-bncm-community-theme="generated"] {
	--bncm-community-background: var(--bncm-generated-background);
	--bncm-community-background-gradient: linear-gradient(145deg, var(--bncm-generated-background), var(--bncm-generated-surface) 52%, var(--bncm-generated-sidebar));
	--bncm-community-sidebar: var(--bncm-generated-sidebar);
	--bncm-community-panel: var(--bncm-generated-surface);
	--bncm-community-text: var(--bncm-generated-text);
	--bncm-community-muted: var(--bncm-generated-muted);
	--bncm-community-accent: var(--bncm-generated-accent);
	--bncm-community-border: color-mix(in srgb, var(--bncm-generated-text) 18%, transparent);
	--bncm-community-shadow: 0 18px 50px rgba(0, 0, 0, 0.26);
	color-scheme: dark;
}

html[data-bncm-community-wallpaper="true"] body,
html[data-bncm-community-wallpaper="true"] #app,
html[data-bncm-community-wallpaper="true"] #g_iframe {
	background-color: transparent !important;
	background-image: none !important;
}
/* QQ Music and NCM official skins both keep artwork in one dedicated background layer.
 * Clear every full-window native skin layer and render our media only once inside it. */
html[data-bncm-community-wallpaper="true"] [data-bncm-community-wallpaper-background="true"] {
	background: transparent !important;
	filter: none !important;
	opacity: 1 !important;
}

#${DYNAMIC_WALLPAPER_HOST_ID} {
	position: absolute;
	inset: 0;
	z-index: 0;
	overflow: hidden;
	pointer-events: none;
	background: var(--bncm-community-background, #111827);
}
#${DYNAMIC_WALLPAPER_HOST_ID} img,
#${DYNAMIC_WALLPAPER_HOST_ID} video,
#${DYNAMIC_WALLPAPER_HOST_ID} iframe {
	position: absolute;
	inset: 0;
	display: block;
	width: 100%;
	height: 100%;
	border: 0;
	object-fit: cover;
	object-position: center;
	background: transparent;
}
#${DYNAMIC_WALLPAPER_HOST_ID}::after {
	content: "";
	position: absolute;
	inset: 0;
	background:
		linear-gradient(90deg, rgba(0, 0, 0, .24), transparent 34%),
		linear-gradient(180deg, rgba(0, 0, 0, .14), transparent 24%, transparent 68%, rgba(0, 0, 0, .28)),
		linear-gradient(rgba(0, 0, 0, var(--bncm-community-wallpaper-overlay)), rgba(0, 0, 0, var(--bncm-community-wallpaper-overlay)));
	pointer-events: none;
}

html[data-bncm-community-theme="midnight"] body,
html[data-bncm-community-theme="aurora"] body,
html[data-bncm-community-theme="glass"] body,
html[data-bncm-community-theme="midnight"] #app,
html[data-bncm-community-theme="aurora"] #app,
html[data-bncm-community-theme="glass"] #app,
html[data-bncm-community-theme="midnight"] #g_iframe,
html[data-bncm-community-theme="aurora"] #g_iframe,
html[data-bncm-community-theme="glass"] #g_iframe {
	background-color: var(--bncm-community-background) !important;
	background-image: var(--bncm-community-background-gradient) !important;
	color: var(--bncm-community-text) !important;
}

html[data-bncm-community-theme="midnight"] [${SURFACE_ATTRIBUTE}="sidebar"],
html[data-bncm-community-theme="aurora"] [${SURFACE_ATTRIBUTE}="sidebar"],
html[data-bncm-community-theme="glass"] [${SURFACE_ATTRIBUTE}="sidebar"] {
	background: var(--bncm-community-sidebar) !important;
	background-image: none !important;
	border-color: var(--bncm-community-border) !important;
	color: var(--bncm-community-text) !important;
	backdrop-filter: blur(var(--bncm-community-blur));
}

html[data-bncm-community-theme="midnight"] [${SURFACE_ATTRIBUTE}="topbar"],
html[data-bncm-community-theme="aurora"] [${SURFACE_ATTRIBUTE}="topbar"],
html[data-bncm-community-theme="glass"] [${SURFACE_ATTRIBUTE}="topbar"],
html[data-bncm-community-theme="midnight"] [${SURFACE_ATTRIBUTE}="player"],
html[data-bncm-community-theme="aurora"] [${SURFACE_ATTRIBUTE}="player"],
html[data-bncm-community-theme="glass"] [${SURFACE_ATTRIBUTE}="player"] {
	background: var(--bncm-community-panel) !important;
	background-image: none !important;
	border-color: var(--bncm-community-border) !important;
	box-shadow: var(--bncm-community-shadow);
	color: var(--bncm-community-text) !important;
	backdrop-filter: blur(var(--bncm-community-blur));
}

html[data-bncm-community-theme="midnight"] [${SURFACE_ATTRIBUTE}="main"],
html[data-bncm-community-theme="aurora"] [${SURFACE_ATTRIBUTE}="main"],
html[data-bncm-community-theme="glass"] [${SURFACE_ATTRIBUTE}="main"] {
	background-color: var(--bncm-community-background) !important;
	background-image: var(--bncm-community-background-gradient) !important;
	color: var(--bncm-community-text) !important;
}

/* NCM 3.x rebuilds the mini player after startup. Keep stable selectors as a direct fallback. */
html[data-bncm-community-theme="midnight"] #page_pc_mini_bar,
html[data-bncm-community-theme="aurora"] #page_pc_mini_bar,
html[data-bncm-community-theme="glass"] #page_pc_mini_bar,
html[data-bncm-community-theme="midnight"] footer.should-hide-under-vinyl-mode,
html[data-bncm-community-theme="aurora"] footer.should-hide-under-vinyl-mode,
html[data-bncm-community-theme="glass"] footer.should-hide-under-vinyl-mode,
html[data-bncm-community-theme="midnight"] [class^="DefaultBarWrapper_"],
html[data-bncm-community-theme="aurora"] [class^="DefaultBarWrapper_"],
html[data-bncm-community-theme="glass"] [class^="DefaultBarWrapper_"],
html[data-bncm-community-theme="midnight"] [class*=" DefaultBarWrapper_"],
html[data-bncm-community-theme="aurora"] [class*=" DefaultBarWrapper_"],
html[data-bncm-community-theme="glass"] [class*=" DefaultBarWrapper_"] {
	background: var(--bncm-community-panel) !important;
	background-color: var(--bncm-community-panel) !important;
	background-image: none !important;
	border-color: var(--bncm-community-border) !important;
	box-shadow: var(--bncm-community-shadow);
	color: var(--bncm-community-text) !important;
	backdrop-filter: blur(var(--bncm-community-blur));
}

html[data-bncm-community-theme="midnight"] #page_pc_mini_bar::before,
html[data-bncm-community-theme="midnight"] #page_pc_mini_bar::after,
html[data-bncm-community-theme="aurora"] #page_pc_mini_bar::before,
html[data-bncm-community-theme="aurora"] #page_pc_mini_bar::after,
html[data-bncm-community-theme="glass"] #page_pc_mini_bar::before,
html[data-bncm-community-theme="glass"] #page_pc_mini_bar::after,
html[data-bncm-community-theme="midnight"] [class*="DefaultBarWrapper_"]::before,
html[data-bncm-community-theme="midnight"] [class*="DefaultBarWrapper_"]::after,
html[data-bncm-community-theme="aurora"] [class*="DefaultBarWrapper_"]::before,
html[data-bncm-community-theme="aurora"] [class*="DefaultBarWrapper_"]::after,
html[data-bncm-community-theme="glass"] [class*="DefaultBarWrapper_"]::before,
html[data-bncm-community-theme="glass"] [class*="DefaultBarWrapper_"]::after {
	background-image: none !important;
	border-color: var(--bncm-community-border) !important;
}

html[data-bncm-community-theme="midnight"] [${SURFACE_ATTRIBUTE}] a,
html[data-bncm-community-theme="aurora"] [${SURFACE_ATTRIBUTE}] a,
html[data-bncm-community-theme="glass"] [${SURFACE_ATTRIBUTE}] a,
html[data-bncm-community-theme="midnight"] [${SURFACE_ATTRIBUTE}] button,
html[data-bncm-community-theme="aurora"] [${SURFACE_ATTRIBUTE}] button,
html[data-bncm-community-theme="glass"] [${SURFACE_ATTRIBUTE}] button {
	color: inherit;
}

html[data-bncm-community-theme="midnight"] [class*="Card_"],
html[data-bncm-community-theme="aurora"] [class*="Card_"],
html[data-bncm-community-theme="glass"] [class*="Card_"],
html[data-bncm-community-theme="midnight"] .m-table,
html[data-bncm-community-theme="aurora"] .m-table,
html[data-bncm-community-theme="glass"] .m-table {
	border-color: var(--bncm-community-border) !important;
}

html[data-bncm-community-theme="midnight"] a:hover,
html[data-bncm-community-theme="aurora"] a:hover,
html[data-bncm-community-theme="glass"] a:hover,
html[data-bncm-community-theme="midnight"] [aria-selected="true"],
html[data-bncm-community-theme="aurora"] [aria-selected="true"],
html[data-bncm-community-theme="glass"] [aria-selected="true"],
html[data-bncm-community-theme="midnight"] [aria-current="page"],
html[data-bncm-community-theme="aurora"] [aria-current="page"],
html[data-bncm-community-theme="glass"] [aria-current="page"] {
	color: var(--bncm-community-accent) !important;
}

html[data-bncm-community-theme="midnight"] input[type="range"],
html[data-bncm-community-theme="aurora"] input[type="range"],
html[data-bncm-community-theme="glass"] input[type="range"] {
	accent-color: var(--bncm-community-accent);
}

html[data-bncm-community-theme="midnight"] .bncm-mgr,
html[data-bncm-community-theme="aurora"] .bncm-mgr,
html[data-bncm-community-theme="glass"] .bncm-mgr {
	background: var(--bncm-community-background-gradient) !important;
	color: var(--bncm-community-text) !important;
}

html[data-bncm-community-theme="midnight"] .bncm-mgr .cmd-button,
html[data-bncm-community-theme="aurora"] .bncm-mgr .cmd-button,
html[data-bncm-community-theme="glass"] .bncm-mgr .cmd-button {
	background: var(--bncm-community-accent-soft) !important;
	border-color: var(--bncm-community-border) !important;
	color: var(--bncm-community-text) !important;
}
`;

function isValidPalette(value: unknown): value is CommunityThemePalette {
	if (!value || typeof value !== "object") return false;
	return ["background", "sidebar", "surface", "surfaceElevated", "text", "muted", "accent", "danger", "success"].every((key) => /^#[0-9a-f]{6}$/i.test(String((value as Record<string, unknown>)[key] || "")));
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function markSurface(element: Element | null, surface: CommunityThemeSurface) {
	if (!(element instanceof HTMLElement)) return;
	if (element.closest(".better-ncm-manager")) return;
	element.setAttribute(SURFACE_ATTRIBUTE, surface);
}

function clearCommunitySurfaceMarks() {
	document.querySelectorAll(`[${SURFACE_ATTRIBUTE}]`).forEach((element) =>
		element.removeAttribute(SURFACE_ATTRIBUTE),
	);
}

function hasMarkedSurface(surface: CommunityThemeSurface) {
	return Boolean(document.querySelector(`[${SURFACE_ATTRIBUTE}="${surface}"]`));
}

function findNearestMatchingAncestor(
	start: HTMLElement | null,
	matches: (rect: DOMRect) => boolean,
) {
	let current = start;
	while (current && current !== document.body && current !== document.documentElement) {
		if (!current.closest(".better-ncm-manager") && matches(current.getBoundingClientRect())) {
			return current;
		}
		current = current.parentElement;
	}
	return null;
}

function markSurfaceAtPoint(
	surface: CommunityThemeSurface,
	x: number,
	y: number,
	matches: (rect: DOMRect) => boolean,
) {
	markSurface(
		findNearestMatchingAncestor(document.elementFromPoint(x, y) as HTMLElement | null, matches),
		surface,
	);
}

function markSurfaceFromAnchor(
	surface: CommunityThemeSurface,
	selector: string,
	matches: (rect: DOMRect) => boolean,
) {
	const anchor = document.querySelector(selector) as HTMLElement | null;
	markSurface(findNearestMatchingAncestor(anchor, matches), surface);
}

function markKnownSurfaceFallback(
	surface: CommunityThemeSurface,
	matches: (rect: DOMRect) => boolean,
) {
	if (hasMarkedSurface(surface)) return;
	const candidates = new Set<HTMLElement>();
	KNOWN_SURFACE_SELECTORS[surface].forEach((selector) => {
		document.querySelectorAll(selector).forEach((element) => {
			if (element instanceof HTMLElement && !element.closest(".better-ncm-manager")) candidates.add(element);
		});
	});
	const target = [...candidates]
		.map((element) => ({ element, rect: element.getBoundingClientRect() }))
		.filter(({ rect }) => matches(rect))
		.sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height)[0]?.element;
	markSurface(target || null, surface);
}

export function refreshCommunityThemeTargets() {
	clearCommunitySurfaceMarks();
	const width = document.documentElement.clientWidth;
	const height = document.documentElement.clientHeight;
	if (width < 400 || height < 300) return getCommunityThemeDiagnostics(false);

	markSurfaceAtPoint("sidebar", Math.min(120, width * 0.12), height * 0.48, (rect) =>
		rect.left < 12 && rect.width > 120 && rect.width < width * 0.42 && rect.height > height * 0.55,
	);
	markSurfaceAtPoint("topbar", width * 0.58, Math.min(48, height * 0.08), (rect) =>
		rect.top < 12 && rect.width > width * 0.48 && rect.height > 35 && rect.height < height * 0.24,
	);
	markSurfaceAtPoint("player", width * 0.58, Math.max(1, height - 36), (rect) =>
		rect.bottom > height - 12 && rect.width > width * 0.55 && rect.height > 45 && rect.height < height * 0.28,
	);
	markSurfaceAtPoint("main", width * 0.62, height * 0.48, (rect) =>
		rect.width > width * 0.42 && rect.height > height * 0.42,
	);

	markSurfaceFromAnchor("topbar", '.cmd-icon-setting, a[href="#/m/setting/"]', (rect) =>
		rect.top < 16 && rect.width > width * 0.55 && rect.height > 40 && rect.height < height * 0.28,
	);
	markSurfaceFromAnchor("player", '#btn_pc_minibar_play, [id*="minibar_play"]', (rect) =>
		rect.width > width * 0.58 && rect.height > 40 && rect.height < Math.min(240, height * 0.35),
	);
	markSurfaceFromAnchor("sidebar", "#left_nav_myFavoriteMusic", (rect) =>
		rect.left < 16 && rect.width > 120 && rect.width < width * 0.42 && rect.height > height * 0.5,
	);

	markKnownSurfaceFallback("sidebar", (rect) =>
		rect.left < 16 && rect.width > 120 && rect.width < width * 0.42 && rect.height > height * 0.5,
	);
	markKnownSurfaceFallback("topbar", (rect) =>
		rect.top < 16 && rect.width > width * 0.48 && rect.height > 35 && rect.height < height * 0.28,
	);
	markKnownSurfaceFallback("player", (rect) =>
		rect.bottom > height - 12 && rect.width > width * 0.55 && rect.height > 40 && rect.height < Math.min(240, height * 0.35),
	);
	markKnownSurfaceFallback("main", (rect) =>
		rect.left > width * 0.12 && rect.width > width * 0.42 && rect.height > height * 0.42,
	);

	markCommunityWallpaperBackground();
	ensureCommunityDynamicWallpaperHost();
	return getCommunityThemeDiagnostics(false);
}

export function getCommunityThemeDiagnostics(refresh = true): CommunityThemeDiagnostics {
	if (refresh) refreshCommunityThemeTargets();
	return {
		sidebar: document.querySelectorAll(`[${SURFACE_ATTRIBUTE}="sidebar"]`).length,
		topbar: document.querySelectorAll(`[${SURFACE_ATTRIBUTE}="topbar"]`).length,
		main: document.querySelectorAll(`[${SURFACE_ATTRIBUTE}="main"]`).length,
		player: document.querySelectorAll(`[${SURFACE_ATTRIBUTE}="player"]`).length,
	};
}

export function validateCommunityCss(css: string): string | null {
	if (new Blob([css]).size > COMMUNITY_CSS_MAX_BYTES) {
		return "CSS 文件超过 512 KB，已拒绝导入。";
	}
	const unsafeRules: Array<[RegExp, string]> = [
		[/@import\s/i, "不允许使用 @import 远程导入。"],
		[/url\(\s*["']?\s*(?:https?:|\/\/)/i, "不允许加载远程 URL 资源。"],
		[/javascript\s*:/i, "检测到不安全的 javascript: 内容。"],
		[/expression\s*\(/i, "检测到不安全的 CSS expression。"],
		[/\bbehavior\s*:/i, "检测到不安全的 behavior 属性。"],
		[/-moz-binding\s*:/i, "检测到不安全的绑定属性。"],
	];
	return unsafeRules.find(([pattern]) => pattern.test(css))?.[1] || null;
}

export function getCommunityThemeSettings(): CommunityThemeSettings {
	try {
		const stored = JSON.parse(
			localStorage.getItem(COMMUNITY_THEME_STORAGE_KEY) || "{}",
		) as Partial<CommunityThemeSettings>;
		const themeId: CommunityThemeId =
			stored.themeId === "midnight" ||
			stored.themeId === "aurora" ||
			stored.themeId === "glass" ||
			stored.themeId === "generated"
				? stored.themeId
				: "default";
		const storedAccent =
			typeof stored.accent === "string" && /^#[0-9a-f]{6}$/i.test(stored.accent)
				? stored.accent
				: undefined;
		const presetAccent =
			COMMUNITY_THEME_PRESETS.find((preset) => preset.id === themeId)?.accent ||
			(stored.palette && typeof stored.palette === "object" && typeof stored.palette.accent === "string" ? stored.palette.accent : DEFAULT_SETTINGS.accent);
		const accent =
			stored.version === COMMUNITY_THEME_SETTINGS_VERSION ||
			storedAccent?.toLowerCase() !== "#8b5cf6"
				? storedAccent || presetAccent
				: presetAccent;
		return {
			version: COMMUNITY_THEME_SETTINGS_VERSION,
			themeId,
			intensity: clamp(Number(stored.intensity ?? DEFAULT_SETTINGS.intensity), 20, 100),
			blur: clamp(Number(stored.blur ?? DEFAULT_SETTINGS.blur), 0, 36),
			accent,
			customCss: typeof stored.customCss === "string" && !(themeId === "generated" && /BetterNCM Community generated skin:/i.test(stored.customCss)) ? stored.customCss : "",
			customCssName: typeof stored.customCssName === "string" ? stored.customCssName : "",
			wallpaperPath: typeof stored.wallpaperPath === "string" ? stored.wallpaperPath : "",
			wallpaperName: typeof stored.wallpaperName === "string" ? stored.wallpaperName : "",
			wallpaperType: stored.wallpaperType === "video" || stored.wallpaperType === "web" || stored.wallpaperType === "scene" || stored.wallpaperType === "image" ? stored.wallpaperType : "unknown",
			wallpaperMediaPath: typeof stored.wallpaperMediaPath === "string" ? stored.wallpaperMediaPath : "",
			palette: isValidPalette(stored.palette) ? stored.palette : undefined,
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveCommunityThemeSettings(settings: CommunityThemeSettings) {
	const normalized = { ...settings, version: COMMUNITY_THEME_SETTINGS_VERSION };
	localStorage.setItem(COMMUNITY_THEME_STORAGE_KEY, JSON.stringify(normalized));
	applyCommunityTheme(normalized);
}

export function setCommunityWallpaperUrl(url: string) {
	const root = document.documentElement;
	const normalizedUrl = url.trim();
	if (normalizedUrl) {
		root.style.setProperty("--bncm-community-wallpaper", `url(${JSON.stringify(normalizedUrl)})`);
		root.dataset.bncmCommunityWallpaper = "true";
	} else {
		root.style.removeProperty("--bncm-community-wallpaper");
		delete root.dataset.bncmCommunityWallpaper;
	}
}

async function loadCommunityWallpaper(path: string) {
	const blob = await BetterNCMFs.readFile(path);
	if (!blob.size) throw new Error("壁纸文件为空或无法读取。");
	const url = URL.createObjectURL(blob);
	try {
		const image = new Image();
		image.decoding = "async";
		image.src = url;
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("壁纸图片无法解码。"));
		});
	} catch (error) {
		URL.revokeObjectURL(url);
		throw error;
	}
	const previousUrl = communityWallpaperObjectUrl;
	communityWallpaperObjectUrl = url;
	setCommunityWallpaperUrl(url);
	communityDynamicWallpaper = { type: "image", url };
	document.documentElement.dataset.bncmCommunityWallpaperDynamic = "image";
	ensureCommunityDynamicWallpaperHost();
	if (previousUrl) URL.revokeObjectURL(previousUrl);
	return url;
}

function markCommunityWallpaperBackground() {
	const candidates = [...document.querySelectorAll('[class*="StyledBackground"]')] as HTMLElement[];
	for (const element of [...document.querySelectorAll(`[${WALLPAPER_BACKGROUND_ATTRIBUTE}]`)]) {
		(element as HTMLElement).removeAttribute(WALLPAPER_BACKGROUND_ATTRIBUTE);
	}
	const width = document.documentElement.clientWidth;
	const height = document.documentElement.clientHeight;
	const fullWindowLayers = candidates
		.map((element) => ({ element, rect: element.getBoundingClientRect() }))
		.filter(({ rect }) => rect.width > width * .65 && rect.height > height * .65)
		.sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
	fullWindowLayers.forEach(({ element }) => element.setAttribute(WALLPAPER_BACKGROUND_ATTRIBUTE, "true"));
	return fullWindowLayers[0]?.element || null;
}

function removeCommunityDynamicWallpaper() {
	document.getElementById(DYNAMIC_WALLPAPER_HOST_ID)?.remove();
	communityDynamicWallpaper = null;
	delete document.documentElement.dataset.bncmCommunityWallpaperDynamic;
}

function ensureCommunityDynamicWallpaperHost() {
	if (!communityDynamicWallpaper) return;
	const target = markCommunityWallpaperBackground();
	if (!target) return;
	let host = document.getElementById(DYNAMIC_WALLPAPER_HOST_ID) as HTMLDivElement | null;
	if (host && host.parentElement !== target) host.remove();
	if (!host) {
		host = document.createElement("div");
		host.id = DYNAMIC_WALLPAPER_HOST_ID;
		target.appendChild(host);
	}
	if (host.dataset.source === communityDynamicWallpaper.url && host.dataset.type === communityDynamicWallpaper.type) return;
	host.replaceChildren();
	host.dataset.source = communityDynamicWallpaper.url;
	host.dataset.type = communityDynamicWallpaper.type;
	if (communityDynamicWallpaper.type === "video") {
		const video = document.createElement("video");
		video.src = communityDynamicWallpaper.url;
		video.autoplay = true;
		video.loop = true;
		video.muted = true;
		video.playsInline = true;
		video.preload = "auto";
		host.appendChild(video);
		void video.play().catch(() => undefined);
	} else if (communityDynamicWallpaper.type === "web") {
		const frame = document.createElement("iframe");
		frame.src = communityDynamicWallpaper.url;
		frame.title = "Wallpaper Engine Web background";
		frame.referrerPolicy = "no-referrer";
		frame.setAttribute("sandbox", "allow-scripts");
		frame.tabIndex = -1;
		host.appendChild(frame);
	} else {
		const image = document.createElement("img");
		image.src = communityDynamicWallpaper.url;
		image.alt = "";
		image.decoding = "async";
		host.appendChild(image);
	}
}

function relativePath(root: string, target: string) {
	const normalizedRoot = root.replace(/[\\/]+$/, "");
	return target.toLowerCase().startsWith(normalizedRoot.toLowerCase()) ? target.slice(normalizedRoot.length).replace(/^[\\/]+/, "") : target.split(/[\\/]/).pop() || "";
}

async function detectCommunityWallpaperMedia(previewPath: string) {
	const projectRoot = previewPath.replace(/[\\/][^\\/]+$/, "");
	try {
		const metadata = JSON.parse(await BetterNCMFs.readFileText(`${projectRoot}\\project.json`)) as { type?: string; file?: string };
		const normalized = String(metadata.type || "").trim().toLowerCase();
		const type: CommunityWallpaperType = normalized === "video" || normalized === "web" || normalized === "scene" || normalized === "image" ? normalized : "unknown";
		return { type, mediaPath: metadata.file?.trim() ? `${projectRoot}\\${metadata.file.trim()}` : "" };
	} catch {
		return { type: "unknown" as CommunityWallpaperType, mediaPath: "" };
	}
}

async function mountCommunityDynamicWallpaper(previewPath: string, type: CommunityWallpaperType, mediaPath: string) {
	if (!mediaPath || (type !== "video" && type !== "web")) {
		if (communityDynamicWallpaper) {
			communityDynamicWallpaper.type = type === "scene" ? "scene" : "image";
			document.documentElement.dataset.bncmCommunityWallpaperDynamic = communityDynamicWallpaper.type;
			ensureCommunityDynamicWallpaperHost();
		}
		return;
	}
	let url = "";
	if (type === "video") {
		url = await BetterNCMFs.mountFile(mediaPath);
	} else {
		const projectRoot = previewPath.replace(/[\\/][^\\/]+$/, "");
		const mountedRoot = (await BetterNCMFs.mountDir(projectRoot)).replace(/[\\/]+$/, "");
		const entry = relativePath(projectRoot, mediaPath).split(/[\\/]/).map(encodeURIComponent).join("/");
		url = `${mountedRoot}/${entry}`;
	}
	removeCommunityDynamicWallpaper();
	communityDynamicWallpaper = { type, url };
	document.documentElement.dataset.bncmCommunityWallpaperDynamic = type;
	ensureCommunityDynamicWallpaperHost();
}

export async function useCommunityWallpaper(
	path: string,
	name: string,
	options: { type?: CommunityWallpaperType; mediaPath?: string } = {},
) {
	const url = await loadCommunityWallpaper(path);
	const settings = getCommunityThemeSettings();
	let wallpaperType = options.type || settings.wallpaperType || "unknown";
	let wallpaperMediaPath = options.mediaPath || settings.wallpaperMediaPath || "";
	if (wallpaperType === "unknown" || !wallpaperMediaPath) {
		const detected = await detectCommunityWallpaperMedia(path);
		if (wallpaperType === "unknown") wallpaperType = detected.type;
		if (!wallpaperMediaPath) wallpaperMediaPath = detected.mediaPath;
	}
	saveCommunityThemeSettings({ ...settings, wallpaperPath: path, wallpaperName: name, wallpaperType, wallpaperMediaPath });
	try {
		await mountCommunityDynamicWallpaper(path, wallpaperType, wallpaperMediaPath);
	} catch {
		removeCommunityDynamicWallpaper();
	}
	return url;
}

export function clearCommunityWallpaper() {
	const settings = getCommunityThemeSettings();
	setCommunityWallpaperUrl("");
	removeCommunityDynamicWallpaper();
	if (communityWallpaperObjectUrl) URL.revokeObjectURL(communityWallpaperObjectUrl);
	communityWallpaperObjectUrl = "";
	saveCommunityThemeSettings({ ...settings, wallpaperPath: "", wallpaperName: "", wallpaperType: "unknown", wallpaperMediaPath: "" });
}

export function resetCommunityTheme() {
	setCommunityWallpaperUrl("");
	removeCommunityDynamicWallpaper();
	if (communityWallpaperObjectUrl) URL.revokeObjectURL(communityWallpaperObjectUrl);
	communityWallpaperObjectUrl = "";
	localStorage.removeItem(COMMUNITY_THEME_STORAGE_KEY);
	applyCommunityTheme(DEFAULT_SETTINGS);
}

function hexToRgb(hex: string) {
	const value = Number.parseInt(hex.slice(1), 16);
	return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

export function applyCommunityTheme(settings: CommunityThemeSettings) {
	const root = document.documentElement;
	root.dataset.bncmCommunityTheme = settings.themeId;
	root.style.setProperty("--bncm-community-opacity", String(settings.intensity / 100));
	root.style.setProperty("--bncm-community-blur", `${settings.blur}px`);
	root.style.setProperty("--bncm-community-accent", settings.accent);
	root.style.setProperty("--bncm-community-accent-rgb", hexToRgb(settings.accent));
	root.style.setProperty(
		"--bncm-community-accent-soft",
		`rgba(${hexToRgb(settings.accent)}, 0.18)`,
	);

	let style = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
	if (!style) {
		style = document.createElement("style");
		style.id = THEME_STYLE_ID;
		document.head.appendChild(style);
	}
	const accentRgb = hexToRgb(settings.accent);
	const palette = settings.palette;
	const paletteCss = palette ? `html[data-bncm-community-theme="generated"] {
		--bncm-generated-background: ${palette.background};
		--bncm-generated-sidebar: ${palette.sidebar};
		--bncm-generated-surface: ${palette.surface};
		--bncm-generated-surface-elevated: ${palette.surfaceElevated};
		--bncm-generated-text: ${palette.text};
		--bncm-generated-muted: ${palette.muted};
		--bncm-generated-accent: ${palette.accent};
	}` : "";
	const normalizedOpacity = clamp(settings.intensity, 20, 100) / 100;
	const runtimeCss = `html[data-bncm-community-theme] {
		--bncm-community-opacity: ${normalizedOpacity};
		--bncm-community-main-opacity: ${Math.min(0.62, normalizedOpacity * 0.58)};
		--bncm-community-sidebar-opacity: ${Math.min(0.78, normalizedOpacity * 0.72)};
		--bncm-community-card-opacity: ${Math.min(0.6, normalizedOpacity * 0.4)};
		--bncm-community-blur: ${clamp(settings.blur, 0, 36)}px;
		--bncm-community-accent: ${settings.accent};
		--bncm-community-accent-rgb: ${accentRgb};
		--bncm-community-accent-soft: rgba(${accentRgb}, 0.18);
		--bncm-community-wallpaper-overlay: ${Math.min(0.3, Math.max(0.06, normalizedOpacity * 0.22))};
	}`;
	style.textContent = `${runtimeCss}
${paletteCss}
${THEME_CSS}`;

	let customStyle = document.getElementById(
		CUSTOM_THEME_STYLE_ID,
	) as HTMLStyleElement | null;
	if (!customStyle) {
		customStyle = document.createElement("style");
		customStyle.id = CUSTOM_THEME_STYLE_ID;
		document.head.appendChild(customStyle);
	}
	customStyle.textContent = settings.themeId === "generated" && /BetterNCM Community generated skin:/i.test(settings.customCss) ? "" : settings.customCss;

	let wallpaperStyle = document.getElementById(WALLPAPER_THEME_STYLE_ID) as HTMLStyleElement | null;
	if (!wallpaperStyle) {
		wallpaperStyle = document.createElement("style");
		wallpaperStyle.id = WALLPAPER_THEME_STYLE_ID;
		document.head.appendChild(wallpaperStyle);
	}
	const shellPalette = palette || {
		background: "#111827",
		sidebar: "#0f172a",
		surface: "#1f2937",
		surfaceElevated: "#334155",
		text: "#f8fafc",
		muted: "#cbd5e1",
		accent: settings.accent,
		danger: "#fb7185",
		success: "#34d399",
	};
	wallpaperStyle.textContent = `
html[data-bncm-community-wallpaper="true"] {
	--colorBlack1: rgba(248, 250, 252, 1) !important;
	--colorBlack2: rgba(248, 250, 252, .92) !important;
	--colorBlack3: rgba(248, 250, 252, .84) !important;
	--colorBlack4: rgba(248, 250, 252, .74) !important;
	--colorBlack5: rgba(226, 232, 240, .64) !important;
	--colorBlack6: rgba(226, 232, 240, .54) !important;
	--colorBlack7: rgba(203, 213, 225, .44) !important;
	--colorBlack8: rgba(203, 213, 225, .34) !important;
	--colorBlack9: rgba(203, 213, 225, .26) !important;
	--colorBlack10: rgba(255, 255, 255, .14) !important;
	--colorBlack11: rgba(255, 255, 255, .09) !important;
	--colorBlack12: rgba(255, 255, 255, .05) !important;
	--colorSidebar1: rgba(248, 250, 252, 1) !important;
	--colorSidebar2: rgba(248, 250, 252, .78) !important;
	--colorSidebar3: rgba(226, 232, 240, .68) !important;
	--colorSidebar4: rgba(203, 213, 225, .5) !important;
	--colorSidebar5: rgba(255, 255, 255, .12) !important;
	--colorSidebar6: rgba(255, 255, 255, .07) !important;
	--colorBackground: transparent !important;
	--colorBackgroundWhite: transparent !important;
	--colorFunction1: rgba(226, 232, 240, .62) !important;
	--colorFunction2: rgba(255, 255, 255, .08) !important;
	color-scheme: dark;
}
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="sidebar"] {
	background: linear-gradient(180deg, rgba(${hexToRgb(shellPalette.sidebar)}, var(--bncm-community-sidebar-opacity)), rgba(${hexToRgb(shellPalette.background)}, var(--bncm-community-main-opacity))) !important;
	border-right: 1px solid rgba(255, 255, 255, .1) !important;
	backdrop-filter: blur(var(--bncm-community-blur)) saturate(1.08) !important;
}
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="topbar"] {
	background: linear-gradient(180deg, rgba(${hexToRgb(shellPalette.surface)}, var(--bncm-community-sidebar-opacity)), rgba(${hexToRgb(shellPalette.background)}, var(--bncm-community-main-opacity))) !important;
	border-bottom: 1px solid rgba(255, 255, 255, .1) !important;
	backdrop-filter: blur(var(--bncm-community-blur)) saturate(1.08) !important;
}
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="player"] {
	background: linear-gradient(180deg, rgba(${hexToRgb(shellPalette.surface)}, var(--bncm-community-main-opacity)), rgba(${hexToRgb(shellPalette.sidebar)}, var(--bncm-community-sidebar-opacity))) !important;
	border-top: 1px solid rgba(255, 255, 255, .12) !important;
	box-shadow: 0 -12px 30px rgba(0, 0, 0, .12) !important;
	backdrop-filter: blur(var(--bncm-community-blur)) saturate(1.08) !important;
}
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="main"] {
	background: linear-gradient(180deg, rgba(${hexToRgb(shellPalette.background)}, var(--bncm-community-main-opacity)), rgba(${hexToRgb(shellPalette.background)}, .12)) !important;
	backdrop-filter: blur(var(--bncm-community-blur)) saturate(1.04) !important;
}
html[data-bncm-community-wallpaper="true"] .m-table,
html[data-bncm-community-wallpaper="true"] .bncm-mgr {
	background-color: rgba(${hexToRgb(shellPalette.surface)}, var(--bncm-community-card-opacity)) !important;
	backdrop-filter: blur(var(--bncm-community-blur));
}
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="main"] img,
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="main"] picture,
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="main"] video,
html[data-bncm-community-wallpaper="true"] [${SURFACE_ATTRIBUTE}="main"] canvas {
	opacity: 1 !important;
	visibility: visible !important;
	filter: none !important;
	mix-blend-mode: normal !important;
}
`;

	requestAnimationFrame(() => refreshCommunityThemeTargets());
}

let surfaceRefreshTimer = 0;
let surfaceObserver: MutationObserver | null = null;

function scheduleCommunityThemeTargetRefresh() {
	window.clearTimeout(surfaceRefreshTimer);
	surfaceRefreshTimer = window.setTimeout(() => {
		refreshCommunityThemeTargets();
	}, 120);
}

function observeCommunityThemeTargets() {
	if (surfaceObserver || !document.body) return;
	surfaceObserver = new MutationObserver(scheduleCommunityThemeTargetRefresh);
	surfaceObserver.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

async function restoreCommunityWallpaper() {
	const settings = getCommunityThemeSettings();
	if (!settings.wallpaperPath) return;
	try {
		await loadCommunityWallpaper(settings.wallpaperPath);
		let wallpaperType = settings.wallpaperType;
		let wallpaperMediaPath = settings.wallpaperMediaPath;
		if (wallpaperType === "unknown" || !wallpaperMediaPath) {
			const detected = await detectCommunityWallpaperMedia(settings.wallpaperPath);
			if (wallpaperType === "unknown") wallpaperType = detected.type;
			if (!wallpaperMediaPath) wallpaperMediaPath = detected.mediaPath;
			if (wallpaperType !== settings.wallpaperType || wallpaperMediaPath !== settings.wallpaperMediaPath) {
				localStorage.setItem(COMMUNITY_THEME_STORAGE_KEY, JSON.stringify({ ...settings, version: COMMUNITY_THEME_SETTINGS_VERSION, wallpaperType, wallpaperMediaPath }));
			}
		}
		await mountCommunityDynamicWallpaper(settings.wallpaperPath, wallpaperType, wallpaperMediaPath);
	} catch {
		setCommunityWallpaperUrl("");
		removeCommunityDynamicWallpaper();
	}
}

function initializeCommunityTheme() {
	const settings = getCommunityThemeSettings();
	applyCommunityTheme(settings);
	void restoreCommunityWallpaper();
	setTimeout(refreshCommunityThemeTargets, 800);
	setTimeout(refreshCommunityThemeTargets, 2000);
	observeCommunityThemeTargets();
	window.addEventListener("resize", scheduleCommunityThemeTargetRefresh);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeCommunityTheme, {
		once: true,
	});
} else {
	initializeCommunityTheme();
}
