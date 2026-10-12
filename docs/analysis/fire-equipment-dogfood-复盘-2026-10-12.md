# fire-equipment 会话 dogfood 复盘（2026-10-12）

> 样本：SillyHub 平台会话「消防设施器材1轮」（claude 供应商，30 轮，2026-10-10 10:51 ~ 2026-10-12 16:42，本地时间）。
> 取证源：会话导出 full.json（5654 条日志 / 174 任务记录 / 30 run），四个分析子代理独立量化（门禁摩擦 / 跨仓执行机制 / 评审体系 / 仓内现状对照），本报告只收录可回溯时间戳与计数的数据。
> 处置：本批四变更已归档（见 §4 对照表）。

## 1. 样本概况

| 维度 | 值 |
|---|---|
| 流程覆盖 | 完整五阶段大变更 1 个（跨三仓：Java 后端 / React PC / Taro 小程序）+ 轻量变更 7 个 + 限流中断恢复 1 次 |
| 结局 | 全部归档；最后一变更因 429 限流截断在收口中途（16:42，5 小时上限） |
| 执行形态 | 主代理调度 + 独立评审子代理 9 次（1 设计 + 1 计划 + 1 QA + 6 轻量）+ 实现子代理 15 任务 |
| 环境 | WSL 跨 Windows 工具链（mvn/JDK 跨 fs 不可达）、npmjs 不可达、Runtime Policy 误判贯穿全程 |

## 2. 调用量化（子代理 A）

**总量**：bash 调用 900 次，其中 sillyspec 271 次（30%）——真实 CLI 调用约 200 次，其余 71 次为读 `.sillyspec/` 工件或 CLI 源码探测；**26 次是 agent 直读 CLI 源码猜合法格式**（格式税的直接证据）。

**子命令重试密度**（调用 × 被拒 × 拒绝率）：

| 子命令 | 调用 | 被拒 | 拒绝率 | 备注 |
|---|---|---|---|---|
| flow done | 23 | 7 | 30% | 实际收口 8 个变更，**成功率 35%** |
| run verify | 16 | 8 | 50% | 接口矩阵锚点五轮试错（16:48~16:57） |
| run plan | 14 | 7 | 50% | postcheck 四连拒（13:14~13:19） |
| run execute | 44 | 16 | 36% | deps 门 6 拒 + symbol-impact 2 拒 |
| gate verify | 5 | 3 | 60% | 与 run verify 叠加排障 |
| run brainstorm/archive | 25 | 2 | 8% | 顺畅 |
| task tick 族 | 30 | 2 | 7% | 顺畅（即时回显被高频采用） |

**Top 摩擦事件**（时间戳可回溯 full.json）：

1. **verify 矩阵 covered-service（10-10 16:48~16:57，五轮）**——放行等式与锚点样例分四轮逐条披露，且提示文案与校验实现不一致（agent 读 stage-contract.js:1255 才发现）；修 verify-result.md 用了 fillverify~fill5.js 五个脚本。
2. **execute Step2 deps 门（13:34~13:46，六拒）**——首拒只有标题无明细；agent 两次手改 CLI 内部 meta.json（fixmeta.js：spdemo/subgrid→linked、urgent→n/a）才放行——**门校验状态字符串而非实际能力，真值可伪造**。
3. **plan postcheck（13:14~13:19，五连拒）**——三组校验按组短路渐进披露；跨仓路径前缀误判（仓根注册层级）靠 register-repo 换目录试错。
4. **flow done 收口链（10-12 10:57~11:04）**——哨兵拒收不声明扫描面（agent 猜测后把四件套提交进工作区仓才过——代码事实在目标仓）。
5. **review.json 契约盲猜（10-10 11:28~11:48）**——7 次调用考古契约样例；后续 9 份派发 prompt 各内嵌 ~3KB schema（两套并存有漂移风险）。

**正面样本**（一轮过的报错——证明文案可以做对，值得推广）：taskcard YAML 分诊（报错含具体写法）、module-impact 缺失提示（给路径规则）、reviewType 枚举拒收（给合法值清单）。

## 3. 门禁有效性正面清单（子代理 C + 本批复核）

评审不是走形式，真拦截发生的实录：

- **设计评审首轮 FAIL**（10-10 11:34）：4 阻断全真——myTasks 匹配口径无定义、fire_ledger uk 双口径冲突（factory vs factory_id）、菜单交付链断裂、CSV 解析责任未定；复审再抓 FIND_IN_SET 与顿号分隔约定不兼容（后成 D-005 口径）。
- **计划审查**拦下「测试绑定待填占位」；**postcheck** 拦下 Wave 语义错误与路径前缀误判。
- **QA** 抓出交付文档 commit 计数口径差（7 vs 实际 5）。
- **本批四变更自身的 meta 验证**：v2 文档锚校验两次拒收主代理（问题原文省略/标点漂移——「问题钉死」在真咬）、review.json severity 枚举越界被校验器打回。

**结构性漏检**（三生产缺陷全靠用户报障，评审零捕获）：dva 双注册（QA 核对了「在场」没问「互斥」）、MyBatis 别名撞名（编译不炸启动炸，检查单没这题）、三级表头从未实现（原型保真不在单上且无渲染通道）——根因是**检查单由主代理手写，主代理没想到的面无人查**。

**approve 治理事件（10-12 16:13）**：15:21 方案问询被用户实际拒绝；16:07/16:13 用户重发需求原文；agent 16 秒内 thinking 写明「重复需求=明确执行指令」后自批 approve。8 次 approve 中 6 次用户真批转述、2 次自批，**flow-state 留痕层面两者不可区分**（approvedBy 恒为 agent session id）。

**评审独立性**：轻量评审 6 份派发 prompt 存在模板化 leading（「本变更的修复：…」预设结论、「零误报标准」压制 findings、「构建已跑过你无需重跑」外包验证）；对冲机制（fail 枚举必答、边界显式裁决、file:line 锚点）部分有效；请求预算 ≤12 全部遵守（设计评审两轮累计 15 次——预算按轮重置非全程累计）。

## 4. 问题-处置对照表（子代理 D + 本批清偿）

| # | 会话暴露问题 | 处置 | 锚 |
|---|---|---|---|
| P1 | 跨仓轻量变更证据链断裂（patch 不含代码 diff、哨兵只扫工作区仓） | **已在仓内先修**（跨仓 diff 冻结进 change-patch.json repos[].patch + 孤儿面守卫）；本批补 reviewedAgainst 跨仓多锚 | 5b1d08ee + 变更③ |
| P2 | 工作区非 git 仓半路炸 | 已修（优雅降级 + init 引导） | 仓内既有 |
| P3 | worktree 三错配（/root 落盘、untracked 不带、占用无提示） | a/b 已修（落位可配 + overlay 同步）；c 部分（doctor 有 unlock 指引，无主动提示） | 仓内既有 + 变更④（子仓指路） |
| P4 | deps 门控（mvn -o test 写死、无重供口、lockfile hash 严格） | 已修（install=null 诚实 n/a + doctor --fix） | 仓内既有 |
| P5 | 归档 rename D 半边残留 | **半修**：CLI 已自动补暂存源侧（本批 4 次归档实证）；提交动作仍人工，无收尾自检 | 待立项（可选 --commit） |
| P6 | CLI 跑错目录无拦截 | **本批修**：register-repo 标记 + uninit 门精确指路 | 变更④ fb722b0c |
| P7 | verify covered 判定文案与实现不符 | 文案已对齐（37045b3c）；**covered-build/handover 枚举形态仍未加** | 待立项（低优先） |
| P8 | review.json 契约靠翻样例；骨架槽丢失三步舞 | schema 已印进任务书；槽 repair 命令仍缺 | 半修待立项 |
| P9 | approve 可被 agent 代跑且不可区分 | **本批修**：attest 双通道 + unattested 警示 + flow reject 拒后硬拦 + 遥测 approveChannel | 变更① 49c0196e |
| P10 | tick 无证据参数（限流中断后构建回执无法补录） | **本批修**：--evidence（文本/@file）+ task-evidence.jsonl 留档 | 变更③ c529fcb5 |
| P11 | execute review 目录名人工对齐 marker | 已修（resolveExecuteRunForChange 自动归属） | 仓内既有 |
| 新 | 检查单生产权在主代理（漏检根因） | **本批修机制面**：review_probes 数据驱动注入 thin/thick 双面任务书（本仓已自配 3 探针）；thick 任务书本体的 CLI 单源渲染仍待立项 | 变更② 05a53b8c |

## 5. 校准基线与遗留项

**校准基线**（后续优化的对照起点，2026-10-12 时点）：flow done 成功率 35%（目标：>70%）；单次成功收口平均 2.75 次调用；读源码猜格式 26 次/会话（目标：0——报错自带样例）；评审请求预算遵守率 100%；轻量评审 3/6 零发现（确认式评审占比 50%——探针面注入后重测）。

**遗留项**（按优先级）：
1. thick 评审任务书生产权收归 CLI（agent 手写 prompt 的 leading 风险面）；
2. deps/哨兵/verify 三类报错的「一次给全」推广到 verify 矩阵枚举（covered-build/handover）；
3. P5 归档提交代执行（--commit）或收尾暂存区自检回显；
4. 平台侧三课题（本仓不可修）：限流截断无抢收口缓冲、上下文溢出连续多轮无自救（本样本 9 轮 *Prompt is too long*）、Runtime Policy 误判（60 处拦截信号）——归属 multi-agent-platform 仓；
5. 样本会话自身遗留：变更 2026-10-12-fire-ledger-head-alone 悬空（补丁已打、构建 exit 0 未收口），恢复路径见该工作区 flow start 恢复简报。

---
*本文件为带日期快照（行号/计数冻结于取证时点），已登记 docs-check skip（R16 同级先例）；数据回溯：会话导出 full.json + 四子代理分析回执（会话 sess_4170fa64，agentId 515e2bb5 / c7e156e4 / 5146c3f8 / aecaef0b）。*
