---
author: flow-machine-draft
created_at: 2026-10-15T12:48:34.213Z
---
# 提案书（Proposal）— 2026-10-15-eval-workdir-naming

## 动机

任务原话转写：eval workdir 命名修复——目录段禁以数字开头，绕开 claude CLI 沙箱 \0NN 转义吃路径的写入全拦缺陷（004 探针 A/B 实测双双环境性 fail 的根因）

动机：首次真实 A/B 实测（004-phase-stats 双臂）双双 fail，且是环境性 fail——claude CLI 沙箱把允许目录路径里的 \004（workdir 名 <taskId> 以数字开头，路径段 \004-phase-stats__armA）当八进制转义序列处理，前缀比对恒失败，workdir 内一切写入被硬拦（两臂日志实证：Write/Bash/子代理/TEMP 多通道全拦，臂 A 还把完整解法写在了回复里——判分 fail 与能力无关）。eval/lib/workdir.mjs:21 的 `${taskId}__arm${arm}` 命名是唯一污染源；001-003 同样以数字开头，未来真实 pilot 全会踩。修复：workdir 目录名加非数字前缀。

成功标准：
- prepareWorkdir 产出目录名不以数字字符开头（路径分隔符后的首段非 [0-9]），且仍含 taskId 与 arm 标识（可辨识/可清理）
- 既有测试面全绿 + 新增命名断言（prepareWorkdir 返回路径 basename 首字符非数字、含 taskId/arm）
- 004 探针任务 --force 重跑双臂可正常进入写入面（真跑验证放收口后进行，不计入本变更门）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. prepareWorkdir 产出目录名不以数字字符开头（路径分隔符后的首段非 [0-9]），且仍含 taskId 与 arm 标识（可辨识/可清理）
2. 既有测试面全绿 + 新增命名断言（prepareWorkdir 返回路径 basename 首字符非数字、含 taskId/arm）
3. 004 探针任务 --force 重跑双臂可正常进入写入面（真跑验证放收口后进行，不计入本变更门）

## 成功标准（可验证）

1. prepareWorkdir 产出目录名不以数字字符开头（路径分隔符后的首段非 [0-9]），且仍含 taskId 与 arm 标识（可辨识/可清理）
2. 既有测试面全绿 + 新增命名断言（prepareWorkdir 返回路径 basename 首字符非数字、含 taskId/arm）
3. 004 探针任务 --force 重跑双臂可正常进入写入面（真跑验证放收口后进行，不计入本变更门）
