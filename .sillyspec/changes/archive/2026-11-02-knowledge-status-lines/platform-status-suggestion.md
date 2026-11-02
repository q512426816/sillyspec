# 平台 known-issues 状态建议清单（只读，未写入）

| 建议状态 | heading |
|---|---|
| 观察 | 🟡 sillyhub-daemon 于 2026-06-14 从 Python 重写为 Node.js |
| 现行 | 🔴 CI hook 复合命令可绕过 claude PreToolUse 层 |
| 已修复 | 🟢 daemon 重启 session 恢复已修复（gap-8.3 / commit 40e21d3） |
| 观察 | 🟡 AgentRunLog 无 metadata 列 / 三层日志 metadata 丢失 |
| 现行 | 🟢 本机可能存在多个 daemon 实例 |
| 观察 | 🟡 Docker backend 容器不热重载（挂载非 /app、无 --reload） |
| 已修复 | 🟢 frontend healthcheck busybox 误报问题已解决（commit 46591be0） |
| 观察 | 🟡 daemon pnpm overrides 把 claude-agent-sdk 8 平台二进制硬钉 0.3.181 |
| 现行 | 🟢 frontend react-query 已正式启用（2026-07 OpenAPI 类型迁移，commit fecaa155 / 2 |
| 观察 | 🟡 frontend 与 daemon 各自独立 lockfile + 双 UI 库并存 |
| 观察 | 🟡 audit_hooks 只在测试 lifespan 注册，生产审计要业务代码显式写 AuditLog |
| 观察 | 🟡 全 Docker 部署本地 PG 容器端口未映射 host，host 跑 alembic/pytest 连不上 |
| 观察 | 🟡 ppm 导出 export-excel 路由必须前置于 item_id 路由 |
| 现行 | 🔴 alembic 并行变更撞 revision 多 head：启动 crash-loop |
| 现行 | 🔴 前端测试闸门缺口：gen:types:check 未进 CI，E2E 零落地 |
| 观察 | 🟡 mcp Python SDK 锁死 v1 线：v2 移除 FastMCP 与平台 mount 冲突 |
| 观察 | 🟡 Windows Docker bind mount stat 性能断崖：spec_root fs 重循环必炸 |
| 债务 | 🟡 worktree 过期租约无自动 GC：expires_at 与索引闲置 |
| 观察 | 🟡 spec_guardian 死代码与 tool_gateway 注释失配：守护门从未在生产生效 |
| 现行 | 🟢 daemon 三个 3000+ 行 god 文件（daemon.ts 4047 / session-manager.ts 3897 / |
| 现行 | 会话日志 TOOL_RESULT 中文乱码（Windows 控制台码页，落库即坏不可导出还原） |
| 观察 | 🟡 后台任务写通道宽限无界（hasBackgroundTaskGrace 无 TTL，R-01 已接受观察项） |
| 已修复 | 🟢 2026-06-05 — sync_stage_status 找不到 change_key 的 dual-db 问题（已修复） |
| 已修复 | 🟢 2026-06-05 — auto_dispatch_next_step 只在 has_pending_step 时触发（已修复） |
| 已修复 | 🟢 2026-06-05 — complete_stage 不调用 reparse 导致文档不全（已修复） |
| 已修复 | 🟢 2026-06-17 — login_enabled 必须在 get_current_user 检查，不能只在 login 入口（co |
| 已修复 | 🟢 2026-06-19 — alembic.ini 注释含 UTF-8 em-dash 导致 Windows gbk configpar |
| 已修复 | 🟢 2026-06-20 — cursor-agent 官方 ps1 版本目录正则不匹配新版目录命名，导致 cursor 完全不可用（已修 |
| 已修复 | 🟢 2026-06-21 — ETL 迁移函数执行顺序依赖 maps 构建时机，ppm 模块整表成孤儿（已修复） |
| 观察 | 🟡 2026-06-26 — daemon allowed_roots 只管 list_dir RPC，不管 CC 执行 cwd |
| 观察 | 🟡 2026-06-30 — install.sh 改动需重建 backend 镜像才下发（baked into image）+ bash |
| 观察 | 🟡 2026-07-01 — Next.js rewrite proxy 对长请求 socket hang up + daemon 分发以 |
| 已修复 | 🟢 2026-07-13 — backend rebuild apt 连不上 deb.debian.org（base image dige |
| 已修复 | 🟢 2026-07-13 — install.sh WSL 下 1c/1d 盘符转换 bug（/e/ vs /mnt/e/）+ CMD b |
| 已修复 | 🟢 2026-07-13 — install.sh WSL 下 $USER ≠ Windows 用户名（拼 /mnt/c/Users/<n |
| 已修复 | 🟢 2026-07-29 — SILLYSPEC_MASTER_KEY 非 hex 值致 get_cipher() 裸 ValueErro |
| 观察 | 🟡 AgentMission.session_id 列非 NULL 不可信：判别口径须查表确认指向真实 AgentSession |
| 观察 | 🟡 2026-08-24 — 后台子代理脱离平台 running turn 后权限回调 fail-closed 死锁（已有宽限缓解） |
| 已修复 | 🟢 daemon sessions /events 字面量路由被 /sessions/{session_id} 参数路由吞掉（FastAP |
| 观察 | 🟡 2026-08-26 — antd v6 实测三坑：Image 无 wrapperClassName、Modal 语义 styles. |
| 现行 | wt-commit 的 -- 路径分隔符被 PowerShell 5.1 吞掉——用 --pathspec-from-file |
| 观察 | 🟡 require_permission 隐式 Path(workspace_id) 依赖：平台级（无 ws 前缀）端点直接 422 |
| 观察 | 🟡 .zcode 部分 skill 文件在 main 是已跟踪文件：git rm --cached 会把分支做成「删除态」 |
| 现行 | 🟢 生产小内存服务器（1.6G）容器内跑大模型嵌入不可行——本机嵌入+SSH 隧道直写生产库 + 六连坑（已定案） |
| 已修复 | 🟢 平台 spec 清单唯一索引静默损坏（容器反复被杀后遗症）——归档后平台仍显示「进行中」+ spec-sync 恒 422（已修复） |
| 已修复 | 🟢 本地 docker 平台同款索引静默损坏复发——免去重 REINDEX 分叉 + amcheck 必须 JOIN pg_am 过滤 b |
| 债务 | 🟡 平台知识搜索「首搜建库地雷」——未建索引工作区的第一次搜索必超时（大语料 OOM 整栈停摆） |
| 观察 | 🟡 agent 沙箱把 python.exe 子树 IL 降为 Low：python→msys 嵌套必崩、profile 写被驱动白名单拦 |

> 判据：emoji（🟢→已修复/现行、🟡→债务/观察、🔴→现行）+ 标题词（已修复/已解决/已退役）+ 正文语义。词表现行/已修复/已解决/已退役/观察/债务。平台仓主复核后自行落盘。
