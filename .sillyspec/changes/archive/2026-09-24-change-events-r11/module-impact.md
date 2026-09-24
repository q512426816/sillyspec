---
author: qinyi
created_at: 2026-09-24 02:50:33
---
# 模块影响分析（骨架由 plan --done CLI（design 声明清单 × module-map 前缀匹配） 生成）

> 文件×模块归属由 CLI 按 _module-map.yaml paths 前缀匹配预填；
> **影响类型**（逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更/新增）与 review 标记是语义判断，
> 逐行把 <!--TODO--> 替换为真实结论——以 git diff 为准（真实 > 声明）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| backend/platform_sync | backend/app/modules/platform_sync/model.py | 数据结构变更（新增表 ORM，零既有列改动） | 否（模块内新增，pytest 252 绿） |
| backend/platform_sync | backend/app/modules/platform_sync/schema.py | 接口变更（追加 5 DTO，零既有 DTO 改动） | 否 |
| backend/platform_sync | backend/app/modules/platform_sync/service.py | 逻辑变更（追加 append_events/list_events 两方法） | 否 |
| backend/platform_sync | backend/app/modules/platform_sync/router.py | 接口变更（追加 POST/GET /changes/{name}/events） | 否（main.py 挂载既有 router，零改动） |
| backend/platform_sync | backend/app/modules/platform_sync/tests/conftest.py | 配置变更（建表清单追加第四表） | 否 |
| backend/platform_sync | backend/app/modules/platform_sync/tests/test_change_events.py | 新增（pytest 五组 8 用例） | 否 |
| backend/migrations | backend/migrations/versions/20260924030000_add_platform_change_events.py | 数据结构变更（新表迁移，down_revision 接单头） | 否（alembic heads 单头实证） |
| backend/openapi | backend/openapi.json | 新增（gen:types 再生成，事件端点进 schema） | 否（生成物） |
| frontend/lib | frontend/src/lib/api-types.ts | 新增（gen:types 生成，只增不改） | 否（生成物） |
| frontend/lib | frontend/src/lib/change-events.ts | 新增（listChangeEvents 数据层） | 否 |
| frontend/changes | frontend/src/components/changes/detail/change-events-card.tsx | 新增（观测事件折叠卡） | 否（组件测试 5 用例绿） |
| frontend/changes | frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx | 调用关系变更（次线 aside 追加挂卡，change_key 传入） | 否（既有面 374 passed 零回归） |
| frontend/changes | frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx | 新增（组件测试四组） | 否 |

## 未匹配文件

本 worktree 项目实例（2026-09-24-r11-sillyspec-events）无 `_module-map.yaml`（plan postcheck 已提示 decision_module_check_skipped）——全部变更文件按上述人工归属判定填入矩阵；模块索引不存在的环境下无需 modules rebuild。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无 module-map（worktree 独立实例，docs 目录无模块索引） | skipped |
| `modules/<id>.md` | 同上，无模块卡可更新 | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。
