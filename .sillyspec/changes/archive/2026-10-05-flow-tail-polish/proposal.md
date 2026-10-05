---
author: flow-machine-draft
created_at: 2026-10-05T15:23:16.287Z
---
# 提案书（Proposal）— 2026-10-05-flow-tail-polish

## 动机

任务原话转写：三轮轻量道实测（flow-help-status / input-teach-copyable / input-teach-non-src）发现四个收口与查询摩擦点：① flow done 报「归档注销」但 git 侧留半成品——只补暂存源侧移动（x=' ' 的 D/A/M 限 changes 目录），归档新目录（?? changes/archive/<me>/）与 distill 写的 knowledge 更新（changes 目录外）均不暂存也无清单，agent 要自己翻 git log 拼 pathspec（三轮均手工拼 15 项）；② 实测面对账数字口径不透明——「动态测试子集 = 53 个（deps 12 + FR 绑定 52）」12+52≠53，并集去重语义未说明（verify-postcheck.js:2033）；③ 重入 flow start 知识注入消失——重入分支 digest 传 input:null，「语料未命中知识库」误导且首次 start 给的抽查确认指引（FR-cli-entry-324/325）断点恢复后不可见；④ flow status 查不存在的变更 exit 0（flow.js:1792 return 不设 exit）——脚本无法区分「存在但无进度」与「不存在」。

成功标准：
- flow done 归档子步补暂存未跟踪的归档新目录（文件级 pathspec，限本变更 archive/<me>/），归档后仍有未暂存的 distill 产物（knowledge 路径）时打印待提交清单提示
- 实测面对账文案注明「并集去重」语义（子集数=deps+FR 绑定分量并集去重后的值）
- 重入 flow start 知识 digest 回填 input（flow-state 存 input 优先、proposal 动机转写回退），重入简报保持注入与抽查确认指引可见
- flow status 查不存在的变更改非零 exit（exit 1）且输出保留「变更不存在」文案，查在场变更仍 exit 0，测试锁定两形态
- 相关测试全部通过

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. flow done 归档子步补暂存未跟踪的归档新目录（文件级 pathspec，限本变更 archive/<me>/），归档后仍有未暂存的 distill 产物（knowledge 路径）时打印待提交清单提示
2. 实测面对账文案注明「并集去重」语义（子集数=deps+FR 绑定分量并集去重后的值）
3. 重入 flow start 知识 digest 回填 input（flow-state 存 input 优先、proposal 动机转写回退），重入简报保持注入与抽查确认指引可见
4. flow status 查不存在的变更改非零 exit（exit 1）且输出保留「变更不存在」文案，查在场变更仍 exit 0，测试锁定两形态
5. 相关测试全部通过

## 成功标准（可验证）

1. flow done 归档子步补暂存未跟踪的归档新目录（文件级 pathspec，限本变更 archive/<me>/），归档后仍有未暂存的 distill 产物（knowledge 路径）时打印待提交清单提示
2. 实测面对账文案注明「并集去重」语义（子集数=deps+FR 绑定分量并集去重后的值）
3. 重入 flow start 知识 digest 回填 input（flow-state 存 input 优先、proposal 动机转写回退），重入简报保持注入与抽查确认指引可见
4. flow status 查不存在的变更改非零 exit（exit 1）且输出保留「变更不存在」文案，查在场变更仍 exit 0，测试锁定两形态
5. 相关测试全部通过
