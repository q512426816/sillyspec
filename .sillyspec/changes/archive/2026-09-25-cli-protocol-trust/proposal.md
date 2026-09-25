---
author: flow-machine-draft
created_at: 2026-09-25T15:24:49.577Z
---
# 提案书（Proposal）— 2026-09-25-cli-protocol-trust

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:a09091c374e777b11c633d0cb090fe7c2d5f54c3e3b9dbe5297488cc3d16ac60:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-cli-protocol-trust 留痕重锚 -->
任务原话转写：动机：R17 实验暴露的 CLI 协议可信度缺陷经子代理实证确认：①flag 白名单双死路——CLI 报错指引指向未登记 knownFlags 的 flag（--same-session 消费于 command.js:1748、--force 于 :1562，照指引重跑即 exit 2）；②摘录双碎片化——extractSuccessCriteria 行级切分拆散括号换行条目、tasks 渲染 slice(0,60) 硬切无句界感知；③verify 批量快进跳过 noAI 亲测步（:1566-1573 乐观对齐打破「批量不省任何门」承诺）→ PASS 封顶拒 → 四步绕行；④archiveNarrowedGitAdd 不盖 knowledge/fr 与 decisions 面——distill 产物 untracked 漏提交。
成功标准：
- --same-session 与 --force 登记 knownFlags 白名单；新一致性钉 test/flag-contract.test.mjs：静态扫描 command.js 三种 flag 消费形态（flags.includes/getFlagValue/autoFlagValue）vs 白名单+显式透传 allowlist，任何被消费未声明的 flag 测试红（钉死整类漂移）
- extractSuccessCriteria 前置续行合并（括号/引号未闭合跨行并回、行尾悬空冒号/顿号续行合并，切分保持行级）；tasks 渲染放宽（60 字硬切改句界感知截断带省略号，或放宽上限）；碎片特征检测（括号不平衡/开括号收尾/闭括号开头）console.warn 不阻断；flow-draft 测试扩展（续行合并/碎片检测/渲染）
- detectVerifyBatchFinish 批量对齐前：对齐面含 verifyRunQualityScan 步且记录缺失/指纹失配 → 先跑 executeVerifyQualityScan（幂等复用，失败 throw 保持 pending 不对齐），成功再对齐——「批量不省任何门」承诺恢复成立
- archiveNarrowedGitAdd 扩面：归档链 add 覆盖 knowledge/fr 落点域文件（indexRequirements 返回的 written[].file）与 decisions 蒸馏目标
- 新增测试与既有套件全绿（flag 钉/flow-draft 扩展/complete 互锁用例）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:883fa692f177a5080ef921e651c1dd39176e54cb9e861b28d891276bab8b461b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-cli-protocol-trust 留痕重锚 -->
按成功标准机械推导，共 10 条验收面：
1. --same-session 与 --force 登记 knownFlags 白名单
2. 新一致性钉 test/flag-contract.test.mjs：静态扫描 command.js 三种 flag 消费形态（flags.includes/getFlagValue/autoFlagValue）vs 白名单+显式透传 allowlist，任何被消费未声明的 flag 测试红（钉死整类漂移）
3. extractSuccessCriteria 前置续行合并（括号/引号未闭合跨行并回、行尾悬空冒号/顿号续行合并，切分保持行级）
4. tasks 渲染放宽（60 字硬切改句界感知截断带省略号，或放宽上限）
5. 碎片特征检测（括号不平衡/开括号收尾/闭括号开头）console.warn 不阻断
6. flow-draft 测试扩展（续行合并/碎片检测/渲染）
7. detectVerifyBatchFinish 批量对齐前：对齐面含 verifyRunQualityScan 步且记录缺失
8. 指纹失配 → 先跑 executeVerifyQualityScan（幂等复用，失败 throw 保持 pending 不对齐），成功再对齐——「批量不省任何门」承诺恢复成立
9. archiveNarrowedGitAdd 扩面：归档链 add 覆盖 knowledge/fr 落点域文件（indexRequirements 返回的 written[].file）与 decisions 蒸馏目标
10. 新增测试与既有套件全绿（flag 钉/flow-draft 扩展/complete 互锁用例）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:bc8bb37594e4dc21ad55ddbc752fbc5753a699ecb74d3dc91d546c162717d0c1:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-cli-protocol-trust 留痕重锚 -->
1. --same-session 与 --force 登记 knownFlags 白名单
2. 新一致性钉 test/flag-contract.test.mjs：静态扫描 command.js 三种 flag 消费形态（flags.includes/getFlagValue/autoFlagValue）vs 白名单+显式透传 allowlist，任何被消费未声明的 flag 测试红（钉死整类漂移）
3. extractSuccessCriteria 前置续行合并（括号/引号未闭合跨行并回、行尾悬空冒号/顿号续行合并，切分保持行级）
4. tasks 渲染放宽（60 字硬切改句界感知截断带省略号，或放宽上限）
5. 碎片特征检测（括号不平衡/开括号收尾/闭括号开头）console.warn 不阻断
6. flow-draft 测试扩展（续行合并/碎片检测/渲染）
7. detectVerifyBatchFinish 批量对齐前：对齐面含 verifyRunQualityScan 步且记录缺失
8. 指纹失配 → 先跑 executeVerifyQualityScan（幂等复用，失败 throw 保持 pending 不对齐），成功再对齐——「批量不省任何门」承诺恢复成立
9. archiveNarrowedGitAdd 扩面：归档链 add 覆盖 knowledge/fr 落点域文件（indexRequirements 返回的 written[].file）与 decisions 蒸馏目标
10. 新增测试与既有套件全绿（flag 钉/flow-draft 扩展/complete 互锁用例）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
