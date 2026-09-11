- [x] ql-20260911-020-1397 修驾驭两点（第三次撞 verify 门 + 扁平格式三变更零收录）：①noAI 质量扫描步（executeVerifyQualityScan，stage.js/complete.js 两调用点）漏接隔离快照——第八批只接了 gates.js…

<!-- 以下为 2026-09-11-cross-change-decision-guard 自有任务（brainstorm step6 落盘；
     未勾选态同时是 quick-done-autoarchive-misfire 缺陷②的防护——见 decisions.md D-002@v1） -->

- [ ] task-01: decision-distill 文件字段契约（解析+条件渲染+双侧归一口径）(depends_on: 无)
- [ ] task-04: config-schema semantic_guard 段登记 (depends_on: 无)
- [ ] task-02: knowledge-match 文件键反查（文件标签+锚点提取兜底+matchDecisionsByFiles）(depends_on: task-01)
- [ ] task-03: semantic-guard 聚合模块（归因/断言检测/渲染/开关）(depends_on: task-02)
- [ ] task-05: quick step1 进场注入（run/prompt.js 渲染层）(depends_on: task-03)
- [ ] task-06: quick --done 断言 WARNING（quick-audit.js gate 内+渲染）(depends_on: task-03)
- [ ] task-07: 端到端验证+模块文档（npm test/lint 全量+冒烟+changelog）(depends_on: task-01,02,03,04,05,06)
- [x] ql-20260911-021-eca5 scope-audit 预执行形态：无 meta/分支/审计 tag 三无变更=尚未进入 execute——出计划清单视图（不出实际侧表不误报收尾警告，工作区脏文件归属他者不混入）
