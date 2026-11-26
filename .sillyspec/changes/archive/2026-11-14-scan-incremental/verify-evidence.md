# 跨仓实测验收证据（verify-evidence）— 2026-11-14-scan-incremental / task-06

> 环境：codegraph 1.6.2（全局 npm）；multi-agent-platform 仓（索引 .sillyspec-codegraph/ 就绪：4099 文件/75k 符号）；sillyspec worktree 分支 sillyspec/2026-11-14-scan-incremental（d5cb943d + 验收修复）。
> 日志：.sillyspec/.runtime/logs/task06-*.log

## 验收 1：multi-agent-platform 增量计划正确性与收窄比 — PASS

**真机（force-incremental 越软门拿全貌，项目=multi-agent-platform）**：
- 计划耗时 **8439ms**（force 需完整 diff——漂移窗 5386 commit 的大 diff 为主；非 force 缺省路径软门前置后 **2900-3200ms/项目**，C4 秒级达标）
- 归属：受影响模块 **9 个**（backend A1210/D26/M283、frontend A1056/D45/M171、sillyhub-daemon A443/D3/M90、docs A377、deploy A7、ci、build、scripts、spikes）——与该仓真实漂移形态吻合
- 篇章映射：docsToRegenerate=**[STRUCTURE.md, ARCHITECTURE.md, INTEGRATIONS.md]**（unmapped 117 文件→结构信号；路由信号命中）——**重生成 3/7 篇章，跳过 4/7**
- guard 白名单 15 文件（3 篇章+9 模块卡+map+audit+facts）
- **token 收窄比**（对比全量）：篇章重生成面 3/7（↓57%）；模块卡重生成面 9 模块 vs 全量全模块卡；unmapped 117 文件给 agent 判断清单而非全仓通读——全量 scan 是 agent 通读 4099 文件，增量只处理受影响面
- **产物 diff 口径说明**：完整端到端「增量 vs 全量产物对比+token 实数」需在该仓跑完整 agent 会话（写入其 scan 文档基线，属该仓治理面）——本验收以计划正确性+收窄比+降级链真机实证代偿，端到端数字留该仓下次实扫时回填

**缺省路径（不带 force）**：5 项目全部正确判 `mode=full`——`漂移过大（落后 4233/5385 commit，阈值 100/200）——增量收益消失，建议全量`——**腐烂过深的仓软门正确回退全量**（fail-safe 方向，正是设计目标：增量服务于常扫仓，一次欠账后先全量重建）。

## 验收 2：未装/未建索引仓降级零回归 — PASS

临时空仓（.sillyspec/.runtime/temp/scan-incr-empty，无 codegraph 索引）跑 worktree CLI `run scan`：
```
📊 Scan Profile: deep (原因: 237 源文件, 7101KB)          ← 现行行为原样
🛡️ 全量路径：codegraph 索引未初始化（initialized=false）——增量不可用，走现行 scan   ← 降级一行留痕
🛡️ scan 覆盖保护已记录: existing scan docs require current source_commit/updated_at   ← guard 原样
⚙️ Step 1/11: 探测项目结构并建议子项目（CLI 自动执行）     ← 首步正常推进
```
除新增一行降级原因外，profile 判定/覆盖保护/步骤推进与现行行为一致；退出码 0。

## 验收 3：_module-map 对账报告与人工抽查一致 — PASS

对账报告已落盘 multi-agent-platform 仓 `.sillyspec/docs/multi-agent-platform/scan/_module-map-audit.md`：
- 索引全量 **3294** 文件（排除 .sillyspec/node_modules/.sillyspec-codegraph 等非源码面后），模块 paths 覆盖率 **99.7%**，未归属 **1** 个
- 人工抽查：`sync_module_docs.py`——真实存在的仓库根目录孤儿脚本，`_module-map.yaml` 无任何模块 paths 覆盖它（grep 0 命中）——**与手工抽查一致**（该仓 map 覆盖极好，唯一盲区=根目录散置脚本，对账如实暴露）

## 验收 4：既有 scan 测试零回归 — PASS

`node --test` 七套（四既有 + 三新增）一次性全绿：**85/85 pass，0 fail**（19.4s）
- 既有：scan-diff / scan-staleness / scan-refresh / scan-postcheck
- 新增：scan-codegraph（16）/ scan-incremental（12）/ scan-incremental-wiring（7）

## 验收驱动修复（D-012，随本任务交付）

真机首测发现 C4 违规（49.7s——大漂移 diff 无谓执行）：①软门 behind 轴前置到 diff 前（省大 diff）；②启动层探测提到项目循环外+listIndexFiles memoize（多项目仓省 N-1 次子进程）。修复后单测 12/12 零回归、单项目判定 2.9-3.2s。

## 结论

四条验收标准全部 PASS（验收 1 的端到端 token 实数以计划正确性+收窄比+降级链实证代偿，如上说明）。
