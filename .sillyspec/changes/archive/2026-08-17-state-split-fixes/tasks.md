---
author: qinyi
created_at: 2026-08-16T23:15:40+08:00
updated_at: 2026-08-16T23:15:40+08:00
---

# 任务清单（Tasks）

- [ ] task-01: #1 四处 marker 写入点原子化（mkdir 先于 marker）+ 分层 fail 语义（stage throw / gates gate 内 throw / prompt 降级 / task-review 去静默）+ 测试
- [ ] task-02: #2 applyByMerge 预对齐（四条件过滤集：已提交口径∩main 推进∖分支变更∖工作区 dirty；checkout main + commit；降级路径）+ 测试
- [ ] task-03: #3 docsCheckHint 扩展 livingDocDrift（collectDocRefs 复用提取活文档引用源码集 ∩ changedFiles；quick-audit 输出提示）+ 测试
- [ ] task-04: 全量验证（npm test 全绿 + docs check 无新增失效）+ 文档同步（file-lifecycle/troubleshooting 登记）+ 显式 pathspec 提交
