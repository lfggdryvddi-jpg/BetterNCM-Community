import BetterNCM from "../../betterncm-api";
import { disableSafeMode, isSafeMode, loadedPlugins } from "../../loader";
import { Button } from "./button";

const COMMUNITY_REPOSITORY_URL =
	"https://github.com/lfggdryvddi-jpg/BetterNCM-Community";
const COMMUNITY_RELEASES_URL = `${COMMUNITY_REPOSITORY_URL}/releases`;
export const HeaderComponent: React.FC<{
	onRequestOpenStartupWarnings: Function;
}> = (props) => {
	const safeMode = React.useMemo(() => isSafeMode(), []);
	const globalRequireRestart = React.useMemo(
		() =>
			Object.values(loadedPlugins).findIndex(
				(plugin) =>
					plugin.manifest.require_restart || plugin.manifest.native_plugin,
			) !== -1,
		[],
	);

	const [consoleShown, setConsoleShown] = React.useState(false);

	return (
		<section className="bncm-mgr-header">
			<svg
				width="64"
				height="64"
				viewBox="0 0 64 64"
				role="img"
				aria-label="BetterNCM Community"
			>
				<defs>
					<linearGradient id="bncm-community-gradient" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor="#ff4d6d" />
						<stop offset="1" stopColor="#8b5cf6" />
					</linearGradient>
				</defs>
				<rect width="64" height="64" rx="16" fill="url(#bncm-community-gradient)" />
				<path
					fill="white"
					d="M39 15v25.4a9.5 9.5 0 1 1-4-7.7V21.4l16-3.6v18.6a9.5 9.5 0 1 1-4-7.7V15.9L39 17.7V15Z"
				/>
			</svg>
			<div>
				<h1>
					BetterNCM Community{" "}
					<span style={{ fontSize: "smaller", opacity: "0.8" }}>
						{betterncm_native.app.version()}
					</span>
				</h1>
				<div className="bncm-mgr-btns">
					<Button
						onClick={async () => {
							BetterNCM.app.exec(
								`explorer "${(await BetterNCM.app.getDataPath()).replace(
									/\//g,
									"\\",
								)}"`,
								false,
								true,
							);
						}}
					>
						打开插件文件夹
					</Button>
					<Button
						onClick={() => {
							BetterNCM.app.showConsole(!consoleShown);
							setConsoleShown(!consoleShown);
						}}
					>
						{consoleShown ? "隐藏" : "打开"}
						控制台
					</Button>

					{globalRequireRestart ? (
						<>
							<Button
								onClick={async () => {
									await BetterNCM.reload();
								}}
							>
								重载网易云
							</Button>

							<Button
								onClick={async () => {
									await disableSafeMode();
									betterncm_native.app.restart();
								}}
							>
								重启并重载插件
							</Button>
						</>
					) : (
						<Button
							onClick={async () => {
								await disableSafeMode();
								await BetterNCM.app.reloadPlugins();
								BetterNCM.reload();
							}}
						>
							重载插件
						</Button>
					)}

					<Button
						onClick={() => BetterNCM.ncm.openUrl(COMMUNITY_RELEASES_URL)}
					>
						查看社区版发布
					</Button>
				</div>
			</div>
			<div className="m-tool">
				<a
					className="itm"
					// rome-ignore lint/a11y/useValidAnchor: <explanation>
					onClick={() => props.onRequestOpenStartupWarnings()}
					style={{
						width: "32px",
						height: "32px",
					}}
				>
					<svg width="32px" height="32px" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
						/>
					</svg>
				</a>
				<a
					className="itm"
					// rome-ignore lint/a11y/useValidAnchor: <explanation>
					onClick={() => BetterNCM.ncm.openUrl(COMMUNITY_REPOSITORY_URL)}
					style={{
						width: "32px",
						height: "32px",
					}}
				>
					<svg width="32px" height="32px" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"
						/>
					</svg>
				</a>
			</div>
		</section>
	);
};
