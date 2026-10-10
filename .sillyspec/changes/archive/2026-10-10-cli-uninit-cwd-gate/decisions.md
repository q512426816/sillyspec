---
author: flow-machine-draft
created_at: 2026-10-10T02:36:26.245Z
---
# 决策记录（Decisions）— 2026-10-10-cli-uninit-cwd-gate

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：豁免清单漏项/多项——漏项误拦合法命令（agent 被 exit 2 打断），多项放走本该拦的命令（回到静默错答）。缓解：清单每项注释豁免依据，测试抽样锁定两侧（豁免面与非豁免面各一组断言），后续增删走清单单一真相源。次风险：重锚定改变个别命令对 cwd 的隐式依赖（相对路径参数按 cwd 解析的命令）——全量套件回归无此类失败，锚定提示行让差异可见。已试并放弃：① 判据用「cwd 本身含 .sillyspec」——拦掉设计支持的子目录运行（ancestorSpecDirs 注释明证），误伤面大；② 拦 init（已初始化目录禁 init）——重跑 init 是模板/skills 升级路径（AGENTS.md「重跑 init 同版本不更新」），拦截打断升级；③ 逐命令补「未初始化」检查——散点维护、报错时机晚且文案不一，正是要治的根因；④ 门内重写祖先遍历——丢 home/tmp/.runtime 守卫会复辟 2026-09-27-spec-sync-413 等已修复坑，改为复用 resolveSpecDir。
