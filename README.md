# WBG-box

微信小程序游戏合集，包含 **数织**、**扫雷** 和 **塞车场** 三款游戏，支持排行榜与好友双人对战。

## 功能

- **数织**：WXML 网格渲染，单机解谜 + 好友竞速对战
- **扫雷**：Canvas 2D 渲染，点击翻开 / 长按插旗，单机 + 同地图竞速对战
- **塞车场**：WXML 块状网格，滑动横/竖车辆，让红色主车从出口开出；内置 BFS 求解器验证关卡并提供提示
- **排行榜**：
  - 数织解密时间榜（越短越靠前）
  - 数织最高分榜
  - 扫雷最高分榜
- **好友对战**：分享卡片邀请 → 云开发 watch 实时同步进度 → 先完成者胜

## 项目结构

```
miniprogram/          # 小程序前端
  pages/              # 大厅、排行榜、对战房间
  games/              # 游戏子包（数织、扫雷、塞车场）
  services/           # 云函数调用、对战 watch
cloudfunctions/       # 云函数
  submitScore/        # 提交成绩
  getLeaderboard/     # 查询排行榜
  createRoom/         # 创建对战房间
  joinRoom/           # 加入房间
  updateRoom/         # 准备 / 进度同步
  finishBattle/       # 判定胜负
```

## 快速开始

### 1. 导入项目

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 选择「导入项目」，目录指向本仓库根目录
3. 填入你的 AppID（测试可用测试号）

### 2. 开通云开发

1. 在开发者工具中点击「云开发」，创建环境
2. 在 `miniprogram/app.js` 中确认 `wx.cloud.init()` 已启用
3. 右键 `cloudfunctions` 下每个云函数目录 → **上传并部署：云端安装依赖**

### 3. 创建数据库集合

在云开发控制台 → 数据库，创建以下集合：

| 集合名 | 用途 |
|--------|------|
| `rooms` | 对战房间 |
| `leaderboard_nonogram_time` | 数织用时榜 |
| `leaderboard_nonogram_score` | 数织高分榜 |
| `leaderboard_minesweeper_score` | 扫雷高分榜 |

**索引建议**（在各集合「索引管理」中添加）：

- `leaderboard_nonogram_time`：`(puzzleId 升序, timeMs 升序)`
- `leaderboard_nonogram_score`：`(puzzleId 升序, score 降序)`
- `leaderboard_minesweeper_score`：`(puzzleId 升序, score 降序)`

**安全规则**（开发阶段可用宽松规则，上线前收紧）：

```json
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

`rooms` 集合建议仅允许云函数写入，客户端通过云函数操作。

### 4. 运行

编译后在模拟器或真机预览。单机游戏无需登录即可本地游玩；排行榜与对战需云开发环境正常。

## 对战流程

1. 在游戏页点击「邀请好友对战」→ 创建房间
2. 点击「邀请好友」分享卡片给好友
3. 好友从分享链接进入 → 自动加入房间
4. 双方点击「我已准备」→ 自动开局
5. 数织：同一谜题，先正确完成者胜
6. 扫雷：同一地图 seed，先清完且未踩雷者胜；踩雷直接判负

## 技术栈

- 微信小程序原生（WXML / WXSS / JS）
- 扫雷 Canvas 2D 渲染
- 微信云开发（云函数 + 云数据库 + watch 实时监听）

## 后续可扩展

- 开放数据域好友排行榜
- 每日挑战自动生成谜题
- 更多小游戏子包
- 对战胜场统计
