---
author: qinyi
created_at: 2026-09-11T14:35:00+08:00
---

# 需求（Requirements）— 跨变更语义护栏

## FR-01 决策条目代码文件锚定契约
- decision-distill 解析 `changes/<name>/decisions.md` 条目时识别 `文件：`/`files:` 标签（列表语义同 模块域），落库时渲染为条目段 `文件：path1, path2` 行；条目无该字段时不渲染该行（存量条目零迁移）。
- 字段行契约与既有机械解析口径一致（FIELD_LABEL_RE 增量安全）。

## FR-02 文件键决策反查
- knowledge-match 新增按文件路径反查：条目命中源两路——①新 `文件：` 字段精确匹配（POSIX 归一）；②存量「锚点：」值中的路径形态 token 提取（如 `src/quicklog.js:493` → `src/quicklog.js`）。
- 仅覆盖 INDEX.md Decisions 段路由可达的域文件（与既有 parseDecisionEntries 同发现口径）；无 decisions 库 → 返回空，行为与无库一致。
- 输出含：决策 ID、标题、状态（implemented/rejected）、理由、库文件指针。

## FR-03 quick 进场语义护栏注入
- quick step1 prompt 注入 advisory 块：对候选文件（会话 --files + git 脏文件，封顶 20）反查决策命中 + 近 7 天他者变更交付归因。
- 归因数据源：`git log` 提交信息中的变更名标记（`YYYY-MM-DD-<slug>` / `ql-YYYYMMDD-NNN-xxxx`）；无标记或归因为本变更 → 不点名。
- 命中输出：文件 → 交付变更名 / 决策 ID 摘要（rejected 标注「已否决，勿复潮」）；零命中零输出（不留空段）。
- 注入失败 fail-soft（单行说明，不阻断 quick 启动）。

## FR-04 quick --done 断言重写 WARNING
- 检测范围：本会话变更文件中的测试文件（test/ 前缀或 *.test.* / *_test.* 命名）里**被修改**的断言行（启发式 token：`expect(`、`assert`、`t.equal`、`toBe`、`toEqual`、`strictEqual` 等）；纯新增断言不算。
- 触发条件：断言被改的测试文件同时满足「他者近因交付归因」（FR-03 同源）。
- 输出：⚠️ 点名文件+行号样例（封顶 5）+ 交付变更名 + 建议「重写理由写进 quicklog --solution / 关联决策复查」；WARNING 级非阻断。
- 检测失败 fail-soft（内部 skip，不产伪数据）。

## FR-05 配置开关
- `local.yaml` 新段 `semantic_guard.enabled`（boolean，默认 true；false 时 FR-03 注入与 FR-04 WARNING 全停，零额外开销）。
- config-schema 登记（readers/desc/example 与 friction_hint 同款）。

## NFR
- Windows/Linux/macOS 兼容：路径 POSIX 归一、git 调用走 git-helper 既有封装、CRLF 容错。
- 全部 advisory 路径 fail-soft：知识库缺失/git 不可用/解析异常 → 静默或单行说明，绝不阻断既有流程。
- 不触碰并行会话正在修改的文件（command.js/complete*.js/shared.js/scope-audit.js/brainstorm.js/index.js）——挂载点全部在干净文件内部实现。
