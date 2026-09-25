---
author: flow-machine-draft
created_at: 2026-09-25T16:03:18.014Z
---
# 决策记录（Decisions）— 2026-09-25-cli-protocol-trust

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险=批量亲测改变 verify --done 时序（原先纯同步批量对齐现在可能跑 2-10 分钟实测）——照 gates.js 亲测先例补了预告输出，且幂等指纹复用使二次跑秒回；若亲测环境异常，失败降级单步（用户可 --reopen 走原路）无新死路。死路①：句子级强切+标点自检（评审否决：误伤复合条目/无标点条目）；死路②：flag 钉全仓扫描（三个子模块读 argv 的透传面无法静态判定消费——收窄到 command.js 单文件+显式 allowlist 才可行）。
