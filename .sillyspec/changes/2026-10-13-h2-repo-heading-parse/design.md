---
author: flow-machine-draft
created_at: 2026-10-13T03:33:33.661Z
---
# 设计记录（Design Record）— 2026-10-13-h2-repo-heading-parse

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 src/change-list.js 的 _parseFileListDetailed 节扫描：段头「## <注册key> 仓变更」（REPO_SECTION_HEADER_RE，可含编号前缀/括号备注）从「终结节」改为「节内子分段」——扫描穿过段头 h2 不截断，段头行作为 currentRepo 设置器（key 须在 repoKeys 注册表内，未注册含 main 归主仓 repo=null，fail-closed 同既有 detectRepoFromSubsection 口径）。为什么修解析器不改文案：该段头形态是生态既定约定，brainstorm 厚道模板（stages/brainstorm.js:320 教学且点名 plan-postcheck 按此解析）、plan-postcheck 覆盖对账（parseDesignCoverageByRepo 本就穿过段头）、design-facts/docs-check 存在性核验（复用 parseDesignCoverageByRepo）、评审清单四处消费——change-list 是唯一离群者，改四处文案+证据文档反而制造第二套书写约定。单一源：REPO_SECTION_HEADER_RE 定义从 plan-postcheck.js:951 上移 change-list.js 导出、plan-postcheck 改 import（其本已 import change-list，无环）；### 子段与 cross-repo: 前缀两既有形态不动。上一变更（thin-empty-face-crosscheck）新加的三处文案（advisory/空面门/横幅）推荐的形态①随之成真，零文案改动。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

change-list.js 新增导出 REPO_SECTION_HEADER_RE（段头正则，原 plan-postcheck.js 模块内常量上移）；_parseFileChangeList 内核行为扩展：h2 段头行=节内 repo 分段（解析出条目带 repo 标注），parseFileChangeList（Set 包装）自动受益。plan-postcheck.js 删本地 RE 定义改 import（消费点 parseDesignCoverageByRepo/覆盖对账零变化）。对外行为：design 清单「## <key> 仓变更」段条目从「解析为空（节被截断）」变为「解析出且带 repo」——thin flow done 对账/冻结面自此识别段头形态；未注册 key/非段头 ## 章节截断行为不变。命令/端点/文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。解析是单文件行扫描纯函数：段头与条目按出现顺序消费，段头之前内容归主仓、之后归该段——与 plan-postcheck parseDesignCoverageByRepo 的切分语义同构（同一正则同一顺序规则）。表格/列表/排除段（### 不修改文件）与段头的交错：段头重置 currentRepo 并切回 include 模式（新分段自然包含），排除语义只在 ### 分类子段内生效。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

纯读盘解析、无写面；多会话并行收口时各自读同一 design.md 得同一结果（幂等）。RE 上移不改变两模块任何运行时状态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。无状态机、无落盘中间态；flow done 断点续跑重入解析结果幂等。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。repoKeys 由调用方传入（local.yaml repos 注册表），仓归属判定 fail-closed 只认注册 key——未注册段头（含 main、拼写错 key）归主仓，与既有 ### 子段/cross-repo: 前缀同一注册表同一判定，不引入新的跨仓面。正则 key 字符类 [A-Za-z0-9_.-]+ 不含中文/路径分隔符，不会把普通章节标题误判段头。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：节扫描穿过段头后误延「文件变更清单」节边界——非段头的 ## 章节标题（如「## 接口契约」）仍必须截断。缓解：截断判定=^## 且不匹配 REPO_SECTION_HEADER_RE（精确形态：编号前缀+key+仓变更+括号备注+冒号可缺），普通标题形如「<词> 仓变更」的误写由 plan-postcheck 既有 LOOSE_RE 点名（不在本变更面）；测试钉死「非段头 ## 截断」回归。次风险：h3 段头（### <key> 仓变更）现在有 RE 命中与 detectRepoFromSubsection token 命中两条等价路径——实现上段头分支前置统一处理，### 分支保持原样，两路径不叠加执行。试过放弃的方案：①改四处文案弃段头形态（推荐 ### 子段/cross-repo: 两种）——与生态既定约定（厚道模板/覆盖对账/docs-check 三处解析器）制造第二套约定，agent 在厚薄两道间会拿到互相矛盾的指引；②在 flow.js 收口侧做段头归一化预处理——对账口径分散两处，plan-postcheck/design-facts 不受益。均否。
