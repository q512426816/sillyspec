# 符号影响面报告

> tasks.md 内容指纹（生成时）: ea95816ee50233cd——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。

- task-01: 无签名级变更——新增 PlatformChangeEventORM 表模型（新类，无既有符号改动）；conftest.py 只在 ensure_platform_sync_table 的 tables 列表追加一项（fixture 函数签名不变）。
- task-02: 新增符号（非修改既有签名）——schema.py 追加 EventPushItem/EventPushRequest/EventPushOk/EventListItem/EventListResponse 五个新 DTO；service.py 在 PlatformSyncService 类内追加 append_events/list_events 两方法（类构造签名不变，调用点为零新增调用方）；router.py 追加 push_change_events/list_change_events 两端点函数。既有符号（require_platform_sync_write/_read_args 等）只 import 复用不改签名。
- task-03: 新增符号——frontend/src/lib/change-events.ts 导出 listChangeEvents（新函数，零既有调用方）；api-types.ts 经 gen:types 整体再生成（生成物非手写，路径类型只增不改）。
- task-04: 新增符号——ChangeEventsCard 组件（新文件新导出）；page.tsx 追加 import 与 JSX 挂载（default export ChangeDetailPage 签名不变，props 结构不变）。
- task-05: 无签名级变更——纯验收实录（e2e-record.md 文档落盘），零代码符号触碰。
