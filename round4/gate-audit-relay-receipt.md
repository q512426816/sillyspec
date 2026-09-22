# 审计带话落地回执（2026-09-21，写给 gate-value-audit.md 作者）

对照 [gate-value-audit.md](gate-value-audit.md) 末尾「必须转达给改第 5 项会话」的三条，逐条回执：

## ① fail-fast 前置（死信检查挪到门禁前）——已落地（83d91cd4，先于本回执）

module-impact 死信探针 + 预填注清零 error 门整块移到 verify test/lint 实测门之前，纯排序零语义变化。补充实证：R4-S-F 会话 db 计数死信拦 1 次 + **lint 硬拦 7 次**（比「两轮」更惨，166min 形状大半是这两件叠加）。

## ② lint 范围化覆盖 verify 门——已落地（83d91cd4，与①同笔）

采用**归属鉴定降档**而非 `{files}` 占位符（multi-agent-platform 的 lint 是 `cd backend && ruff && mypy && cd ../frontend && pnpm lint` 链式命令，全局文件列表无法安全替换进各子命令；归属鉴定对任意命令形状成立）：失败输出提及文件 × 变更文件集**零交集 = HEAD 存量债 → advisory 放行**；有交集 / 输出无可识别路径（unattributable，纯配置错误类）→ 维持硬拦保守。quick + verify 两门同接，你点名的 R4-S-F 两个 ruff 债文件场景在新规则下第一轮就是 advisory。

## ③ 模块粒度范围化 + 600s 超时帽——本笔回执（超时半已落码；模块半是「配置补全」不是「新建机制」）

**重要修正：模块粒度范围化机制早已存在**——`test_strategy: module` + `modules:` 块（inline flow `name: {path, test}`）自 v3.24 建成，v3.29.3 起 `modules:` 在场即缺省收窄到 module 子集（ql-20260920-010）。考古期 227 次全量跑的成因：当时模块映射只配了 16 个条目（注释可见 08-01/08-10/08-20/08-22 逐次补录史）+ 更早版本缺省 full。你的「文件粒度会漏、模块粒度保真拦」结论与已建成机制的语义一致（命中=触碰模块全套测试），无需新建设计。

已做的两件事：
1. **超时改判落码**（本笔提交）：`isTimeoutOnlyTestFailure` 纯函数 + verify/quick 两门接线——纯超时（所有失败单元 reason 均超时、无任何挂测）→ advisory 降档带三路处置指引；任一真实挂测维持硬拦（你的 12 次真拦防线不动）。36 次假拦桶根治。
2. **平台仓 modules 块补全**（机器本地 local.yaml，不入库）：22 个缺失 backend 模块 + be-core（backend/tests 核心套）补齐到 39 条目，`extractModules` 解析验证 backend/app/modules 全覆盖——消掉「改到未映射模块 → 0 命中跳测 / 混合命中漏跑」陷阱。沿用既有约定（`-q --no-cov -n auto`）；脆弱用例处置（daemon fragile 三件套独跑等）原样保留。

## 剩余开放项（不抢跑，留给你/后续会话拍板）

- **尾截 46 次不可判**：工件只存 output_tail 的局限。模块子集启用后单模块输出短、尾部覆盖率天然升，预计大幅缓解；要不要再扩 output_tail 上限或落全量日志，等新数据说话。
- **真拦 12 次的反事实**（不拦会不会被 pre-commit/CI 兜住）：同意你「拿不到」的判断，不追。
- **lint 台账明细滚动窗口太短**（真拦率算不了）：小刀口，随批可修。
- **平台仓 local.yaml 的持久化**：modules 块在机器本地文件里，换机即丢——建议把 39 条目镜像进 local.yaml.example（入库）由仓主拍板。

## R4 终态通报

R4-S-F 已归档（22:14→01:00，~166min，db 硬账）；R4-L / R4-O-L 状态未查（本会话聚焦修复）。全量核算收口 H1-H6 等你终态后出——判定线在 prereg.md，别忘 269min 对照臂是 Fork 续跑（混杂已声明）。
