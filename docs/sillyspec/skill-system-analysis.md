# SillySpec 技能体系完整分析

> 生成时间：2026-08-24
> 分析范围：`.claude/skills/` 下全部 21 个 SKILL.md 文件

---

## 一、技能总览（21 个）

| # | 技能名 | 类别 | 一句话描述 |
|---|--------|------|-----------|
| 1 | `sillyspec:init` | 流程-绿地 | 绿地项目初始化：深度提问 → REQUIREMENTS.md → ROADMAP.md → PROJECT.md |
| 2 | `sillyspec:scan` | 流程-分析 | 扫描棕地项目代码库，生成 7 份架构文档 + 模块映射 |
| 3 | `sillyspec:brainstorm` | 流程-设计 | 需求澄清 + 技术方案设计，产出 design/proposal/requirements/tasks 四件套 |
| 4 | `sillyspec:propose` | 流程-设计 | 补全结构化规范：proposal + design + tasks（快速生成四件套） |
| 5 | `sillyspec:plan` | 流程-规划 | 将 design 拆解为 Wave + Task 可执行计划 |
| 6 | `sillyspec:execute` | 流程-实现 | 按 plan 的 Wave/Task 逐步实现代码（worktree 隔离） |
| 7 | `sillyspec:verify` | 流程-验收 | 对照 design.md + 模块文档验证实现正确性，产出 verify-result.md |
| 8 | `sillyspec:archive` | 流程-归档 | 归档已验证变更：影响分析 → 模块文档同步 → 移入 archive → 更新 ROADMAP |
| 9 | `sillyspec:quick` | 流程-快速 | 小范围直接任务（≤3 文件），跳过 brainstorm/plan，3 步完成 |
| 10 | `sillyspec:auto` | 流程-自动化 | 全流程自动编排：brainstorm → plan → execute → verify 串联 |
| 11 | `sillyspec:continue` | 辅助-导航 | 自动探测当前状态，判断并执行下一步 |
| 12 | `sillyspec:resume` | 辅助-导航 | 从中断处恢复工作，自动探测进度并建议下一步 |
| 13 | `sillyspec:commit` | 辅助-收尾 | 智能提交：收集变更信息，生成 commit message，确认后提交 |
| 14 | `sillyspec:doctor` | 辅助-诊断 | 全量自检 + 状态修复（进度一致性/数据库完整性） |
| 15 | `sillyspec:state` | 辅助-查看 | 查看当前工作状态（阶段/步骤级别） |
| 16 | `sillyspec:status` | 辅助-查看 | 查看项目整体进度（change 文件级别、各阶段状态） |
| 17 | `sillyspec:explore` | 辅助-探索 | 自由讨论/调研/方案比较（只读，不写代码） |
| 18 | `sillyspec:knowledge` | 辅助-知识库 | 知识库搜索/校验/刷新/提议（Agent-safe） |
| 19 | `sillyspec:workspace` | 辅助-工作区 | 多项目工作区管理（初始化/添加/移除子项目） |
| 20 | `sillyspec:export` | 辅助-导出 | 导出成功方案为可复用模板 |
| 21 | `verify-per-user` | 空壳 | 占位技能（内容仅 `# test`） |

---

## 二、按类别详细分析

### A. 核心流程技能（9 个）— 按阶段串联

#### 1. `sillyspec:init` — 绿地项目初始化

| 维度 | 内容 |
|------|------|
| **触发** | 新项目从零开始；用户说"初始化项目" |
| **前置** | 空目录（非空则建议用 scan） |
| **输入** | 用户口头需求（7 轮深度提问） |
| **产出** | `.sillyspec/REQUIREMENTS.md`、`.sillyspec/ROADMAP.md`、`.sillyspec/PROJECT.md` |
| **后续** | → `brainstorm`（开始第一个功能设计） |
| **铁律** | 不写代码、不装依赖；一次一个问题 |

#### 2. `sillyspec:scan` — 棕地项目扫描

| 维度 | 内容 |
|------|------|
| **触发** | 已有代码库首次接入 SillySpec；用户说"扫描项目、分析代码库" |
| **前置** | 存在代码文件 |
| **输入** | 项目源码目录 |
| **产出** | 7 份扫描文档（PROJECT/ARCHITECTURE/CONVENTIONS/STRUCTURE/INTEGRATIONS/TESTING/CONCERNS）+ `_module-map.yaml` |
| **特殊参数** | `--quick`（≤30 文件，4 份核心文档）、`--standard`（≤200 文件）、`--deep`（完整）、`--diff`（增量漂移） |
| **后续** | → `brainstorm` |
| **铁律** | 写入 `{DOCS_ROOT}/scan/`，不用裸 `.sillyspec/` |

#### 3. `sillyspec:brainstorm` — 需求澄清 + 方案设计

| 维度 | 内容 |
|------|------|
| **触发** | 新功能/架构调整/复杂改造；用户说"先做需求分析、输出技术方案" |
| **前置** | 有项目（scan 完成或绿地 init 完成） |
| **输入** | 用户需求描述 |
| **产出** | `design.md` + `proposal.md` + `requirements.md` + `tasks.md`（四件套） |
| **审核门控** | `tier=independent` 时需独立 QA 子代理产出 `review.json`（reviewType=design） |
| **分叉逻辑** | `scale=large` → plan；`scale=small` → quick（仅 design.md） |
| **特殊机制** | `requiresWait` 步骤支持 `--wait` / `--continue --answer` 用户决策等待 |
| **后续** | → `plan`（large）或 `quick`（small） |

#### 4. `sillyspec:propose` — 快速补全规范

| 维度 | 内容 |
|------|------|
| **触发** | 已有零散设计/需求，需补全四件套；用户说"生成规范、propose" |
| **输入** | 已有设计片段 |
| **产出** | `proposal.md` + `design.md` + `tasks.md`（+ 可选 `requirements.md`） |
| **审核门控** | `tier=independent` 时产出 `review.json`（reviewType=proposal） |
| **后续** | → `plan` |
| **与 brainstorm 区别** | brainstorm 从需求开始完整设计；propose 偏"补全/生成" |

#### 5. `sillyspec:plan` — 实现计划

| 维度 | 内容 |
|------|------|
| **触发** | design 完成后；用户说"拆任务、做计划、排 wave" |
| **前置** | design.md 满足 plan 契约（文件变更清单/风险登记/自审章节） |
| **输入** | `design.md` + `tasks.md` |
| **产出** | `plan.md`（Wave 分组 + Task ID 引用 + 依赖关系）+ `tasks/task-NN.md` 任务蓝图 |
| **审核门控** | `tier=independent` 时产出 `review.json`（reviewType=plan） |
| **契约门控** | 启动前校验 design 契约；完成时校验 tasks.md × plan.md 契约（引用存在性/覆盖恰一次/编号连续） |
| **后续** | → `execute` |

#### 6. `sillyspec:execute` — 代码实现

| 维度 | 内容 |
|------|------|
| **触发** | plan 完成后；用户说"开始写代码、执行任务" |
| **前置** | plan.md 通过 execute 契约校验 |
| **输入** | `plan.md` + `tasks/task-NN.md` |
| **产出** | 代码实现（worktree 中）+ 每 task 的 `review.json` + stage 级 `review.json`（acceptance） |
| **核心机制** | 自动创建 worktree 隔离；依赖门控（depsStatus）；符号影响面报告；Task Review Gate；Stage Review Gate；跨仓 task 支持；SillyHub MCP 可选派发 |
| **批量完成** | 所有 task checkbox 已勾 + 代码核验通过 → 一次 --done 补完全部剩余 step |
| **后续** | → `verify` |

#### 7. `sillyspec:verify` — 验证

| 维度 | 内容 |
|------|------|
| **触发** | execute 完成后；用户说"验证下、检查下、跑 verify" |
| **前置** | execute 所有 task 完成 |
| **输入** | 代码实现（worktree）+ design.md + 模块文档 |
| **产出** | `verify-result.md`（PASS / PASS WITH NOTES / FAIL） |
| **核心约束** | **只读阶段**——禁止改代码/改 git 状态；FAIL 结论阻断完成；integration/deployment-critical 变更 PASS WITH NOTES 降级为 FAIL |
| **探针工具** | `sillyspec verify-probes --init` 自动跑探针 1/3/5/6 并预填骨架 |
| **后续** | → `archive`（PASS 时）或回 `execute`（FAIL 时修复） |

#### 8. `sillyspec:archive` — 归档

| 维度 | 内容 |
|------|------|
| **触发** | verify 通过后；用户说"归档、archive、收尾" |
| **前置** | verify PASS |
| **输入** | 已验证变更目录 |
| **产出** | `changes/<名>/` → `changes/archive/<名>/`；模块文档更新；ROADMAP 更新 |
| **核心机制** | 5 步（任务完成度检查 → 模块影响分析 → 同步模块文档 → 确认归档 → 更新路线图）；`--confirm` 必填；归档前硬校验 plan.md |
| **特殊工具** | `sillyspec module-impact --change <名>` 生成影响分析骨架 |
| **后续** | → `commit`（提交归档结果） |

#### 9. `sillyspec:quick` — 快速小任务

| 维度 | 内容 |
|------|------|
| **触发** | 明确/低风险/范围小的任务（≤3 文件）；用户说"直接改、快速修、顺手调整" |
| **前置** | 无（可独立启动，也可从 brainstorm 的 scale=small 分叉进入） |
| **输入** | 一句话任务描述（`--input`） |
| **产出** | 代码修改 + QUICKLOG 条目 |
| **核心机制** | 3 步流程（理解任务 → 实现 → 自检提交）；不创建 worktree；step1 baseline 快照 + step3 边界审计；`--files` 声明修改范围；`--linked-changes` 关联变更；审计拦截危险文件/新增文件/baseline 覆盖 |
| **守卫 Flag** | `--allow-new`（新增文件）、`--allow-delete`（删除文件）、`--force-baseline`（覆盖受保护文件） |
| **收尾四字段** | `--req`/`--cause`/`--solution`/`--result`（CLI 合成结构化 QUICKLOG） |
| **后续** | 无固定后续（可 `commit`） |

### B. 编排技能（1 个）

#### 10. `sillyspec:auto` — 全流程自动编排

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"自动完成这个需求" |
| **输入** | 需求描述（`--input`） |
| **流程** | `brainstorm → plan → execute → verify` 串联自动推进 |
| **审核门控** | 按 tier 分级（self=自审，independent=独立 QA 子代理） |
| **输出** | 完整流程总结 + 提示 commit |
| **异常处理** | 命令失败→暂停等用户；用户说停止→立即停止报告进度 |

### C. 辅助技能（11 个）

#### 11. `sillyspec:continue` — 自动判断下一步

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"继续"；有 HANDOFF.json 或进行中变更 |
| **机制** | 优先 `sillyspec next`（CLI 内置探测表），异常时按 7 级优先级手工判断 |
| **判断链** | HANDOFF → 活跃变更（无文件/无design/无tasks/无plan/有未完成task/全完成未验证/已验证） → 有设计无变更 → 有scan无工作 → 什么都没有 |

#### 12. `sillyspec:resume` — 恢复中断工作

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"恢复"、"继续之前的工作" |
| **机制** | `sillyspec progress show` + 文件探测推断阶段 |

#### 13. `sillyspec:commit` — 智能提交

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"提交"；归档后收尾 |
| **机制** | `sillyspec commit` 自动收集变更信息 → 生成建议 message → 用户确认 → `git add -A && git commit` |
| **产出** | git commit |

#### 14. `sillyspec:doctor` — 自检修复

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"检查状态、修复 progress、doctor" |
| **机制** | 5 步（环境检查 → 项目配置 → 数据库完整性 → 状态一致性 → 修复建议） |
| **配套命令** | `progress show/check/repair/validate`、`worktree doctor`、`doctor --align-execute-progress`、`--cleanup-remnant`、`--dump-db` |

#### 15. `sillyspec:state` — 当前工作状态

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"看下状态" |
| **粒度** | 阶段/步骤级别（"在做什么"） |
| **命令** | `sillyspec progress show` |

#### 16. `sillyspec:status` — 项目整体进度

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"当前进度、status" |
| **粒度** | change 文件级别（"有什么"） |
| **命令** | `sillyspec run status` |

#### 17. `sillyspec:explore` — 自由探索

| 维度 | 内容 |
|------|------|
| **触发** | 用户说"分析下、讨论下、调研一下、画结构图" |
| **约束** | **只读**——不写代码、不改文件、不装依赖 |
| **产出** | 无固定产出（思考/讨论/ASCII 图） |

#### 18. `sillyspec:knowledge` — 知识库

| 维度 | 内容 |
|------|------|
| **触发** | 实现前查已有知识；发现新坑点；提交前校验知识库 |
| **子命令** | `search`（搜索）、`inspect`（读详情）、`validate`（校验健康度）、`refresh`（从 scan 刷新 generated/）、`propose`（提议新知识） |
| **写保护** | refresh 仅写 generated/；propose 仅写 proposed/；manual/ 只读 |

#### 19. `sillyspec:workspace` — 工作区管理

| 维度 | 内容 |
|------|------|
| **触发** | 多项目工作区；用户说"添加子项目、查看工作区" |
| **CLI** | `workspace add/remove/status` |
| **产出** | `.sillyspec/projects/<name>.yaml` |

#### 20. `sillyspec:export` — 模板导出

| 维度 | 内容 |
|------|------|
| **触发** | 用户想复用已有变更方案 |
| **机制** | 复制变更文件到 `~/.sillyspec/templates/<change-name>/`，清理为通用模板 |
| **约束** | CLI 无 export 命令，纯文件操作 |

#### 21. `verify-per-user` — 空壳

| 维度 | 内容 |
|------|------|
| **内容** | 仅 `# test`，占位/测试用途 |

---

## 三、完整流程图（文本）

### 主流程（标准变更生命周期）

```
                    ┌─────────────────────────────────────────────┐
                    │              绿地项目（新项目）               │
                    │                                             │
                    │  /sillyspec:init                            │
                    │  ├─ 深度提问                                │
                    │  ├─ REQUIREMENTS.md                         │
                    │  ├─ ROADMAP.md                              │
                    │  └─ PROJECT.md                              │
                    │       │                                     │
                    └───────┼─────────────────────────────────────┘
                            ▼
                    ┌──────────────────┐
                    │ /sillyspec:scan  │ ◄──── 棕地项目（已有代码）
                    │ 7 份架构文档      │       直接从这里开始
                    │ + 模块映射        │
                    └───────┬──────────┘
                            │
                            ▼
               ┌────────────────────────┐
               │ /sillyspec:brainstorm  │ ◄─── 用户需求/想法
               │ 需求澄清 + 方案设计     │
               │ 产出四件套              │
               └────────┬───────────────┘
                        │
              ┌─────────┴──────────┐
              │ scale 判定          │
              ├────────────────────┤
              │                    │
     ┌────────▼────────┐    ┌─────▼──────────┐
     │ scale = small   │    │ scale = large  │
     │ （≤2 文件）     │    │ （多文件/跨模块）│
     │ 仅生成 design.md│    │ 四件套齐全       │
     └────────┬────────┘    └──────┬─────────┘
              │                     │
              ▼                     ▼
   ┌──────────────────┐   ┌──────────────────┐
   │ /sillyspec:quick │   │ /sillyspec:plan  │
   │ 快速小任务 3 步   │   │ Wave + Task 拆解 │
   │ 直接改代码        │   │ + 任务蓝图        │
   └────────┬─────────┘   └──────┬───────────┘
            │                     │
            │                     ▼
            │            ┌──────────────────┐
            │            │ /sillyspec:execute│
            │            │ worktree 隔离实现 │
            │            │ Task Review Gate  │
            │            │ Stage Review Gate │
            │            └──────┬───────────┘
            │                   │
            │                   ▼
            │            ┌──────────────────┐
            │            │ /sillyspec:verify│
            │            │ 只读验证          │
            │            │ verify-result.md │
            │            └──────┬───────────┘
            │                   │
            │          ┌────────┴────────┐
            │          │ PASS?           │
            │          ├─────────────────┤
            │      FAIL│                 │PASS
            │          ▼                 ▼
            │    回 execute 修复   ┌─────────────────┐
            │                     │ /sillyspec:archive│
            │                     │ 归档 + 模块同步    │
            │                     └──────┬──────────┘
            │                            │
            └────────────┬───────────────┘
                         ▼
               ┌──────────────────┐
               │ /sillyspec:commit│
               │ 智能提交 git      │
               └──────────────────┘
```

### 快速流程（quick 路径）

```
  /sillyspec:quick --input "修复xxx" --linked-changes none --files src/a.ts
       │
       ▼
  Step 1: 理解任务 + 记录 baseline
       │
       ▼
  Step 2: 实现代码修改
       │
       ▼
  Step 3: 自检 + --done 四字段 + QUICKLOG 落盘
       │
       ▼
  审计门控（baseline/boundary/dangerous files）
       │
       ▼
  → /sillyspec:commit
```

### 全自动流程（auto 路径）

```
  /sillyspec:auto "实现用户登录功能"
       │
       ▼
  ┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ brainstorm  │────▶│  plan    │────▶│ execute  │────▶│  verify  │
  │             │     │          │     │          │     │          │
  │ 用户确认点   │     │ 审核门控  │     │ Task/Stage│    │ 验证报告  │
  └─────────────┘     └──────────┘     │ Review   │     └──────────┘
                                       └──────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │ 提示 commit   │
                                       └──────────────┘
```

### 辅助技能关系图

```
                    ┌─────────────┐
                    │  continue   │ ← 自动判断下一步（优先 CLI next）
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌──────────┐     ┌────────────┐      ┌──────────┐
  │  resume  │     │   state    │      │  status  │
  │ 恢复中断  │     │ 阶段/步骤级 │      │ change级 │
  └──────────┘     └────────────┘      └──────────┘
                           │                  │
                           └────────┬─────────┘
                                    ▼
                             ┌────────────┐
                             │   doctor   │ ← 自检 + 修复
                             └────────────┘

  ┌──────────┐     ┌────────────┐      ┌──────────┐
  │ explore  │     │ knowledge  │      │ workspace│
  │ 只读讨论  │     │ 知识库管理  │      │ 多项目管理│
  └──────────┘     └────────────┘      └──────────┘

  ┌──────────┐     ┌────────────┐
  │  export  │     │   commit   │
  │ 模板导出  │     │ 智能提交    │
  └──────────┘     └────────────┘
```

---

## 四、Stage Review Gate 机制汇总

| 阶段 | reviewType | 主审查文档 | tier=self | tier=independent |
|------|-----------|-----------|-----------|-----------------|
| brainstorm | `design` | `design.md` | 自审 | 独立 QA 子代理 |
| propose | `proposal` | `proposal.md` | 自审 | 独立 QA 子代理 |
| plan | `plan` | `plan.md` | 自审 | 独立 QA 子代理 |
| execute | `acceptance` | `design.md` | 自审 | 独立 QA 子代理（+ task review 范围分级） |

所有 stage review.json 共享：
- 路径：`.sillyspec/.runtime/stage-reviews/<stage>-review-<run-id>/review.json`
- `docHash` = sha256(主审查文档内容)，CLI 重算比对，不符判伪造（fail-closed）
- `docHash` 可先占位，改文档后跑 `sillyspec register-stage-review --refresh-hash` 重算

---

## 五、CLI 别名映射

| Skill | CLI 等价命令 |
|-------|-------------|
| `sillyspec:brainstorm` | `sillyspec run brainstorm` 或 `sillyspec brainstorm` |
| `sillyspec:plan` | `sillyspec run plan` 或 `sillyspec plan` |
| `sillyspec:execute` | `sillyspec run execute` 或 `sillyspec execute` |
| `sillyspec:verify` | `sillyspec run verify` 或 `sillyspec verify` |
| `sillyspec:archive` | `sillyspec run archive` 或 `sillyspec archive` |
| `sillyspec:scan` | `sillyspec run scan` 或 `sillyspec scan` |
| `sillyspec:quick` | `sillyspec run quick` 或 `sillyspec quick` |
| `sillyspec:explore` | `sillyspec run explore` 或 `sillyspec explore` |
| `sillyspec:doctor` | `sillyspec run doctor` 或 `sillyspec doctor` |
| `sillyspec:auto` | `sillyspec run auto` |
| `sillyspec:propose` | `sillyspec run propose`（无顶层别名） |
| `sillyspec:status` | `sillyspec run status`（无顶层别名） |

---

## 六、关键设计模式

### 1. 步骤生命周期统一模式
所有流程技能共享统一的步骤生命周期：
```bash
sillyspec run <stage>                    # 输出当前步骤 prompt
sillyspec run <stage> --done --output    # 完成当前步骤
sillyspec run <stage> --status           # 查看进度
sillyspec run <stage> --skip             # 跳过可选步骤
sillyspec run <stage> --reset            # 重置阶段
sillyspec run <stage> --reopen --from-step N  # 重新打开已完步骤
```

### 2. 多变更隔离
- 所有命令通过 `--change <名>` 指定操作目标
- 变更目录：`.sillyspec/changes/<名>/`
- 单变更时可省略（CLI 自动检测）
- quick 的 `--change` 语义不同（session ID 恢复），用 `--linked-changes` 关联真实变更

### 3. 铁律共性
- **必须用 exec 工具执行 CLI，不自行编造流程**
- **只做当前步骤 prompt 描述的操作**
- **产物写入 CLI 输出的 changeDir 目录**
- **完成后立即 --done，不跳过**

### 4. Tier 分级审核
- `tier=self`（≤3 文件）：当前 agent 自审
- `tier=independent`（>3 文件）：独立 QA 子代理（独立上下文，不共享实现者分析）
- 由 CLI 按变更规模自动判定

### 5. docHash 防伪
- 所有 stage review.json 的 `docHash` = sha256(主审查文档内容)
- CLI 重算比对，不符判伪造（fail-closed）
- 占位 → 改文档 → `register-stage-review --refresh-hash` 一键重算

---

## 七、产出文件

分析报告已写入：`docs/sillyspec/skill-system-analysis.md`
