# 主题生成与 Wallpaper Engine 资源使用

BetterNCM Community 支持三种不需要编写网易云选择器的主题来源：

1. 本地图片：选择 PNG/JPG/JPEG/WEBP，自动提取主色并生成主题；
2. Base16：导入包含 `base00` 到 `base0F` 的 JSON/YAML 配色；
3. Wallpaper Engine 本地 Workshop：扫描 Steam 的 `appworkshop_431960.acf` 清单，读取已安装项目中的预览图。

默认路径示例：

```text
D:\steam\steamapps\workshop\content\431960
```

## Wallpaper Engine 的限制

系统只读取本机已经安装的项目预览图，并把本地路径保存到网易云用户配置中；不会把 Workshop 原图、视频、项目文件或解包内容复制进仓库，也不会自动上传到 GitHub。

动态壁纸、视频壁纸和 Web 壁纸如果没有可用的 `preview.jpg`/`preview.png`，请先在 Wallpaper Engine 中截取一张预览图，再通过“选择本地图片并生成”导入。

生成后的主题保存的是：

- 自动提取出的颜色令牌；
- 本地壁纸路径；
- 当前主题的显示参数。

## 发布社区主题的版权要求

个人本地使用和公开分发要分开处理。不要把 Steam Workshop 原始文件、游戏/动漫宣传图、专辑封面或没有明确许可证的壁纸直接提交到 GitHub。公开主题包应当只包含自己创作的素材，或者包含明确允许修改和再分发的素材，并附带：

- `LICENSE`；
- `CREDITS.md`；
- 原作者和来源；
- 原始许可证；
- 对裁剪、调色、模糊等修改的说明。

如果只是使用某个开源主题的配色，应在 `CREDITS.md` 中注明配色来源；不要直接复制其他软件的整套 CSS 选择器。
