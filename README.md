
<div align="center">
  <image width="120em" src="https://user-images.githubusercontent.com/66859419/183120498-1dede5b4-0666-4891-b95f-c3a812b3f12f.png" />
  </div>
<h1 align="center">BetterNCM</h1>

<h4 align="center">PC版 NCM 客户端插件管理器</h4>
> [!NOTE]
> 本项目是 BetterNCM 的非官方社区维护分支，与原作者及网易云音乐官方不存在隶属、授权或背书关系。
> 
> This is an unofficial community-maintained fork. It is not affiliated with or endorsed by the original authors or NetEase Cloud Music.
> 

> [!WARNING]
> 由于网易云国语版权太不齐，开发者去用 QQ 音乐了，此项目处于较低维护优先级..
> 
> 插件 Pull Request 依然会被处理，插件源服务器将持续维护，Issues 的处理享有极低优先级
> 
> 可能在后期进行重构支持更多客户端后复活

<h4 align="center">
<a href=https://github.com/MicroCBer/BetterNCM/wiki/%E5%BC%80%E5%8F%91%E6%96%87%E6%A1%A3>开发文档</a> · 
<a href=https://www.bilibili.com/video/BV1k44y197Fb/>介绍视频</a> · 
<a href=https://v2e2npdz15.feishu.cn/docx/UZkSd9d46o4fVOxaPNBcGXSenme>用户文档（社区）</a> · 
<a href=https://microblock.cc/betterncm/>项目页面</a>

</h3>

<div align="center">
  <image src="https://user-images.githubusercontent.com/66859419/215995178-82ec6501-b70f-4503-9e11-528399726e3a.png" />
</div>

![image](https://github.com/MicroCBer/BetterNCM/assets/66859419/9765fc45-a22b-4469-a015-e6b33b14418c)


---

兼容版本：`2.10.* ~ 3.1.*`（已针对 3.1.38.205386 验证资源结构与 CEF 导出）



# 安装

使用 [BetterNCM Installer](https://github.com/MicroCBer/BetterNCM-Installer) 一键安装~

# 其他
## 相关
- [BetterNCM 生态组织](https://github.com/BetterNCM)
- [插件商店 下载量统计 仓库](https://github.com/BetterNCM/BetterNCM-PluginMarket-Analyze)
- [插件商店 插件源 仓库](https://github.com/BetterNCM/BetterNCM-Plugins)
- [Star History](https://api.star-history.com/svg?repos=MicroCBer/BetterNCM&type=Date)

## 本 fork 的兼容性改进

- 同时钩取 CEF 的异步与同步浏览器创建接口，适配新版本网易云不再优先调用同步接口的情况。
- 同时支持 CEF read() 与旧版 read_response() 资源读取回调，避免插件的 HTML 劫持在新客户端中失效。
- 修复 CEF 回调为空时的崩溃路径、版本信息读取失败时未返回值、API 线程析构不安全等问题。
- 当前本机检测到的网易云版本为 3.1.38.205386；资源包仍使用 CEF 91，并保留 orpheus://orpheus/pub/app.html 入口。

> 注意：本项目仍然需要使用与目标网易云客户端架构匹配的注入器与 CEF 头文件/库。建议先备份网易云安装目录和 C:\betterncm 数据目录。
