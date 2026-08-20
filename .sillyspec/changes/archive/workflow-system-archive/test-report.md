# Workflow Spec 端到端回归测试报告

generated_at: 2026-06-03 12:39 GMT+8

## 测试结果

| # | 测试项 | 结果 | 说明 |
|---|--------|------|------|
| 1 | CLI list/check | ✅ PASS | list 显示 2 个 workflow；dashboard pass→exit 0，nonexistent→exit 1 |
| 2 | --json 结构完整 | ✅ PASS | 8 个必需字段全部存在，嵌套 checks 均含 type+status |
| 3 | --save 归档 | ✅ PASS | 生成 1 个 JSON 文件，含 run_id/status/source |
| 4 | --json --save stdout 纯净 | ✅ PASS | stdout 为纯净 JSON，python3 可正常解析 |
| 5 | 无 --save 不生成文件 | ✅ PASS | 未加 --save 时 workflow-runs 目录无文件 |
| 6 | depends_on 校验 | ✅ PASS | archive-impact/sillyspec/default 全部通过，exit 0 |
| 7 | 非法 depends_on | ✅ PASS | validateWorkflow 正确报错，检测到不存在 role 引用 |
| 8 | 保存失败不崩溃 | ✅ PASS | 路径不存在时 saveWorkflowRun 返回 null，无异常 |
| 9 | formatCheckReport 兼容 | ✅ PASS | report 内容与 status 一致 |

## 结论

**ALL PASS** — 9/9 测试全部通过
