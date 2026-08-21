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
const COMMUNITY_THEME_SURFACES: CommunityThemeSurface[] = ["sidebar", "topbar", "main", "player"];
const markedSurfaces: Partial<Record<CommunityThemeSurface, HTMLElement>> = {};
let markedWallpaperBackgrounds = new Set<HTMLElement>();

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
html[data-bncm-community-theme="glass"] [${SURFACE_ATTRIBUTE}="sidebar"],
html[data-bncm-community-theme="generated"] [${SURFACE_ATTRIBUTE}="sidebar"] {
	background: var(--bncm-community-sidebar) !important;
	background-image: none !important;
	border-color: var(--bncm-community-border) !important;
	box-shadow: inset -1px 0 0 rgba(255, 255, 255, .06) !important;
	color: var(--bncm-community-text) !important;
	backdrop-filter: blur(var(--bncm-community-blur));
}

/* Keep the sidebar selection visibly owned by the community theme instead of
 * inheriting the active color block from the currently selected NCM skin. */
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"] .show-bottom-border.first-group[class*="NavItemContainer_"] {
	margin: 5px 8px 17px;
	padding: 6px !important;
	border: 1px solid rgba(255, 255, 255, .09) !important;
	border-radius: 16px;
	background: linear-gradient(160deg, rgba(255, 255, 255, .055), rgba(255, 255, 255, .015)) !important;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, .06),
		0 12px 28px rgba(0, 0, 0, .08) !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"] [class*="ItemContainer_"] {
	border-radius: 11px;
	transition: background .16s ease, box-shadow .16s ease, color .16s ease, transform .16s ease;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"] [class*="ItemContainer_"]:not(.is-selected):not(.selected):hover {
	background: var(--bncm-community-control-hover) !important;
	box-shadow: inset 0 0 0 1px rgba(var(--bncm-community-accent-alt-rgb), .12) !important;
	transform: translateX(2px);
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"] [data-testid^="tid_navitem_"][class*="ItemContainer_"]:is(.is-selected, .selected) {
	background: var(--bncm-community-selection-gradient) !important;
	box-shadow:
		inset 2px 0 0 var(--bncm-community-accent-alt),
		inset 0 0 0 1px rgba(var(--bncm-community-accent-alt-rgb), .18),
		0 8px 22px rgba(0, 0, 0, .12) !important;
	color: var(--bncm-community-text) !important;
	font-weight: 600;
}

/* Playlist rows render their skin color on a dedicated .background child. */
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"] .selected > .background {
	background: var(--bncm-community-selection-gradient) !important;
	box-shadow:
		inset 2px 0 0 var(--bncm-community-accent-alt),
		inset 0 0 0 1px rgba(var(--bncm-community-accent-alt-rgb), .18),
		0 7px 18px rgba(0, 0, 0, .12) !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"] [data-testid^="tid_navitem_"]:is(.is-selected, .selected) [class*="IconWrapper_"] {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	margin-left: -3px;
	border-radius: 9px;
	background: var(--bncm-community-control-gradient) !important;
	box-shadow: 0 5px 14px rgba(var(--bncm-community-accent-rgb), .2);
	color: #fff !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"]::-webkit-scrollbar {
	width: 6px;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [${SURFACE_ATTRIBUTE}="sidebar"]::-webkit-scrollbar-thumb {
	border: 1px solid transparent;
	border-radius: 999px;
	background: linear-gradient(rgba(var(--bncm-community-accent-rgb), .58), rgba(var(--bncm-community-accent-alt-rgb), .48)) padding-box;
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
/* Primary content actions and active tabs should not fall back to the NCM skin accent. */
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [data-testid="tid_playlist_playall_btn"] {
	background: var(--bncm-community-control-gradient) !important;
	border: 1px solid rgba(255, 255, 255, .24) !important;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, .28),
		0 8px 22px rgba(var(--bncm-community-accent-alt-rgb), .24) !important;
	color: #fff !important;
	transition: filter .16s ease, transform .16s ease, box-shadow .16s ease !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [data-testid="tid_playlist_playall_btn"]:hover {
	filter: saturate(1.06) brightness(1.06);
	transform: translateY(-1px);
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [data-testid="tid_playlist_playall_btn"]:active {
	filter: saturate(.96) brightness(.96);
	transform: scale(.98);
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) .cmd-tabs-tab-active {
	position: relative;
	color: var(--bncm-community-text) !important;
	font-weight: 650;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) .cmd-tabs-tab-active::after {
	content: "";
	position: absolute;
	left: 14%;
	right: 14%;
	bottom: -6px;
	height: 3px;
	border-radius: 999px;
	background: var(--bncm-community-control-gradient) !important;
	box-shadow: 0 0 7px rgba(var(--bncm-community-accent-alt-rgb), .38);
	pointer-events: none;
}

/* Player controls use a two-tone identity derived from the active community skin. */
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #btn_pc_minibar_play,
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [data-testid="tid_playbar_play_btn"] {
	background: var(--bncm-community-control-gradient) !important;
	border: 1px solid rgba(255, 255, 255, .26) !important;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, .3),
		0 8px 24px rgba(var(--bncm-community-accent-rgb), .28) !important;
	color: #fff !important;
	transition: transform .16s ease, box-shadow .16s ease, filter .16s ease !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #btn_pc_minibar_play:hover,
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [data-testid="tid_playbar_play_btn"]:hover {
	filter: saturate(1.08) brightness(1.06);
	transform: translateY(-1px) scale(1.045);
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #btn_pc_minibar_play:active,
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) [data-testid="tid_playbar_play_btn"]:active {
	filter: saturate(.96) brightness(.96);
	transform: scale(.96);
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar .cmd-button:not(#btn_pc_minibar_play):not([data-testid="tid_playbar_play_btn"]) {
	border-radius: 10px;
	transition: background .15s ease, box-shadow .15s ease, color .15s ease, transform .15s ease;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar .cmd-button:not(#btn_pc_minibar_play):not([data-testid="tid_playbar_play_btn"]):hover {
	background: var(--bncm-community-control-hover) !important;
	box-shadow: inset 0 0 0 1px rgba(var(--bncm-community-accent-alt-rgb), .16) !important;
	color: var(--bncm-community-text) !important;
	transform: translateY(-1px);
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar .cmd-button:not(#btn_pc_minibar_play):not([data-testid="tid_playbar_play_btn"]):active {
	transform: scale(.96);
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar [class*="TagStyle_"] {
	border-color: rgba(var(--bncm-community-accent-alt-rgb), .38) !important;
	background: linear-gradient(135deg, rgba(var(--bncm-community-accent-rgb), .1), rgba(var(--bncm-community-accent-alt-rgb), .055)) !important;
	color: var(--bncm-community-muted) !important;
	transition: border-color .15s ease, background .15s ease, color .15s ease;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar [class*="TagStyle_"]:hover {
	border-color: rgba(var(--bncm-community-accent-alt-rgb), .68) !important;
	background: var(--bncm-community-control-hover) !important;
	color: var(--bncm-community-text) !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar [aria-label="播放进度调节"] {
	--track-color: linear-gradient(90deg, var(--bncm-community-accent-alt) 0%, var(--bncm-community-accent) 100%) !important;
	--smigcsb-3: rgba(var(--bncm-community-accent-rgb), .9) !important;
	--smigcsb-6: rgba(10, 14, 22, .5) !important;
	--smigcsb-7: rgba(10, 14, 22, .5) !important;
}

/* Separate elapsed and remaining time even when NCM reports the whole track as cached. */
html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar [aria-label="播放进度调节"] > .cache {
	height: 4px !important;
	border-radius: 999px;
	background: rgba(10, 14, 22, .5) !important;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, .09),
		0 0 0 1px rgba(0, 0, 0, .12) !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar [aria-label="播放进度调节"] > .track {
	height: 4px !important;
	border-radius: 999px;
	background: var(--bncm-community-control-gradient) !important;
	box-shadow:
		0 0 7px rgba(var(--bncm-community-accent-alt-rgb), .46),
		0 0 2px rgba(255, 255, 255, .5) !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar [aria-label="播放进度调节"] > .thumb {
	z-index: 3;
	opacity: 1 !important;
	visibility: visible !important;
	filter: none !important;
}

html[data-bncm-community-theme]:not([data-bncm-community-theme="default"]) #page_pc_mini_bar [aria-label="播放进度调节"] > .thumb::before {
	content: "";
	position: absolute;
	left: -6px;
	top: -6px;
	width: 9px;
	height: 9px;
	border: 2px solid var(--bncm-community-accent-alt);
	border-radius: 50%;
	background: #fff;
	box-shadow:
		0 0 0 2px rgba(var(--bncm-community-accent-alt-rgb), .16),
		0 0 9px rgba(var(--bncm-community-accent-alt-rgb), .58);
	pointer-events: none;
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

function surfaceMatchesViewport(
	surface: CommunityThemeSurface,
	rect: DOMRect,
	width: number,
	height: number,
) {
	switch (surface) {
		case "sidebar":
			// Reject the very tall draggable list content. Applying backdrop-filter
			// to that 10k+ px layer creates a stale dark edge while pages transition.
			// The actual LeftScrollContainer is a viewport-sized, clipped scroller.
			return rect.left < 16 &&
				rect.top >= 0 && rect.top < height * .2 &&
				rect.right < width * .45 &&
				rect.bottom > height * .78 && rect.bottom <= height + 12 &&
				rect.width > 120 && rect.width < width * .42 &&
				rect.height > height * .5 && rect.height < height * 1.05;
		case "topbar":
			return rect.top < 16 && rect.width > width * .48 && rect.height > 35 && rect.height < height * .28;
		case "player":
			return rect.bottom > height - 12 && rect.width > width * .55 && rect.height > 40 && rect.height < Math.min(240, height * .35);
		case "main":
			// Target the stable viewport between the title bar and player. Reject
			// ReactVirtualized inner content that can be tens of thousands of pixels
			// high and causes Chromium composition and scrolling glitches.
			return rect.left > width * .1 &&
				rect.top > 35 && rect.top < height * .2 &&
				rect.right > width * .82 &&
				rect.bottom > height * .82 && rect.bottom <= height + 12 &&
				rect.width > width * .6 &&
				rect.height > height * .55 && rect.height < height * 1.05;
	}
	return false;
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

function findSurfaceAtPoint(
	x: number,
	y: number,
	matches: (rect: DOMRect) => boolean,
) {
	return findNearestMatchingAncestor(document.elementFromPoint(x, y) as HTMLElement | null, matches);
}

function findSurfaceFromAnchor(
	selector: string,
	matches: (rect: DOMRect) => boolean,
) {
	const anchor = document.querySelector(selector) as HTMLElement | null;
	return findNearestMatchingAncestor(anchor, matches);
}

function findKnownSurfaceFallback(
	surface: CommunityThemeSurface,
	matches: (rect: DOMRect) => boolean,
) {
	const candidates = new Set<HTMLElement>();
	KNOWN_SURFACE_SELECTORS[surface].forEach((selector) => {
		document.querySelectorAll(selector).forEach((element) => {
			if (element instanceof HTMLElement && !element.closest(".better-ncm-manager")) candidates.add(element);
		});
	});
	return [...candidates]
		.map((element) => ({ element, rect: element.getBoundingClientRect() }))
		.filter(({ rect }) => matches(rect))
		.sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height)[0]?.element || null;
}

function getStableSurfaceTarget(
	surface: CommunityThemeSurface,
	matches: (rect: DOMRect) => boolean,
) {
	const cached = markedSurfaces[surface];
	if (cached?.isConnected && matches(cached.getBoundingClientRect())) return cached;
	const existing = document.querySelector('[' + SURFACE_ATTRIBUTE + '="' + surface + '"]');
	if (existing instanceof HTMLElement && existing.isConnected && matches(existing.getBoundingClientRect())) {
		markedSurfaces[surface] = existing;
		return existing;
	}
	return null;
}

function setSurfaceTarget(surface: CommunityThemeSurface, target: HTMLElement | null) {
	const previous = markedSurfaces[surface];
	if (previous && previous !== target && previous.getAttribute(SURFACE_ATTRIBUTE) === surface) {
		previous.removeAttribute(SURFACE_ATTRIBUTE);
	}
	document.querySelectorAll('[' + SURFACE_ATTRIBUTE + '="' + surface + '"]').forEach((element) => {
		if (element !== target) element.removeAttribute(SURFACE_ATTRIBUTE);
	});
	if (target && !target.closest(".better-ncm-manager")) {
		target.setAttribute(SURFACE_ATTRIBUTE, surface);
		markedSurfaces[surface] = target;
	} else {
		delete markedSurfaces[surface];
	}
}

function communitySurfaceTargetsAreStable() {
	const width = document.documentElement.clientWidth;
	const height = document.documentElement.clientHeight;
	if (width < 400 || height < 300) return false;
	return COMMUNITY_THEME_SURFACES.every((surface) => {
		const target = markedSurfaces[surface];
		return Boolean(target?.isConnected && surfaceMatchesViewport(surface, target.getBoundingClientRect(), width, height));
	});
}

export function refreshCommunityThemeTargets() {
	const width = document.documentElement.clientWidth;
	const height = document.documentElement.clientHeight;
	if (width < 400 || height < 300) return getCommunityThemeDiagnostics(false);

	const matches = (surface: CommunityThemeSurface) => (rect: DOMRect) =>
		surfaceMatchesViewport(surface, rect, width, height);

	const sidebarMatch = matches("sidebar");
	const topbarMatch = matches("topbar");
	const playerMatch = matches("player");
	const mainMatch = matches("main");

	setSurfaceTarget("sidebar", getStableSurfaceTarget("sidebar", sidebarMatch) ||
		findSurfaceAtPoint(Math.min(120, width * .12), height * .48, sidebarMatch) ||
		findSurfaceFromAnchor("#left_nav_myFavoriteMusic", sidebarMatch) ||
		findKnownSurfaceFallback("sidebar", sidebarMatch));

	setSurfaceTarget("topbar", getStableSurfaceTarget("topbar", topbarMatch) ||
		findSurfaceAtPoint(width * .58, Math.min(48, height * .08), topbarMatch) ||
		findSurfaceFromAnchor('.cmd-icon-setting, a[href="#/m/setting/"]', topbarMatch) ||
		findKnownSurfaceFallback("topbar", topbarMatch));

	setSurfaceTarget("player", getStableSurfaceTarget("player", playerMatch) ||
		findSurfaceAtPoint(width * .58, Math.max(1, height - 36), playerMatch) ||
		findSurfaceFromAnchor('#btn_pc_minibar_play, [id*="minibar_play"]', playerMatch) ||
		findKnownSurfaceFallback("player", playerMatch));

	setSurfaceTarget("main", getStableSurfaceTarget("main", mainMatch) ||
		findSurfaceAtPoint(width * .62, height * .48, mainMatch) ||
		findKnownSurfaceFallback("main", mainMatch));

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
	const width = document.documentElement.clientWidth;
	const height = document.documentElement.clientHeight;
	const fullWindowLayers = candidates
		.map((element) => ({ element, rect: element.getBoundingClientRect() }))
		.filter(({ rect }) => rect.width > width * .65 && rect.height > height * .65)
		.sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
	const nextTargets = new Set(fullWindowLayers.map(({ element }) => element));
	markedWallpaperBackgrounds.forEach((element) => {
		if (!nextTargets.has(element) && element.getAttribute(WALLPAPER_BACKGROUND_ATTRIBUTE) === "true") {
			element.removeAttribute(WALLPAPER_BACKGROUND_ATTRIBUTE);
		}
	});
	nextTargets.forEach((element) => {
		if (element.getAttribute(WALLPAPER_BACKGROUND_ATTRIBUTE) !== "true") {
			element.setAttribute(WALLPAPER_BACKGROUND_ATTRIBUTE, "true");
		}
	});
	markedWallpaperBackgrounds = nextTargets;
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

function parseHexRgb(hex: string) {
	const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#8b5cf6";
	const value = Number.parseInt(normalized.slice(1), 16);
	return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHsl(r: number, g: number, b: number) {
	const red = r / 255;
	const green = g / 255;
	const blue = b / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const lightness = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: lightness };
	const delta = max - min;
	const saturation = lightness > .5 ? delta / (2 - max - min) : delta / (max + min);
	let hue = 0;
	if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
	else if (max === green) hue = (blue - red) / delta + 2;
	else hue = (red - green) / delta + 4;
	return { h: hue * 60, s: saturation, l: lightness };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
	const normalizedHue = ((hue % 360) + 360) % 360 / 360;
	const hueToChannel = (p: number, q: number, value: number) => {
		let channel = value;
		if (channel < 0) channel += 1;
		if (channel > 1) channel -= 1;
		if (channel < 1 / 6) return p + (q - p) * 6 * channel;
		if (channel < 1 / 2) return q;
		if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
		return p;
	};
	let red = lightness;
	let green = lightness;
	let blue = lightness;
	if (saturation > 0) {
		const q = lightness < .5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
		const p = 2 * lightness - q;
		red = hueToChannel(p, q, normalizedHue + 1 / 3);
		green = hueToChannel(p, q, normalizedHue);
		blue = hueToChannel(p, q, normalizedHue - 1 / 3);
	}
	const channelToHex = (channel: number) => Math.round(clamp(channel, 0, 1) * 255).toString(16).padStart(2, "0");
	return `#${channelToHex(red)}${channelToHex(green)}${channelToHex(blue)}`;
}

function deriveAccentAlternative(themeId: CommunityThemeId, accent: string) {
	const rgb = parseHexRgb(accent);
	const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
	const hueShift = themeId === "midnight" ? -20 : themeId === "aurora" ? 28 : themeId === "glass" ? -18 : -42;
	const minimumSaturation = themeId === "generated" ? .56 : .62;
	const lightness = clamp(hsl.l < .42 ? hsl.l + .12 : hsl.l > .72 ? hsl.l - .1 : hsl.l, .48, .68);
	return hslToHex(hsl.h + hueShift, Math.max(hsl.s, minimumSaturation), lightness);
}

function hexToRgb(hex: string) {
	const { r, g, b } = parseHexRgb(hex);
	return `${r}, ${g}, ${b}`;
}

export function applyCommunityTheme(settings: CommunityThemeSettings) {
	const root = document.documentElement;
	const palette = settings.palette;
	const effectiveAccent = settings.themeId === "generated" && palette ? palette.accent : settings.accent;
	const accentAlternative = deriveAccentAlternative(settings.themeId, effectiveAccent);
	const accentRgb = hexToRgb(effectiveAccent);
	const accentAlternativeRgb = hexToRgb(accentAlternative);
	root.dataset.bncmCommunityTheme = settings.themeId;
	root.style.setProperty("--bncm-community-opacity", String(settings.intensity / 100));
	root.style.setProperty("--bncm-community-blur", `${settings.blur}px`);
	root.style.setProperty("--bncm-community-accent", effectiveAccent);
	root.style.setProperty("--bncm-community-accent-rgb", accentRgb);
	root.style.setProperty("--bncm-community-accent-alt", accentAlternative);
	root.style.setProperty("--bncm-community-accent-alt-rgb", accentAlternativeRgb);
	root.style.setProperty("--bncm-community-accent-soft", `rgba(${accentRgb}, 0.18)`);

	let style = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
	if (!style) {
		style = document.createElement("style");
		style.id = THEME_STYLE_ID;
		document.head.appendChild(style);
	}
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
	const controlAngle = settings.themeId === "aurora" ? "115deg" : settings.themeId === "glass" ? "145deg" : settings.themeId === "midnight" ? "128deg" : "135deg";
	const runtimeCss = `html[data-bncm-community-theme] {
		--bncm-community-opacity: ${normalizedOpacity};
		--bncm-community-main-opacity: ${Math.min(0.62, normalizedOpacity * 0.58)};
		--bncm-community-sidebar-opacity: ${Math.min(0.78, normalizedOpacity * 0.72)};
		--bncm-community-card-opacity: ${Math.min(0.6, normalizedOpacity * 0.4)};
		--bncm-community-blur: ${clamp(settings.blur, 0, 36)}px;
		--bncm-community-accent: ${effectiveAccent};
		--bncm-community-accent-rgb: ${accentRgb};
		--bncm-community-accent-alt: ${accentAlternative};
		--bncm-community-accent-alt-rgb: ${accentAlternativeRgb};
		--bncm-community-accent-soft: rgba(${accentRgb}, 0.18);
		--bncm-community-control-gradient: linear-gradient(${controlAngle}, ${accentAlternative} 0%, ${effectiveAccent} 100%);
		--bncm-community-control-hover: linear-gradient(135deg, rgba(${accentAlternativeRgb}, .14), rgba(${accentRgb}, .09));
		--bncm-community-selection-gradient: linear-gradient(100deg, rgba(${accentAlternativeRgb}, .24), rgba(${accentRgb}, .13));
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
		accent: effectiveAccent,
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
	box-shadow: inset -1px 0 0 rgba(0, 0, 0, .08) !important;
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
	backdrop-filter: none !important;
	filter: none !important;
}
html[data-bncm-community-wallpaper="true"] .m-table {
	background-color: rgba(${hexToRgb(shellPalette.surface)}, var(--bncm-community-card-opacity)) !important;
	backdrop-filter: none !important;
	filter: none !important;
}
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

function scheduleCommunityThemeTargetRefresh(force = false) {
	const wallpaperTargetsAreStable = [...markedWallpaperBackgrounds].every((element) => element.isConnected);
	if (!force && communitySurfaceTargetsAreStable() && wallpaperTargetsAreStable) return;
	window.clearTimeout(surfaceRefreshTimer);
	surfaceRefreshTimer = window.setTimeout(() => {
		refreshCommunityThemeTargets();
	}, 450);
}

function observeCommunityThemeTargets() {
	if (surfaceObserver || !document.body) return;
	surfaceObserver = new MutationObserver(() => scheduleCommunityThemeTargetRefresh(false));
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
	window.addEventListener("resize", () => scheduleCommunityThemeTargetRefresh(true));
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeCommunityTheme, {
		once: true,
	});
} else {
	initializeCommunityTheme();
}
