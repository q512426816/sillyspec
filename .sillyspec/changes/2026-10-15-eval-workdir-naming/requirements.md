---
author: flow-machine-draft
created_at: 2026-10-15T12:48:34.213Z
---
# 需求规格（Requirements）— 2026-10-15-eval-workdir-naming

## 功能需求

### FR-01: prepareWorkdir 产出目录名不以数字字符开头（路径分隔符后首段非 [0-9]），且仍含 taskId 与 arm 标识

- 必须：`eval/lib/workdir.mjs` 的 prepareWorkdir 生成的 workdir 目录名以非数字字符开头（`run-` 前缀）。根因：claude CLI 沙箱把允许目录路径里的 `\004` 形态（目录段以数字开头）当八进制转义序列处理，前缀比对恒失败，workdir 内一切写入被硬拦（两臂日志实证，判分 fail 与能力无关）。
- 必须：目录名仍含完整 taskId 与 arm 标识（`run-<taskId>__arm<arm>`），可辨识可清理；`__arm` 字面在仓内唯一引用点是本函数（grep 已核），runner/db 以 task+arm 列为键不依赖目录名。
- 禁止：不改 removeDir/copyInto 语义与 `.stale` 隔离机制。

#### 场景：命名安全

- Given：任意 taskId（含 `004-x` 数字开头与 `abc-x` 字母开头两形态）
- When：prepareWorkdir
- Then：返回路径 basename 首字符非 [0-9]，且包含 taskId 与 arm 字面，脚手架复制行为不变

### FR-02: 命名断言进仓库测试套件，lint 通过

- 必须：新增 `test/eval-workdir-naming.test.mjs`：数字开头与字母开头 taskId 两形态断言（首字符非数字、含 taskId/arm、files 脚手架已复制）。
- 必须：`npm run lint` 通过。

#### 场景：断言双形态

- Given：测试两例
- When：node --test
- Then：全绿

## 测试绑定（每条 FR 至少一行）

FR-01: test/eval-workdir-naming.test.mjs「workdir 命名不以数字开头」
FR-02: test/eval-workdir-naming.test.mjs「workdir 命名不以数字开头」（lint 面收口亲测）
