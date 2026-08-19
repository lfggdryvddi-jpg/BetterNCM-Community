# BetterNCM Community 皮肤目录

这里存放社区皮肤的规范、模板和示例。当前版本优先支持**本地 CSS 导入**，不会自动连接旧项目的插件市场或镜像。

## 制作与贡献

1. 复制 `template/` 到新目录。
2. 修改 `manifest.json` 和 `theme.css`。
3. 使用 `schema/skin.schema.json` 校验清单。
4. 在网易云的 BetterNCM Community 管理页导入 CSS，确认恢复默认后页面能够正常还原。
5. 在 GitHub 提交 Pull Request，并在描述中注明预览图、许可证、兼容的网易云版本和已知问题。

后续可以在不改变 CSS 皮肤格式的前提下增加安全的 ZIP 安装器和社区索引；在线安装器必须继续采用白名单、HTTPS、清单校验和显式用户确认。
