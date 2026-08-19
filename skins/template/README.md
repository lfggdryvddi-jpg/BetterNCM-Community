# BetterNCM Community 皮肤模板

复制 `skins/template/` 到一个新目录，然后修改 `manifest.json` 和 `theme.css`。

## 规则

- `manifest.json` 必须符合 `skins/schema/skin.schema.json`。
- `entry` 只能指向当前皮肤目录内的 CSS 文件。
- 第一版导入器只读取 CSS，不执行 JavaScript。
- 不要在 CSS 中加入远程 `@import`、跟踪脚本、账号信息或 Cookie。
- 推荐用 `html[data-bncm-community-theme="..."]` 作为选择器前缀，降低对网易云其他页面的影响。
- 发布皮肤时请附带许可证、网易云版本兼容范围和预览图。

在 BetterNCM Community 管理页的“社区皮肤”中选择“选择 CSS 文件”即可本地测试。
