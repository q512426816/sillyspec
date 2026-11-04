---
author: flow-machine-draft
created_at: 2026-11-04T05:13:24.652Z
---
# 需求规格（Requirements）— 2026-11-04-junction-guard-rename-content

## 功能需求

### FR-01: resolvePlatformSpecDir 解析结果与 cwd 分属不同 git 仓时大声告警（含指针路径与修复指引）；同仓/无 git 仓/显式 --spec-dir 覆盖三种形态零告警

- 必须：pointer 分支的解析结果（junction realpath 或 ptr.specRoot）其 git 根与 cwd 的 git 根均存在且不同时，console.warn 一行跨仓告警（含两仓路径、pointer 文件路径、修复指引：核对 `~/.sillyhub/daemon/specs/` junction 绑定或 `platform pointer --cleanup`）。同仓、任一侧无 git 根（独立快照目录形态）、显式 specDir 参数三种形态必须零告警（显式覆盖是用户意志不告警）。

#### 场景：junction 错绑（事故形态复现）

- Given cwd 在仓 A（含 .git），pointer→junction→realpath 落在仓 B（含 .git，B≠A）
- When resolvePlatformSpecDir(cwd)
- Then 输出跨仓告警（含仓 A/仓 B 路径与修复指引），返回值不变（告警不阻断——错绑场景操作仍可进行，由人裁决）

#### 场景：三零告警形态

- Given 同仓解析 / specRoot 无 .git（裸快照目录）/ 显式 specDir 传入
- When resolvePlatformSpecDir
- Then 零告警输出

### FR-02: computeSpecOps 的 rename op 携带 content（base64，与 add/update 同款），服务端源行缺失可物化目标不再 422

- 必须：rename op 增携 `content` 字段（新路径本地文件内容的 base64，与 add/update 同编码）；其余字段（op/path/new_path/base_version）形态不变。服务端源行在则照常移动语义，源行缺失（跨工作区错绑/对端已清）可凭 content 物化目标——「源文件缺失的重命名必须携带文件内容」422 整批拒收不再发生。

#### 场景：归档 rename（源行缺失形态）

- Given 服务器清单无旧路径行（或属另一工作区）、本地新路径文件在且与某行 hash 同
- When computeSpecOps
- Then rename op 的 content 字段 = 新路径文件内容 base64（可解码还原）

#### 场景：常规归档 rename 零回归

- Given 服务器清单有旧路径行、本地已移至新路径（hash 同）
- When computeSpecOps
- Then rename op 照常生成（+content 新增字段），base_version 取旧行 version 不变

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/junction-guard-rename-content.test.mjs「T1 跨仓告警/T1b 同仓·无git·显式specDir 三零告警」
FR-02: test/junction-guard-rename-content.test.mjs「T2 rename 携带 base64 content/常规 rename 零回归」
