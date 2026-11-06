---
author: flow-machine-draft
created_at: 2026-11-06T14:29:33.291Z
---
# 任务注册表（Tasks）— 2026-11-06-knowledge-propose-body-file

- [x] task-01: 新增 test/knowledge-propose-body-file.test.mjs 五组用例（T1 主路径落盘一致/T2 互斥零落盘/T3 缺失与不可读错误码/T4 既有 --body 形态对照/T5 help+usage 文案同步），形态照 knowledge-search-positional.test.mjs（import cmdPropose + tmpdir fixture + 捕获 console.log）；先写测试确认红
- [x] task-02: cmdPropose 实现 --body-file（src/stages/knowledge.js）：indexOf 取值 + readFileSync utf8 作 body；--body 同给报 body_source_conflict；不存在报 body_file_missing、读抛错报 body_file_read_failed；三类校验全部先于 mkdirSync（错误路径零落盘）；T1~T4 转绿
- [x] task-03: 文案同步——cmdKnowledge --help 的 propose 行与 src/index.js:159 usage 补 --body-file <路径>（注明从文件读正文）；T5 转绿
- [x] task-04: 跑受影响测试面全绿（新文件 + 8 个 import stages/knowledge.js 的既有面：vector-observability/search-positional/rank-denoise/tier-denoise/scope-cmd/vector-switch-hint/stats/decision-legacy-renumber，9/9 绿）；lint 未配置（local.yaml 无 commands.lint）——收口自动跳过留痕，归 pre-push 门
