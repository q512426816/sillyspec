---
author: qinyi
created_at: 2026-09-21 11:48:13
---
# 提案书（Proposal）— R5 效率优化第 1 批

## 动机
R4 对照实验实测大任务账单当量 2.4×（扇出面 42.3M 名义 tokens），db 级验靶进一步实证扇出体量 97% 是「轮数 × 上下文」缓存重发而非读取越界——需要压两个乘数 + 摊平重复重建 + 给 R5 防线回归硬门一个可机械执行的判法。

## 关键问题
1. task-08 型实现子代理轮均上下文 148K（同侪 1.6–3 倍）：契约链大文件（组件 78KB/测试先例 37KB/design 15KB+prototype 14KB）全量进上下文，无 CLI 裁剪通道。
2. plan 阶段无并批默认：文件正交任务各自单发子代理，design/plan 上下文被重复重建（R4-S-F 实证 5 任务 2 batch 时 execute 仅 6M/17min）。
3. 子代理返回体无契约：实现细节整段贴回主会话，审查回收转述冗长——主会话 377K 峰值与 >150K 请求占比 81% 的贡献项。
4. R5 验收「防线回归」硬门只有 transcript 判法，无可机械复跑的错键类用例。

## 变更范围
B-③ plan 并批默认（提示词 + plan-postcheck warning advisory + 并发护栏不变式）/ B-④ execute 材料包（两段式只摘不译 + 24KB 上限）/ B-⑥ 轮数纪律 + C-1 B1 返回契约 + B2 回收瘦身（execute 派发 prompt）/ 错键探针套件（fixtures + verify-probes 原语断言）。

## 不在范围内（显式清单）
- 不做 B-② 调研 digest、C-2 handoff enrich、C-3 自动分段、B-⑤ 模型分级
- 不动四道防线判定语义 / 四律请求钳 / allowed_paths 门禁 / 状态机 / DB schema
- 不做 CLI 渲染增量化（B3a 候选 C1 另项）

## 成功标准（可验证）
- 既有测试全量零回归 + lint 过（npm test / npm run lint）
- buildWavePrompt 渲染含材料包行/轮数纪律/返回契约/回收瘦身四段（文本钉测试）
- assembleExecuteTaskMaterials 产出两段式材料包：稳定段先行、超限截尾锚点不丢、原文逐字（无转写）
- plan-postcheck 对正交未并批/护栏缺口产出 warning（不阻断，门禁轮次不增）
- 错键 fixtures 被 verify-probes 键原语判不匹配（防线敏感性机械可证）
