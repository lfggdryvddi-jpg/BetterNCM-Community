import BetterNCM from "../../betterncm-api";

const COMMUNITY_REPOSITORY_URL =
	"https://github.com/lfggdryvddi-jpg/BetterNCM-Community";

export const StartupWarning: React.FC<{
	onRequestClose: Function;
}> = (props) => {
	return (
		<div className="bncm-mgr-warning">
			<h1>欢迎使用 BetterNCM Community</h1>
			<p>
				这是面向新版网易云音乐维护的非官方社区版本，用于本地插件加载、界面美化与功能扩展。
			</p>
			<p>
				本项目是自由软件，不提供收费安装服务，也不隶属于网易云音乐或原项目维护者。
				请仅从社区仓库获取构建与更新，并在替换 DLL 前备份网易云安装目录。
			</p>
			<p>
				社区仓库：
				<a
					className="itm"
					// rome-ignore lint/a11y/useValidAnchor: <explanation>
					onClick={() => BetterNCM.ncm.openUrl(COMMUNITY_REPOSITORY_URL)}
					style={{
						width: "32px",
						height: "32px",
					}}
				>
					{COMMUNITY_REPOSITORY_URL}
				</a>
			</p>
			<p>
				通过点击右上角的音乐图标（在设置图标的右侧）可以打开插件管理器，
				然后管理已安装的插件与主题。
			</p>
			<button onClick={() => props.onRequestClose()}>开始使用社区版</button>
		</div>
	);
};
