# 数据帝国：离线资本实验室（PC 挂机版）

这是一个原创的数据经济挂机游戏（单机版）。

## 运行方式

1. 双击 `run.bat`。
2. 浏览器会打开 `index.html`，即可开始游戏。

## 游戏特点

- 数据、算力、用户、影响力多资源联动
- 建筑扩张 + 策略升级
- 常规养成节奏，基础建筑自带保底现金流，避免断粮
- 随机市场事件（利好/利空）
- 阶段任务奖励
- 重构时代（转生遗产点）
- 三栏位独立存档（可切换、可覆盖开新档）
- 栏位存档支持彻底删除（不可恢复）
- 本地自动存档 + 离线补算 + 存档导入导出

## 文件说明

- `index.html`：页面结构
- `styles.css`：视觉样式
- `game.js`：核心逻辑
- `run.bat`：Windows 快速启动
- `pack.ps1`：打包 zip
- `notify_telegram.ps1`：Telegram 状态通知（支持自动读取 openclaw 配置）
- `send_to_telegram.ps1`：通过 Telegram Bot 发送 zip
- `publish_to_github_pages.ps1`：一键发布到 GitHub Pages（完成后自动通知）

## 打包

在 PowerShell 中运行：

```powershell
.\pack.ps1
```

生成文件：`release\data-empire-idle.zip`

## Telegram 发包

运行：

```powershell
.\send_to_telegram.ps1
```

如果你还没 zip，可先运行：

```powershell
.\send_to_telegram.ps1 -AutoPack
```

> 默认会自动读取 openclaw 配置里的 bot token/chat id。也支持手动传 `-BotToken` 与 `-ChatId`。

## 发布到 GitHub Pages

```powershell
.\publish_to_github_pages.ps1
```

执行后会：

1. 自动创建/复用 GitHub 仓库（默认 `data-empire-idle`）
2. 推送当前项目到 `main`
3. 开启 GitHub Pages（`main` 分支根目录）
4. 通过 Telegram Bot 发送完成通知（含访问地址）
