import BetterNCM from "../../betterncm-api";
import { CommunityThemeSettings, clearCommunityWallpaper, getCommunityThemeSettings, useCommunityWallpaper } from "../../community-theme";
import { extractPalette, parseBase16, scanWallpaperEngine, WallpaperResource } from "../../theme-generator";

interface Props {
	settings: CommunityThemeSettings;
	onUpdate: (next: Partial<CommunityThemeSettings>) => void;
	onSettingsRefresh: (settings: CommunityThemeSettings) => void;
	onMessage: (message: string) => void;
}

export const CommunityThemeGenerator: React.FC<Props> = ({ settings, onUpdate, onSettingsRefresh, onMessage }) => {
	const [rootPath, setRootPath] = React.useState("D:\\steam\\steamapps\\workshop\\content\\431960");
	const [resources, setResources] = React.useState<WallpaperResource[]>([]);
	const [scanning, setScanning] = React.useState(false);

	const generateFromImage = async (path: string, name: string) => {
		try {
			onMessage(`正在分析 ${name}，请稍候…`);
			const palette = await extractPalette(await BetterNCM.fs.readFile(path));
			onUpdate({ themeId: "generated", palette, accent: palette.accent });
			await useCommunityWallpaper(path, name);
			onSettingsRefresh(getCommunityThemeSettings());
			onMessage(`已根据 ${name} 生成主题。原始 Wallpaper Engine 文件仍保留在本机，不会复制到仓库。`);
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

	return (
		<div className="bncm-theme-generator">
			<p>读取本机 Wallpaper Engine Workshop 的预览图，自动提取主色并生成网易云主题。系统只保存本地路径，不会把 Workshop 原文件上传到 GitHub。</p>
			<div className="bncm-theme-generator-row">
				<input value={rootPath} onChange={(event) => setRootPath(event.target.value)} placeholder="Wallpaper Engine Workshop 路径" />
				<button type="button" disabled={scanning} onClick={async () => {
					setScanning(true);
					try {
						const found = await scanWallpaperEngine(rootPath);
						setResources(found);
						onMessage(found.length ? `找到 ${found.length} 个可取色的本地预览图。` : "没有找到常见图片格式；动态壁纸请先在 Wallpaper Engine 中截取预览图。");
					} catch (error) {
						onMessage(error instanceof Error ? error.message : "扫描 Wallpaper Engine 失败。");
					} finally {
						setScanning(false);
					}
				}}>{scanning ? "扫描中…" : "扫描本地资源"}</button>
			</div>
			<div className="bncm-theme-generator-actions">
				<button type="button" onClick={() => void chooseLocalImage()}>选择本地图片并生成</button>
				<button type="button" onClick={() => void importBase16File()}>导入 Base16</button>
				{settings.wallpaperPath && <button type="button" onClick={() => { clearCommunityWallpaper(); onSettingsRefresh(getCommunityThemeSettings()); onMessage("已移除壁纸，保留生成的配色。"); }}>移除壁纸</button>}
			</div>
			{resources.length > 0 && <div className="bncm-theme-resource-list">{resources.slice(0, 24).map((resource) => <button key={resource.path} type="button" onClick={() => void generateFromImage(resource.path, resource.name)} title={resource.path}>{resource.name}</button>)}</div>}
			{settings.palette && <div className="bncm-theme-palette-preview">{[settings.palette.background, settings.palette.surface, settings.palette.text, settings.palette.accent].map((color) => <span key={color} style={{ background: color }} title={color} />)}</div>}
		</div>
	);
};
