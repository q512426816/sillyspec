---
author: flow-machine-draft
created_at: 2026-09-30T07:32:48.207Z
---
# 决策记录（Decisions）— 2026-09-30-verify-done-green-reuse

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：缓存绿被误复用——「本次没跑但结论是绿的」若指纹口径有洞（如 local.yaml 恰好在两次 --done 间被改）会吃旧绿。防线：local.yaml 整文件哈希入指纹（改命令必 miss）+ TTL 30min + 文档面剔除只影响「文档改动不击穿」（代码改动必击穿）+ OFF 逃生阀。已放弃方案：a) verify 收口实测结果全量缓存（不过期）——违背 fail-closed，环境漂移（DB/网络态）会吃陈旧绿，弃；b) 只修文案不接缓存——文案消掉三轮试错但 10 轮 ×290s 的实测重复真跑原样保留（本次实证的大头），弃。已知残留：multi-agent-platform .runtime/green-cache/ 下有 0 字节 'change' 文件（14:13 产物），非本仓代码与项目代码所写（双仓 grep 零命中），不影响 lookup（文件名精确匹配永远 miss），留观察不入本变更。
