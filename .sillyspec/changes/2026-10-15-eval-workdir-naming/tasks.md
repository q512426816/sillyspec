---
author: flow-machine-draft
created_at: 2026-10-15T12:48:34.213Z
---
# 任务注册表（Tasks）— 2026-10-15-eval-workdir-naming

- [x] task-01: prepareWorkdir 产出目录名不以数字字符开头（路径分隔符后的首段非 [0-9]），且仍含 taskId 与 arm 标识（可辨识/可清理）
- [x] task-02: 既有测试面全绿 + 新增命名断言（prepareWorkdir 返回路径 basename 首字符非数字、含 taskId/arm）
- [x] task-03: 004 探针任务 --force 重跑双臂可正常进入写入面（真跑验证放收口后进行，不计入本变更门）
