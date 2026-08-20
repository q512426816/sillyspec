---
author: qinyi
created_at: 2026-06-03T10:02:00+08:00
doc_type: improvement
---

# Scan 子项目文档缺失

## 问题

`scan` 阶段只为主项目生成 `docs/<project>/scan/` 和 `modules/`，已注册的子项目不会生成独立文档。

### 根因

1. `run.js` 的 `outputStep()` 只接收单个 `dbProjectName`，prompt 里的 `<project>` 被替换成唯一一个项目名
2. scan 的 step prompt 也只针对单个项目写路径（`.sillyspec/docs/<project>/scan/...`）
3. Step 1 探测到子项目后只建议注册，后续步骤不消费注册结果
4. 整个 run 体系是单项目设计，没有"遍历所有已注册项目"的循环

### 实测结果

执行 scan 后：
- ✅ `.sillyspec/docs/sillyspec/scan/` — 7 份文档
- ✅ `.sillyspec/docs/sillyspec/modules/` — 5 个模块卡片
- ❌ `.sillyspec/docs/dashboard/scan/` — 不存在
- ❌ `.sillyspec/docs/dashboard/modules/` — 不存在

## 改进方向

### 方案 A：scan 内循环（轻量）

scan step 4/5/7/8 的 prompt 改为"遍历 `.sillyspec/projects/*.yaml`，对每个项目分别执行"。
不改动 run.js，但 prompt 会变长，主 agent 理解负担重。

### 方案 B：run.js 多项目支持（中等）

run.js 新增项目循环能力：
- 检测 `.sillyspec/projects/*.yaml` 中所有项目
- 对每个项目分别执行 scan 阶段
- 每个 project 独立生成 docs 和 modules
- 需要改 outputStep 和 stage 执行逻辑

### 方案 C：workflow 统一（远期）

子项目扫描作为 scan-docs workflow 的 role，每个注册项目是一个独立的 workflow 实例。
依赖 workflow spec 实现。

## 建议

短期用方案 A（只改 scan.js prompt），中期用方案 B（run.js 改造）。方案 C 等 workflow spec 落地后自然覆盖。

**优先级：中。不阻塞 workflow-spec Phase 0，但应该在 Phase 2（scan step 5 引用 workflow spec）之前解决。**
