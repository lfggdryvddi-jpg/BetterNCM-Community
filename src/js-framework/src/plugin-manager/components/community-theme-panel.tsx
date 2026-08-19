import BetterNCM from "../../betterncm-api";
import {
	applyCommunityTheme,
	COMMUNITY_THEME_PRESETS,
	CommunityThemeId,
	CommunityThemeSettings,
	getCommunityThemeSettings,
	resetCommunityTheme,
	saveCommunityThemeSettings,
} from "../../community-theme";

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

export const CommunityThemePanel: React.FC = () => {
	const [settings, setSettings] = React.useState<CommunityThemeSettings>(
		getCommunityThemeSettings(),
	);
	const cssFileInputRef = React.useRef<HTMLInputElement | null>(null);

	const update = (next: Partial<CommunityThemeSettings>) => {
		const merged = { ...settings, ...next };
		setSettings(merged);
		saveCommunityThemeSettings(merged);
	};

	const selectedPreset = COMMUNITY_THEME_PRESETS.find(
		(preset) => preset.id === settings.themeId,
	);

	return (
		<div className="bncm-theme-panel">
			<div className="bncm-theme-panel-title">
				<div>
					<h2>社区皮肤</h2>
					<p>BetterNCM Community 内置主题系统，不依赖旧项目插件源。</p>
				</div>
				<span className="bncm-theme-badge">本地生效</span>
			</div>

			<div className="bncm-theme-notice">
				<strong>{selectedPreset?.name || "网易云原色"}</strong>
				<span>{selectedPreset?.description}</span>
			</div>

			<h3>选择主题</h3>
			<div className="bncm-theme-grid">
				{COMMUNITY_THEME_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						style={{
							...cardStyle,
							background: preset.preview,
							borderColor:
								settings.themeId === preset.id
									? settings.accent
									: "#8885",
						}}
						onClick={() => update({ themeId: preset.id as CommunityThemeId })}
					>
						<span>{preset.name}</span>
						<small>{preset.description}</small>
					</button>
				))}
			</div>

			<h3>细节调整</h3>
			<label style={labelStyle}>
				<span>面板透明度</span>
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
					type="color"
					value={settings.accent}
					onChange={(event) => update({ accent: event.target.value })}
				/>
			</label>

			<h3>导入社区 CSS 皮肤</h3>
			<div className="bncm-theme-import">
				<div>
					<strong>{settings.customCssName || "尚未导入自定义 CSS"}</strong>
					<span>仅接受本地 .css 文件，不运行 JavaScript。</span>
				</div>
				<input
					ref={cssFileInputRef}
					type="file"
					accept=".css,text/css"
					style={{ display: "none" }}
					onChange={async (event) => {
						const file = event.currentTarget.files?.[0];
						if (!file) return;
						update({ customCss: await file.text(), customCssName: file.name });
						event.currentTarget.value = "";
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
			<div className="bncm-theme-panel-actions">
				<button
					type="button"
					onClick={() => {
						resetCommunityTheme();
						setSettings(getCommunityThemeSettings());
					}}
				>
					恢复默认
				</button>
				<button
					type="button"
					onClick={() => BetterNCM.ncm.openUrl("https://github.com/lfggdryvddi-jpg/BetterNCM-Community")}
				>
					贡献皮肤
				</button>
			</div>

			<p className="bncm-theme-footnote">
				主题设置保存在当前网易云用户配置中，重启后仍然有效。社区皮肤仓库开放后，
				可以在这里继续安装其他作者贡献的主题。
			</p>
		</div>
	);
};
