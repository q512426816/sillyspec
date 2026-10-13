---
author: flow-machine-draft
created_at: 2026-10-13T16:19:34.884Z
---
# 需求规格（Requirements）— 2026-10-14-prestage-consent-gate

## 功能需求

### FR-01: 标记在场时全新 flow start 无声明 flag → exit 2 给两选一（--no-prestage 声明留痕 / run brainstorm 预段），文案含标记来源与原因

route-hindsight 标记文件在场时，全新（非 resume/非 adopt/非平台预建空目录）`flow start` 必须在清晰度门之后被同意门拦下（exit 2），拦截文案必须包含标记来源变更名、超阈原因、`--no-prestage` 声明通道与 `run brainstorm` 预段指路两选一；被拦时禁止创建变更目录、禁止消费标记文件。

#### 场景：标记在场全新 start 无声明

Given 临时仓已有 route-hindsight 标记（tasks 改写率 0.9 超阈）
When `flow start --change <新名> --input <含成功标准的合法输入>`（无 --no-prestage）
Then exit 2，输出含「预段选道同意门」/来源变更名/原因/两选一；标记文件仍在；变更目录未创建

### FR-02: --no-prestage 声明后放行，flow-state 落 prestage_ack 留痕，标记文件消费删除

标记在场时带 `--no-prestage` 的全新 start 必须正常放行（exit 0），flow-state 必须落 `prestage_ack: true` 留痕，标记文件必须被消费删除（一次性反馈：声明只豁免本次，之后再被标记重新拦）。

#### 场景：声明放行与留痕

Given 临时仓已有 route-hindsight 标记
When `flow start --change <新名> --input <合法输入> --no-prestage`
Then exit 0，flow-state.yaml 含 `prestage_ack: true`，标记文件已删除，输出含声明放行留痕行

### FR-03: adopt（头脑风暴收编）路径自动消费标记；resume 重入与平台 writer 预建空目录路径不受新门影响

adopt 路径（变更目录有 proposal.md/design.md、无 flow-state）遇到标记时必须无声明 flag 也放行并消费标记（走预段=选道正确）；resume 重入与平台 writer 预建空目录（proceedFreshEmptyDir）路径禁止被同意门拦截，平台路径禁止消费标记（留给人工会话）。

#### 场景：三豁免面

Given 三仓分别处于：①头脑风暴产物在场+标记 ②在途变更已起跑后落标记 ③预建空变更目录+标记
When 各自跑 `flow start`
Then ① adopt 收编成功且标记删除；② 恢复简报 exit 0 标记不动；③ 正常起跑 exit 0 标记不动

### FR-04: 选道判据三处同步：本仓 AGENTS.md、templates/agents-instruction.md、assets/command-cards/flow.md

选道判据必须在三处文案面同步收紧：轻量行明确「成功标准须来自用户原话或既有文档转写，agent 推断拟出的标准＝需求不清晰」，预段行与 flow 命令卡必须说明同意门的存在与 `--no-prestage` 通道；本仓 AGENTS.md 与 init 模板（templates/agents-instruction.md）应保持逐字一致。

#### 场景：三处文案落盘

Given 本变更已实现
Then AGENTS.md 与 templates/agents-instruction.md 选道表第 1/2 行含来源判据与同意门指路且逐字一致；assets/command-cards/flow.md 的何时用与防坑清单含同口径内容

### FR-05: 新增测试覆盖门行为（拦/放/消费/adopt 消费/平台豁免/resume 豁免），全量 npm test 零失败

新增 test/prestage-consent-gate.test.mjs 必须覆盖七个面：拦截（exit 2+文案+不消费）、声明放行（留痕+消费）、adopt 消费、平台豁免（不拦不消费）、resume 豁免（不拦不消费）、无标记零影响（输出不含门文案）、单元面（readHindsightMark/clearHindsightMark 读取与幂等消费）；全量 npm test 必须零失败。

#### 场景：测试面与回归

Given 实现与测试落盘
When `node --test test/prestage-consent-gate.test.mjs` 与全量 `npm test`
Then 7/7 通过且全量零失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/prestage-consent-gate.test.mjs「① 拦：标记在场 + 全新 start 无声明 → exit 2 两选一，标记不消费」
FR-02: test/prestage-consent-gate.test.mjs「② 放：--no-prestage 声明 → status 0 + prestage_ack 留痕 + 标记消费」
FR-03: test/prestage-consent-gate.test.mjs「③ adopt 消费 / ④ 平台 writer 豁免 / ⑤ resume 豁免」
FR-04: 不适用：文案面变更，由 flow done 的文件清单对账与人工评审核验（无独立可执行测试面；AGENTS.md 与模板逐字一致性由本条场景描述约束，未单列机械断言——避免对文档内容的脆弱字符串锁）
FR-05: test/prestage-consent-gate.test.mjs「⑥ 无标记零影响 / ⑦ 单元面」+ 全量 npm test
