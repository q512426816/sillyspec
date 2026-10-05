---
author: flow-machine-draft
created_at: 2026-10-05T15:23:16.287Z
---
# 需求规格（Requirements）— 2026-10-05-flow-tail-polish

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: flow done 归档子步补暂存未跟踪的归档新目录（文件级 pathspec，限本变更 archive/<me>/），归档后仍有未暂存的 distill 产物（knowledge 路径）时打印待提交清单提示

flow done 归档链（src/run/complete-handlers.js runArchiveChain）必须修复根因：862 行 archiveNarrowedGitAdd 调用引用了作用域中未声明的 destName 标识符，ReferenceError 被外层空 catch{} 静默吞——窄化自动暂存（归档目录 archive/<me>/ + knowledge 蒸馏产物 + docs 面）在 flow done 路径从未生效（三轮实测 porcelain 实证）。修复必须：destName 从 destDir basename 推导；catch{} 改留痕 warn（静默吞是排查难的根因）；补暂存探测块加 ??（untracked）归档新目录文件级兜底与 knowledge 未暂存待办清单提示（narrowed add 失败降级时的第二道兜底）。

#### 场景：主路径

- Given：change 走完 flow done 八子步
- When：归档链执行 archiveNarrowedGitAdd（destName 修复后）
- Then：归档新目录与 knowledge 蒸馏产物均已 staged（porcelain 无 `?? archive/<me>/` 与未暂存 knowledge 项）

#### 场景：降级兜底

- Given：archiveNarrowedGitAdd 再度异常（留痕 warn）
- When：探测块扫描 porcelain
- Then：`??` 归档新目录按文件级 pathspec 补暂存（限本变更 archive/<me>/）；knowledge 未暂存项打印「归档提交待办」git add 清单提示（不自动暂存，人核后提交）

### FR-02: 实测面对账文案注明「并集去重」语义（子集数=deps+FR 绑定分量并集去重后的值）

动态测试子集对账文案（src/verify-postcheck.js）必须注明子集数是 deps 与 FR 绑定分量的并集去重后的值（消除「deps 12 + FR 绑定 52 = 53」的算术困惑）。

#### 场景：主路径

- Given：flow done 实测子集输出
- When：渲染「动态测试子集」行
- Then：文案含「并集去重」语义说明

### FR-03: 重入 flow start 知识 digest 回填 input（flow-state 存 input 优先、proposal 动机转写回退），重入简报保持注入与抽查确认指引可见

重入 flow start 的知识 digest（src/flow.js 恢复分支）不得传 input:null——必须回填：flow-state 存有 input 字段时优先用之，否则从 proposal.md 动机节「任务原话转写：」后读回；重入简报必须保持知识注入与抽查确认指引可见（不再显示误导性的「语料未命中知识库」当首次 start 有注入时）。

#### 场景：主路径

- Given：change 首次 start 带有效 --input 且知识库有触达域命中
- When：重跑 flow start（不带 --input）
- Then：恢复简报含知识注入行（与首次同源信息），非「语料未命中知识库」

#### 场景：回退

- Given：存量 change 的 flow-state 无 input 字段
- When：重入 flow start
- Then：从 proposal.md 动机转写回填 input，注入照常

### FR-04: flow status 查不存在的变更改非零 exit（exit 1）且输出保留「变更不存在」文案，查在场变更仍 exit 0，测试锁定两形态

flow status（src/flow.js status 分支）查不存在的变更必须 exit 1（查询目标缺失——运行错非用法错），输出保留「变更不存在」文案；查在场变更（active/archived）仍 exit 0。行为测试必须锁定两形态。

#### 场景：主路径

- Given：变更不在场
- When：sillyspec flow status --change <名>
- Then：exit 1，stderr/stdout 含「变更不存在」

#### 场景：在场

- Given：活跃变更在场
- When：sillyspec flow status --change <名>
- Then：exit 0（现状保持）

### FR-05: 相关测试全部通过

本变更触达的测试面必须全部通过（含 flow-protocol/archive-tail-consistency 等回归不破）。

#### 场景：主路径

- Given：五点实现与测试就位
- When：运行本变更测试集
- Then：全部 pass

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-tail-polish.test.mjs「归档补暂存含未跟踪归档目录 + knowledge 待办清单提示（源码级）」
FR-02: test/flow-tail-polish.test.mjs「实测面对账文案含并集去重语义（源码级）」
FR-03: test/flow-tail-polish.test.mjs「重入 digest 回填 input：flow-state 优先 proposal 回退（行为级）」
FR-04: test/flow-tail-polish.test.mjs「flow status 不存在 exit 1 / 在场 exit 0（行为级）」
FR-05: test/flow-tail-polish.test.mjs 全量 + test/flow-protocol.test.mjs 回归
