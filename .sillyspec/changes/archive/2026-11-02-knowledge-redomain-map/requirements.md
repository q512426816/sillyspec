---
author: flow-machine-draft
created_at: 2026-11-02T11:41:53.573Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-redomain-map

## 功能需求

### FR-01: 工具：redomain-unmapped 加 --map <file>（显式映射 [{id,domain}]，id 精确匹配、过期 id 被精确命中断言拦截；特殊 domain __prune__ 删段原语：精确计数断言、裁空删文件 + syncIndexRoutingLines、prune-only 也调 sync）；--map 模式 apply fail-fast（放弃逐组容错）；守恒断言 apply 时重算段头总数；幂等复跑 0 迁移断言；正文归一化比对与 supersedes 目标留源均作警告输出

--map 模式必须旁路启发式投票：显式映射精确匹配段头，过期 id（文件中不存在）必须被断言拦截报错；domain 为 __prune__ 的条目必须从源文件删除该段（pruned 数 ≠ 映射命中数即报错；裁空删除源文件并同步 INDEX 路由行；prune-only 路径也必须调用 syncIndexRoutingLines）；--map 模式 apply 必须 fail-fast；apply 后必须重算段头断言守恒（原段头 − moved − pruned = 新段头）；apply 后幂等复跑必须 0 迁移 0 裁剪；被迁移/裁剪条目的 supersedes 目标若留在源文件必须输出警告（不作阻断）。

#### 场景：过期 id 拦截

Given 映射表含文件中不存在的 id
When --map dry-run/apply
Then 报错列出未知 id 并中止（不静默漏迁）

#### 场景：裁空删文件

Given 某文件全部条目映射为 __prune__
When apply
Then 源文件删除且 INDEX 对应路由行清除

### FR-02: 本仓执行：裁 229 条 duplicate（decisions 21 + fr 208，执行时重新验证清单防 id 漂移）；9 unique 不动不打标（4B 报告给 4A ledger 指针 + 锚点未记录/投票零命中/需人工定域说明）；模板保留原位；fr/unmapped 头注「残余 625 条」失真记 4C

本仓执行时必须重新验证 duplicate 清单（重跑 4A 判定逻辑防 id 漂移），229 条 duplicate 裁剪经 --map __prune__ 落盘；9 条 unique 不迁移不打标；模板条目保留原位；fr/unmapped 头注数字失真记录到 4B 报告（修正留 4C）。

#### 场景：id 漂移防御

Given 4A 归档后 unmapped 新增了 1 条模板
When 生成裁剪清单
Then 重新判定而非照抄 4A ledger，新增条目不被误裁（非 duplicate 类）

### FR-03: 平台输出：135 条建议两栏（117 干净胜者直喂 + 18 平票只列候选域集不填 domain）+ 平台 fr/backend.md 无段头孤儿字段块结构破损警告 + 执行时重生成提示；不写平台仓

平台仓输出必须只读生成：模块投票干净胜者生成可直接喂 --map 的映射；平票（含三路平票）只列候选域集不填 domain；附平台 fr/backend.md 孤儿字段块结构警告与「执行时重新生成清单」提示；禁止写入平台仓任何文件。

#### 场景：平票不硬选

Given 某 id 三路平票 daemon|sillyhub-daemon|agent-detector
When 生成建议
Then 输出候选集（不填 domain）而非字典序硬选

### FR-04: 验收：段头守恒（裁后 decisions = 模板+unique+运行时新增、fr = 2、duplicate 清零）+ apply 后幂等复跑 0 迁移 + eval 六探针 GREEN 五面零回归（unmapped 已被检索过滤，预期零变化）+ 显式 pathspec 提交可回滚

验收必须以运行时断言为准：apply 后段头守恒；apply 后幂等复跑 0 迁移 0 裁剪；eval 六探针 GREEN、五面与 baseline 一致（unmapped 已被检索全面过滤，预期零变化）；knowledge 改动以显式 pathspec 提交。

#### 场景：检索零变化

Given 裁剪 229 条
When 跑 eval 全量对比 baseline
Then 五面指标逐位一致、六探针 GREEN

### FR-05: 测试：--map plan/apply、__prune__ 裁剪、裁到 0 段删文件+INDEX 清行、守恒、幂等、过期 id 报错、supersedes 警告、prune-only INDEX 同步；既有 redomain 三套测试回归

必须覆盖：--map plan/apply、__prune__ 裁剪与精确计数、裁到 0 段删文件 + INDEX 清行、apply 守恒断言、幂等复跑、过期 id 报错、supersedes 留源警告、prune-only 的 INDEX 同步；既有 redomain-unmapped-bulk / decision-redomain / redomain 测试全绿。

#### 场景：空实现判据

Given 移除 __prune__ 原语的计数断言
When 跑新测试
Then 必须失败

## 测试绑定（每条 FR 至少一行——「FR-NN: test/路径「用例名」」；空行/待填在 flow done 拒收）

FR-01: test/redomain-unmapped-map.test.mjs「--map 迁移与 __prune__ 契约」
FR-02: test/redomain-unmapped-map.test.mjs「duplicate 重验证与裁剪执行」
FR-03: 不适用：平台只读清单生成（复用 FR-01 工具面；两栏/警告为报告内容）
FR-04: test/redomain-unmapped-map.test.mjs「守恒与幂等复跑」
FR-05: test/redomain-unmapped-map.test.mjs 全组 + 既有 redomain 三套回归
