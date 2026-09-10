---
id: task-01
title: 'add-scope-audit-pure-function-module'
title_zh: '纯函数 computeChangeScopeAudit 双模式 + collectNumstatByPath 行数三档 + renderScopeAuditTable（新建 src/scope-audit.js）'
author: 'qinyi'
created_at: 2026-09-10 10:45:46
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01, FR-02, FR-04]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - NEW:src/scope-audit.js
target_files:
  - NEW:src/scope-audit.js
goal: 新建核心纯函数模块 src/scope-audit.js——scope-audit 命令与三处阶段注入的唯一数据源（D-003 同源），双模式对账 + 行数三档 + 表渲染。
provides:
  - contract: ScopeAuditResult
    fields: [mode, ok, degradedReason, baseAnchor, totals, rows, excluded, note]
expects_from:
  task-02:
    - contract: ReconcileActualFiles
      needs: [files, baseAnchor, ok, degradedReason]
implementation:
  - 新建 src/scope-audit.js 三导出：computeChangeScopeAudit（双模式自动判定——changeName 匹配 quick-<hex> 且 locateQuickSessionGuard（src/run/shared.js:214）命中走 quick，否则 full-flow）+ renderScopeAuditTable（人类可读表，含汇总行与 ⚠️ 标记）+ collectNumstatByPath（quick 与 full-flow 共用采集）
  - 行数三档（D-002）——tracked 用 git diff --numstat（full-flow 基点=baseAnchor、quick 基点=HEAD）；untracked 新文件 wc -l 记全 + 行；binary（numstat 两列 '-'）显 BIN 且行数为 null；numstat 单次 git 调用非逐文件（R-03）
  - full-flow——import resolveReconcileActualFiles（task-02 契约）取实际文件集与 baseAnchor；计划侧解析 design.md 文件清单复用 src/change-list.js 既有导出（禁自研表格解析）；三态判定 planned/unplanned/untouched
  - quick——读 guard.json 复用 auditQuickCompletion（src/run/shared.js:1180 已 export）同款窗口归属；归属分档 declared/soft/undeclared 进 rows，他者声明 foreignDeclared 只进 excluded 单列不进 rows（R-04）；baseAnchor 记 quick-window:sessionId 形态
  - 降级路径全带 degradedReason/note——design 清单解析失败降级实际侧 only 视图不出三态列；baseAnchor=null 时文件表仍出但行数列降级说明不出伪行数；quick 已提交时 note 提示读 QUICKLOG 条目，不以空表冒充实时
acceptance:
  - full-flow 夹具（含计划内/计划外/计划未动文件）三态分档正确——verdict 依次为 planned/unplanned/untouched
  - binary 文件行显 BIN 且 additions/deletions 为 null；untracked 新文件出 wc -l 全 + 行
  - quick 会话夹具出归属表（declared/soft/undeclared 分档正确）；并行会话声明文件（foreignDeclared）不进 rows，只进 excluded 单列
  - 三条降级路径（清单解析失败/baseAnchor=null/quick 已提交）各出 degradedReason 或 note，不出伪行数
verify:
  - node --test test/scope-audit.test.mjs（夹具测试由 task-07 收口；其落盘前先以 node --check src/scope-audit.js 作语法门）
constraints:
  - 全部输出 advisory 无门禁状态字段（D-006）；不改 auditQuickCompletion 与 resolveReconcileActualFiles 判定语义，只消费其结果
  - 只写 src/scope-audit.js——命令路由/阶段注入/夹具测试是 task-03 至 task-07 的 scope；Windows 路径归一（反斜杠转正斜杠），numstat 解析不依赖 GNU awk
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
