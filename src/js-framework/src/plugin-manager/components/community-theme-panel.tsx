import BetterNCM from "../../betterncm-api";
import {
	COMMUNITY_THEME_PRESETS,
	CommunityThemeDiagnostics,
	CommunityThemeSettings,
	getCommunityThemeDiagnostics,
	getCommunityThemeSettings,
	refreshCommunityThemeTargets,
	resetCommunityTheme,
	saveCommunityThemeSettings,
	validateCommunityCss,
} from "../../community-theme";
import { CommunityThemeGenerator } from "./theme-generator";

const labelStyle: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	gap: "16px",
	margin: "14px 0 8px",
};

const cardStyle: React.CSSProperties = {
	border: "1px solid #8885",
	borderRadius: "12px",
	padding: "14px",
	cursor: "pointer",
	transition: "transform .15s ease, border-color .15s ease, background .15s ease",
};

const SURFACE_LABELS: Array<[keyof CommunityThemeDiagnostics, string]> = [
	["sidebar", "侧栏"],
	["topbar", "顶部栏"],
	["main", "主内容"],
	["player", "播放栏"],
];

export const CommunityThemePanel: React.FC = () => {
	const [settings, setSettings] = React.useState<CommunityThemeSettings>(
		getCommunityThemeSettings(),
	);
	const [diagnostics, setDiagnostics] = React.useState<CommunityThemeDiagnostics>(
		getCommunityThemeDiagnostics(),
	);
	const [message, setMessage] = React.useState("");
	const panelRef = React.useRef<HTMLDivElement | null>(null);
	const cssFileInputRef = React.useRef<HTMLInputElement | null>(null);

	React.useLayoutEffect(() => {
		panelRef.current?.scrollTo(0, 0);
		setDiagnostics(refreshCommunityThemeTargets());
	}, []);

	const update = (next: Partial<CommunityThemeSettings>) => {
		setSettings((current) => {
			const merged = { ...current, ...next };
			try {
				saveCommunityThemeSettings(merged);
				setMessage("");
			} catch {
				setMessage("设置保存失败，可能是自定义 CSS 过大或本地存储空间不足。");
				return current;
			}
			return merged;
		});
		setTimeout(() => setDiagnostics(refreshCommunityThemeTargets()), 0);
	};

	const selectedPreset = COMMUNITY_THEME_PRESETS.find(
		(preset) => preset.id === settings.themeId,
	);

	return (
		<div className="bncm-theme-panel" ref={panelRef}>
			<div className="bncm-theme-panel-title">
				<div>
					<h2>社区皮肤</h2>
					<p>BetterNCM Community 内置主题系统，不依赖旧项目插件源。</p>
				</div>
				<span className="bncm-theme-badge">本地生效</span>
			</div>

			<div className="bncm-theme-notice">
				<strong>{settings.themeId === "generated" ? (settings.wallpaperName || "本地生成主题") : selectedPreset?.name || "网易云原色"}</strong>
				<span>{selectedPreset?.description}</span>
			</div>

			<h3>选择主题</h3>
			<div className="bncm-theme-grid">
				{COMMUNITY_THEME_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						aria-pressed={settings.themeId === preset.id}
						style={{
							...cardStyle,
							background: preset.preview,
							borderColor:
								settings.themeId === preset.id ? settings.accent : "#8885",
						}}
						onClick={() => update({ themeId: preset.id, accent: preset.accent })}
					>
						<span>{preset.name}</span>
						<small>{preset.description}</small>
					</button>
				))}
			</div>

			<h3>细节调整</h3>
			<label style={labelStyle}>
				<span>面板不透明度（越低越能看清壁纸）</span>
				<output>{settings.intensity}%</output>
			</label>
			<input
				className="bncm-theme-range"
				type="range"
				min="20"
				max="100"
				value={settings.intensity}
				onChange={(event) => update({ intensity: Number(event.target.value) })}
			/>

			<label style={labelStyle}>
				<span>背景模糊</span>
				<output>{settings.blur}px</output>
			</label>
			<input
				className="bncm-theme-range"
				type="range"
				min="0"
				max="36"
				value={settings.blur}
				onChange={(event) => update({ blur: Number(event.target.value) })}
			/>

			<label style={labelStyle}>
				<span>强调色</span>
				<input
					className="bncm-theme-color"
					type="color"
					value={settings.accent}
					onChange={(event) => update({ accent: event.target.value })}
				/>
			</label>

			<h3>界面覆盖检测</h3>
			<div className="bncm-theme-diagnostics">
				<div className="bncm-theme-diagnostic-list">
					{SURFACE_LABELS.map(([key, label]) => (
						<span
							key={key}
							className={diagnostics[key] > 0 ? "is-ok" : "is-missing"}
						>
							{label}：{diagnostics[key] > 0 ? `已识别 ${diagnostics[key]}` : "未识别"}
						</span>
					))}
				</div>
				<button
					type="button"
					onClick={() => setDiagnostics(refreshCommunityThemeTargets())}
				>
					重新检测
				</button>
			</div>

			<h3>自动生成主题</h3>
			<CommunityThemeGenerator
				settings={settings}
				onUpdate={update}
				onSettingsRefresh={setSettings}
				onMessage={setMessage}
			/>

			<h3>导入社区 CSS 皮肤</h3>
			<div className="bncm-theme-import">
				<div>
					<strong>{settings.customCssName || "尚未导入自定义 CSS"}</strong>
					<span>仅接受不超过 512 KB 的本地 CSS；阻止远程导入和脚本式规则。</span>
				</div>
				<input
					ref={cssFileInputRef}
					type="file"
					accept=".css,text/css"
					style={{ display: "none" }}
					onChange={async (event) => {
						const input = event.currentTarget;
						const file = input.files?.[0];
						if (!file) return;
						try {
							if (!file.name.toLowerCase().endsWith(".css")) {
								setMessage("请选择扩展名为 .css 的皮肤文件。");
								return;
							}
							const css = await file.text();
							const validationError = validateCommunityCss(css);
							if (validationError) {
								setMessage(validationError);
								return;
							}
							update({ customCss: css, customCssName: file.name });
							setMessage(`已导入 ${file.name}`);
						} catch {
							setMessage("CSS 文件读取失败，请确认文件可访问且编码正常。");
						} finally {
							input.value = "";
						}
					}}
				/>
				<button type="button" onClick={() => cssFileInputRef.current?.click()}>
					选择 CSS 文件
				</button>
				{settings.customCss && (
					<button
						type="button"
						onClick={() => update({ customCss: "", customCssName: "" })}
					>
						移除自定义 CSS
					</button>
				)}
			</div>
			{message && <p className="bncm-theme-message">{message}</p>}

			<div className="bncm-theme-panel-actions">
				<button
					type="button"
					onClick={() => {
						resetCommunityTheme();
						setSettings(getCommunityThemeSettings());
						setDiagnostics(refreshCommunityThemeTargets());
						setMessage("已恢复网易云原色并移除自定义 CSS。");
					}}
				>
					恢复默认
				</button>
				<button
					type="button"
					onClick={() =>
						BetterNCM.ncm.openUrl(
							"https://github.com/lfggdryvddi-jpg/BetterNCM-Community",
						)
					}
				>
					贡献皮肤
				</button>
			</div>

			<p className="bncm-theme-footnote">
				主题设置保存在当前网易云用户配置中，重启后仍然有效。若某个界面区域显示“未识别”，
				可点击重新检测并向社区仓库提交当前网易云版本和截图。
			</p>
		</div>
	);
};
