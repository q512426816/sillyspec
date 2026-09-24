---
author: qinyi
created_at: 2026-09-24 03:11:30
---
# E2E 验收实录 — 2026-09-24-change-events-r11（task-05）

> 时间：2026-09-24 03:07–03:12（本地）。环境：worktree 内 dev 后端（uvicorn 127.0.0.1:8011，
> 独立 E2E 库 `platform_r11_e2e`——不碰共享 dev 库；alembic upgrade head 全量迁移含新表
> 20260924030000）+ Next dev（127.0.0.1:3311，INTERNAL_API_BASE_URL=8011）。
> 播种（正规路径）：workspace `ws-r11-e2e` + 平台管理员 `r11-e2e@example.com` +
> `shpsync_` token（PlatformSyncTokenService.create）+ changes 行（change_key=
> 2026-09-24-change-events-r11，供详情页导航）。

## 1. curl 推 5 条（含 2 warning）→ 全 200

```
POST /api/changes/2026-09-24-change-events-r11/events  (Authorization: Bearer shpsync_…)
5 次单对象推送（id=e2e-evt-1..5，ts=03:11:00Z..03:15:00Z，severity=info/warning/info/warning/info）
→ 5× {"accepted":1,"deduplicated":0,"truncated":0}
```

## 2. GET 正序

```
GET …/events → total:5，ts 升序：
03:11:00Z info / 03:12:00Z warning / 03:13:00Z info / 03:14:00Z warning / 03:15:00Z info
（detail 原文透传：{"pulse":n,"files":n+2}）
```

## 3. 去重（幂等）

```
重推 e2e-evt-1（同 id，同 ts）→ {"accepted":0,"deduplicated":1,"truncated":0}
GET total 仍 5（不增行）
```

## 4. since 增量

```
GET …/events?since=2026-09-24T03:13:00Z → total:2（03:14:00Z、03:15:00Z）——严格大于语义
```

## 5. 鉴权矩阵（真实 dev 服务）

| 调用 | 结果 |
|---|---|
| 无凭据 POST | 401 |
| 无凭据 GET | 401 |
| JWT（平台管理员登录换真 token）POST 写通道 | **403**（写通道仅 shpsync_） |
| JWT GET 读通道 | 200，total:5（管理员并集可见） |
| shpsync_ POST | 200 |

## 6. 面板核验（前端）

- **组件浏览器路径实测**：Next dev（:3311）下 `GET /api/changes/{name}/events`
  （相对 /api/* 经 Next rewrite → 8011，携带浏览器 JWT）→ `"total":5`——组件在浏览器
  发出的确切请求形态全链路通。
- **详情页路由**：`/workspaces/{ws}/changes/{cid}` 200（Next 壳渲染，client 侧挂载点在）。
- **交互面（默认展开/琥珀高亮/角标/provisional 悬停）**：由组件测试四组 5 用例覆盖
  （`frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`：渲染/
  高亮（warning 行 border-amber-300+bg-amber-50）/空态/角标计数+一次性展开），全部通过。
- **限制披露**：本受试会话为子代理上下文，宿主浏览器工具不可用（`Browser is not
  available in subagent`）——未做真人浏览器截图级核验；以上代理链路实测 + 组件测试为
  替代证据，如实记录。

## 7. 结论

任务书验收清单：
- [x] dev 后端起服，curl 推 5 条（含 2 warning）→ GET 正序去重（§1–§4）
- [x] 面板高亮与徽标：组件测试实证 + 浏览器同路径请求链路实测（§6，限制已披露）
- [x] 测试全绿（按 CLI 门禁实测口径）：backend 252 passed / frontend 组件 5 + 既有面 374 passed
- [x] 文件冲突显式 pathspec 隔离（全程 add+commit 同一显式清单）
