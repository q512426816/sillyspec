---
author: qinyi
created_at: 2026-08-10 12:11:46
---

# 需求规格（Requirements）

## 角色

- **调度者/Agent**：tier=independent 变更里负责派独立审查子代理、并在子代理产出后收尾跑 gate 的主 agent。本命令的使用者。
- **独立审查子代理**：产出真实 verdict/checklist 的子代理（本命令为其修 mechanics 或预建 run 目录）。

## 功能需求

### FR-01：手动注册 stage review（骨架模式）
`sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute>`（无 --from）产出一份 schema 合法的 `cannot_verify` 骨架 review.json：
- 必填字段全：schemaVersion=1 / reviewType=STAGE_REVIEW_TYPE[stage] / specVerdict=qualityVerdict='cannot_verify' / reviewedFiles[0]='changes/<change>/<mainDoc>' / docHash / 非空 requiredEvidence / reviewerNotes 标骨架来源。
- 通过 `validateStageReviewSchema` + `validateStageReview`（含 docHash 真实性）。
- 覆盖 D-002（命令名）/ D-005（cannot_verify）/ D-006（stage 映射）/ D-008（复用常量）。

### FR-02：docHash 由 CLI 自动算
骨架与 adopt 的 docHash 必须等于 `computeDocHash(<specBase>/changes/<change>/<mainDoc>)` 的 sha256 hex，非占位。覆盖 D-003（翻 P6.1b defer，仅 scaffold 路径）。

### FR-03：写 marker（治死锁）
命令必须写 `current-stage-review-run-id-<stage>-<change>` marker，内容为生成的 `review-<ts>` runId（`/^review-/` 前缀）；`getLatestStageReviewRunId` 能读到同值。marker 已存在时 warn 不阻断，覆盖为最新。

### FR-04：--from adopt 模式
`--from <file>` 读 agent 草稿 → 过 `validateStageReviewSchema` → 保留 specVerdict/qualityVerdict/checklist/reviewerNotes/requiredEvidence → 覆盖 docHash 为真实值 + 规范化 reviewedFiles[0] → 写 canonical run 目录 + marker + 自检过。fromFile 路径解析：`existsSync(fromFile)` 否则 `join(cwd, fromFile)` 兜底，都不在则 throw 中文。覆盖 D-007。

### FR-05：错误处理（throw 中文）
非法 stage / changeName 空 / 主文档缺失 / --from 文件不存在 / --from schema 不过 → `throw new Error('中文消息')`，CLI case 捕获打印 + exit 1（对齐 CONVENTIONS 本地校验 throw 中文）。

### FR-06：纯增量不破坏现有
不改动 `enforceReviewJsonGate` / `validateStageReview` / `getLatestStageReviewRunId` / `backfill-reviews` / `generateTaskReviewDrafts` 任何现有逻辑。覆盖 D-001（仅 stage 级）/ D-004（仅手动）/ D-009（代码组织方案 B）。

## 非功能需求

- **NFR-01 兼容性**：纯新增导出函数 + CLI case；review.json schema 不变（REVIEW_SCHEMA_VERSION 仍 1）；progress.db 表结构不变；marker 格式不变。
- **NFR-02 可测性**：registerStageReview 是同步纯函数（参数→IO+返回），tmpdir fixture 可单测。
- **NFR-03 跨平台**：路径用 join，无平台硬编码；Windows/Linux/macOS 一致。
- **NFR-04 回退**：删函数 + case + test 即完全回退，无数据迁移。

## 决策覆盖矩阵（requirements ↔ D-xxx@vN 当前版本）

| D-xxx@vN | 覆盖 FR | 状态 |
|---|---|---|
| D-001@v1（仅 stage 级） | FR-06 | accepted |
| D-002@v1（命令名 register-stage-review） | FR-01 | accepted |
| D-003@v1（scaffold 自动算 docHash，翻 P6.1b） | FR-02 | accepted |
| D-004@v1（仅手动触发） | FR-06 | accepted |
| D-005@v1（verdict=cannot_verify） | FR-01 | accepted |
| D-006@v1（--stage 复用常量映射） | FR-01 | accepted |
| D-007@v1（保留 --from） | FR-04 | accepted |
| D-008@v1（复用原料函数） | FR-01 | accepted |
| D-009@v1（方案 B 函数入 stage-review.js） | FR-06 | accepted |

全部 D-001@v1 ~ D-009@v1 当前版本均已覆盖，无未覆盖决策，无剩余风险。

## 验收（verify 阶段对账）

- 给真实 change 跑 `register-stage-review --stage brainstorm`（骨架）+ `--from`（adopt），产出的 review.json 通过 `validateStageReview`（enforceReviewJsonGate 同源 schema 校验，gates.js Stage Review Gate 路径）。
- npm test 全量 EXIT=0（含新 test/stage-review-register.test.mjs）；npm run lint 绿（含 test/ 内容规则）。
