---
author: flow-machine-draft
created_at: 2026-10-16T03:40:37.231Z
---
# 决策记录（Decisions）— 2026-10-16-release-3-33-0

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：registry 通道不稳定（历史 DNS 劫持，3.32.4~3.32.9 走钉扎、3.32.10 直连恢复）导致预核验假败或 publish 失败——缓解为发布前 npm view 预核验，失败即降级钉扎通道（腾讯 DoH 重解析刷新 PIN），预核验失败不发布。次风险：CI Linux test job 修复 install 后首跑真实暴露 ~16 例存量平台债（resolvePlacementRoot 的 `D:/quoted` Windows 盘符 fixture、stderr 字节一致内嵌非确定时长等，跨 ~10 套件，本地 Windows 全绿）——定性为 121a33ee CI 引入首次揭示的存量测试面平台债，非本版回归（本版触碰面仅测试断言锚/版本面/CI install，零产品代码），另案清偿不阻断本版，publish 全量口径与既往十版同（本地 Windows 全量绿）。死路：系统级改 hosts 绕劫持——零系统改动纪律排除；npm mirror 镜像发布——非官方源不作发布通道；跳过漂移修复直接推——HEAD 全量红欠账带病上线，bisect 与后续全量门全被污染，排除；把 16 例 Linux 平台债塞进本版清偿——范围失控（平台移植非发布），排除。
