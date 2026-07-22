# 模块影响分析

author: qinyi
created_at: 2026-06-03 10:37:00

## 变更：workflow-spec

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| stages | 逻辑变更 | src/stages/scan.js, src/stages/archive.js | scan step 5 引用 workflow spec，archive extract 引用 workflow spec | false |
| cli-entry | 逻辑变更 | src/run.js | 新增 workflow post_check 自动检查逻辑 | false |

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|
| src/workflow.js | 新增文件，未匹配已有模块 |
| .sillyspec/workflows/*.yaml | 新增文件，workflow 定义 |
| package.json, package-lock.json | 依赖变更（js-yaml） |
| .sillyspec/docs/dashboard/** | dashboard 子项目扫描文档（新增） |
| .sillyspec/projects/dashboard.yaml | 子项目注册（新增） |

## 更新结果
（待 sync-module-docs 回填）
| 目标 | 操作 | 状态 |
|------|------|------|
