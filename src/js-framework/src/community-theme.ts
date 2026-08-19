export type CommunityThemeId = "default" | "midnight" | "aurora" | "glass";

export interface CommunityThemeSettings {
	themeId: CommunityThemeId;
	intensity: number;
	blur: number;
	accent: string;
	customCss: string;
	customCssName: string;
}

export interface CommunityThemePreset {
	id: CommunityThemeId;
	name: string;
	description: string;
	preview: string;
}

export const COMMUNITY_THEME_STORAGE_KEY = "betterncm.community.theme";

export const COMMUNITY_THEME_PRESETS: CommunityThemePreset[] = [
	{
		id: "default",
		name: "网易云原色",
		description: "不改变网易云原始配色。",
		preview: "linear-gradient(135deg, #f9d768, #ec4141)",
	},
	{
		id: "midnight",
		name: "午夜深紫",
		description: "深色背景、紫色强调色和柔和卡片。",
		preview: "linear-gradient(135deg, #11131f, #7c3aed)",
	},
	{
		id: "aurora",
		name: "极光青蓝",
		description: "青蓝渐变，适合长时间使用。",
		preview: "linear-gradient(135deg, #082f49, #14b8a6)",
	},
	{
		id: "glass",
		name: "玻璃玫瑰",
		description: "半透明面板、玫瑰强调色和背景模糊。",
		preview: "linear-gradient(135deg, #3b1028, #f43f5e)",
	},
];

const DEFAULT_SETTINGS: CommunityThemeSettings = {
	themeId: "default",
	intensity: 82,
	blur: 16,
	accent: "#8b5cf6",
	customCss: "",
	customCssName: "",
};

const THEME_STYLE_ID = "betterncm-community-theme-style";
const CUSTOM_THEME_STYLE_ID = "betterncm-community-custom-theme-style";

const THEME_CSS = `
html[data-bncm-community-theme="midnight"],
html[data-bncm-community-theme="aurora"],
html[data-bncm-community-theme="glass"] {
	--bncm-community-text: #f8fafc;
	--bncm-community-muted: #cbd5e1;
	--bncm-community-border: rgba(255, 255, 255, 0.14);
	--bncm-community-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
}

html[data-bncm-community-theme="midnight"] {
	--bncm-community-background: #10111a;
	--bncm-community-sidebar: rgba(22, 20, 39, var(--bncm-community-opacity));
	--bncm-community-panel: rgba(31, 27, 54, var(--bncm-community-opacity));
}

html[data-bncm-community-theme="aurora"] {
	--bncm-community-background: #071923;
	--bncm-community-sidebar: rgba(7, 45, 62, var(--bncm-community-opacity));
	--bncm-community-panel: rgba(11, 70, 83, var(--bncm-community-opacity));
}

html[data-bncm-community-theme="glass"] {
	--bncm-community-background: #24111f;
	--bncm-community-sidebar: rgba(53, 18, 47, var(--bncm-community-opacity));
	--bncm-community-panel: rgba(75, 24, 53, var(--bncm-community-opacity));
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
	background: var(--bncm-community-background) !important;
	color: var(--bncm-community-text) !important;
}

html[data-bncm-community-theme="midnight"] .g-sd,
html[data-bncm-community-theme="aurora"] .g-sd,
html[data-bncm-community-theme="glass"] .g-sd,
html[data-bncm-community-theme="midnight"] [class*="SideBar"],
html[data-bncm-community-theme="aurora"] [class*="SideBar"],
html[data-bncm-community-theme="glass"] [class*="SideBar"] {
	background: var(--bncm-community-sidebar) !important;
	border-color: var(--bncm-community-border) !important;
	backdrop-filter: blur(var(--bncm-community-blur));
}

html[data-bncm-community-theme="midnight"] .m-playbar,
html[data-bncm-community-theme="aurora"] .m-playbar,
html[data-bncm-community-theme="glass"] .m-playbar,
html[data-bncm-community-theme="midnight"] [class*="PlayerBar"],
html[data-bncm-community-theme="aurora"] [class*="PlayerBar"],
html[data-bncm-community-theme="glass"] [class*="PlayerBar"] {
	background: var(--bncm-community-panel) !important;
	border-color: var(--bncm-community-border) !important;
	box-shadow: var(--bncm-community-shadow);
	backdrop-filter: blur(var(--bncm-community-blur));
}

html[data-bncm-community-theme="midnight"] .g-mn,
html[data-bncm-community-theme="aurora"] .g-mn,
html[data-bncm-community-theme="glass"] .g-mn,
html[data-bncm-community-theme="midnight"] [class*="MainContent"],
html[data-bncm-community-theme="aurora"] [class*="MainContent"],
html[data-bncm-community-theme="glass"] [class*="MainContent"] {
	background: var(--bncm-community-background) !important;
	color: var(--bncm-community-text) !important;
}

html[data-bncm-community-theme="midnight"] [class*="Card"],
html[data-bncm-community-theme="aurora"] [class*="Card"],
html[data-bncm-community-theme="glass"] [class*="Card"],
html[data-bncm-community-theme="midnight"] .m-table,
html[data-bncm-community-theme="aurora"] .m-table,
html[data-bncm-community-theme="glass"] .m-table {
	background: var(--bncm-community-panel) !important;
	border-color: var(--bncm-community-border) !important;
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

html[data-bncm-community-theme="midnight"] button,
html[data-bncm-community-theme="aurora"] button,
html[data-bncm-community-theme="glass"] button,
html[data-bncm-community-theme="midnight"] [role="button"],
html[data-bncm-community-theme="aurora"] [role="button"],
html[data-bncm-community-theme="glass"] [role="button"] {
	border-color: var(--bncm-community-border) !important;
}

html[data-bncm-community-theme="midnight"] body *:not(svg):not(path),
html[data-bncm-community-theme="aurora"] body *:not(svg):not(path),
html[data-bncm-community-theme="glass"] body *:not(svg):not(path) {
	border-color: var(--bncm-community-border);
}

html[data-bncm-community-theme="midnight"] a:hover,
html[data-bncm-community-theme="aurora"] a:hover,
html[data-bncm-community-theme="glass"] a:hover,
html[data-bncm-community-theme="midnight"] [aria-selected="true"],
html[data-bncm-community-theme="aurora"] [aria-selected="true"],
html[data-bncm-community-theme="glass"] [aria-selected="true"] {
	color: var(--bncm-community-accent) !important;
}

html[data-bncm-community-theme="midnight"] .bncm-mgr,
html[data-bncm-community-theme="aurora"] .bncm-mgr,
html[data-bncm-community-theme="glass"] .bncm-mgr {
	color: var(--bncm-community-text);
}
`;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function getCommunityThemeSettings(): CommunityThemeSettings {
	try {
		const stored = JSON.parse(
			localStorage.getItem(COMMUNITY_THEME_STORAGE_KEY) || "{}",
		) as Partial<CommunityThemeSettings>;
		return {
			themeId:
				stored.themeId === "midnight" ||
				stored.themeId === "aurora" ||
				stored.themeId === "glass"
					? stored.themeId
					: "default",
			intensity: clamp(Number(stored.intensity ?? DEFAULT_SETTINGS.intensity), 20, 100),
			blur: clamp(Number(stored.blur ?? DEFAULT_SETTINGS.blur), 0, 36),
			accent:
				typeof stored.accent === "string" && /^#[0-9a-f]{6}$/i.test(stored.accent)
					? stored.accent
					: DEFAULT_SETTINGS.accent,
			customCss: typeof stored.customCss === "string" ? stored.customCss : "",
			customCssName:
				typeof stored.customCssName === "string" ? stored.customCssName : "",
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveCommunityThemeSettings(settings: CommunityThemeSettings) {
	localStorage.setItem(COMMUNITY_THEME_STORAGE_KEY, JSON.stringify(settings));
	applyCommunityTheme(settings);
}

export function resetCommunityTheme() {
	localStorage.removeItem(COMMUNITY_THEME_STORAGE_KEY);
	applyCommunityTheme(DEFAULT_SETTINGS);
}

export function applyCommunityTheme(settings: CommunityThemeSettings) {
	const root = document.documentElement;
	root.dataset.bncmCommunityTheme = settings.themeId;
	root.style.setProperty("--bncm-community-opacity", String(settings.intensity / 100));
	root.style.setProperty("--bncm-community-blur", `${settings.blur}px`);
	root.style.setProperty("--bncm-community-accent", settings.accent);

	let style = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
	if (!style) {
		style = document.createElement("style");
		style.id = THEME_STYLE_ID;
		document.head.appendChild(style);
	}
	style.textContent = THEME_CSS;

	let customStyle = document.getElementById(
		CUSTOM_THEME_STYLE_ID,
	) as HTMLStyleElement | null;
	if (!customStyle) {
		customStyle = document.createElement("style");
		customStyle.id = CUSTOM_THEME_STYLE_ID;
		document.head.appendChild(customStyle);
	}
	customStyle.textContent = settings.customCss;
}

function initializeCommunityTheme() {
	applyCommunityTheme(getCommunityThemeSettings());
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeCommunityTheme, {
		once: true,
	});
} else {
	initializeCommunityTheme();
}
