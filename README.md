# BetterNCM Community

面向新版网易云音乐客户端维护的 BetterNCM 社区版本。

> [!NOTE]
> 本项目是非官方社区维护的派生版本，与网易云音乐官方及原项目维护者不存在隶属、授权或背书关系。

## 当前兼容性

- 已在 64 位网易云音乐 `3.1.38.205386` 上完成代理 DLL、主界面和插件管理器的实际运行验证。
- 当前社区版版本：`1.5.0`。
- 兼容目标：网易云音乐 `2.10.* ~ 3.1.*`；其他版本需要单独测试。

## 社区版更新

管理页面不再自动请求任何旧项目更新服务器；“查看社区版发布”按钮仅打开本仓库的 GitHub Releases：

- 仓库：<https://github.com/lfggdryvddi-jpg/BetterNCM-Community>
- 发布页：<https://github.com/lfggdryvddi-jpg/BetterNCM-Community/releases>

按钮不会在线比较版本，也不会自动下载或替换网易云目录中的 DLL。是否有新版本由使用者在本仓库 Release 页面确认，并在备份后手动安装。

## 安装

1. 完全退出网易云音乐，并在任务管理器中确认 `cloudmusic.exe`、`cloudmusicn.exe` 已结束。
2. 备份网易云音乐安装目录。
3. 按网易云架构选择社区版 Release 中的构建文件。
4. 将 x64 构建部署到 64 位网易云安装目录；32 位版本使用 x86 构建。
5. 启动网易云音乐，通过右上角 BetterNCM Community 图标打开插件管理器。

本机维护环境使用：

```text
网易云目录：D:\CloudMusic
数据目录：D:\A软件安装\BetterNCM\Data
```

这些本机路径仅作当前测试记录，不应作为其他电脑的固定安装路径。

## 本社区分支的改进

- 同时钩取 CEF 的异步与同步浏览器创建接口，适配新版网易云的调用方式。
- 同时支持 CEF `read()` 与旧版 `read_response()` 资源读取回调。
- 修复 CEF 91 下资源读取接口选择错误导致的主窗口缩成 `18×18` 或页面无法加载问题。
- 修复 CEF 回调为空时的崩溃路径、版本信息读取失败未返回值、API 线程析构不安全等问题。
- 将管理页面、欢迎页、仓库入口和发布入口迁移到本社区仓库。
- 移除对旧配置服务器、旧二进制更新源和硬编码插件镜像的自动访问。
- 将构建所需的前端框架与 CEF 头文件直接纳入本仓库，不再依赖原组织的 Git 子模块。

## 社区皮肤

社区版现在包含独立的本地主题系统，管理页内置“网易云原色”“午夜深紫”“极光青蓝”和“玻璃玫瑰”四套主题，并支持导入本地 CSS 皮肤。主题设置保存在当前网易云用户配置中，恢复默认即可撤销社区主题覆盖。

皮肤作者可以参考 [skins/README.md](skins/README.md) 和 [skins/template/](skins/template/) 制作主题。第一版只执行用户主动选择的 CSS 文件，不自动下载旧项目插件市场资源，也不接受 CSS 中的 JavaScript 或远程导入。
## 构建

当前维护环境：

```text
MSBuild: D:\A软件安装\VisualStudio\BuildTools\MSBuild\Current\Bin\MSBuild.exe
vcpkg:   D:\A软件安装\vcpkg
Ninja:   D:\A软件安装\Ninja
```

构建命令：

```powershell
& 'D:\A软件安装\VisualStudio\BuildTools\MSBuild\Current\Bin\MSBuild.exe' `
  'D:\Codex项目文件夹\BetterNCM\_publish\BetterNCMII.sln' `
  /m /p:Configuration=Release /p:Platform=All /v:minimal
```

## 来源与许可证

本仓库是 BetterNCM / chromatic 的派生作品。技术维护、更新渠道和发布流程已经独立，但 GPL-3.0 许可证、原作者版权信息和 Git 历史必须保留；“独立维护”不等于删除法定署名。

详细来源说明见 [NOTICE.md](NOTICE.md)，许可证全文见 [LICENSE](LICENSE)。
