---
author: flow-machine-draft
created_at: 2026-10-09T01:37:47.110Z
---
# 决策记录（Decisions）— 2026-10-09-release-3-32-2

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：publish 与 push 顺序——3.32.1 实证先 publish 后 push 的窗口内 registry 与 origin 短暂不一致（可接受：包内容同树，安装者拿到的代码一致）；npm 2FA/令牌失效会阻断 publish（届时停下向用户报错，不假绿）。试过但放弃：无——发版路径完全镜像既有 3.32.1 惯例，无新方案尝试。
