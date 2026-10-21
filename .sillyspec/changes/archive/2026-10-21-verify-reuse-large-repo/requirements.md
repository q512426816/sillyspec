---
author: flow-machine-draft
created_at: 2026-10-21T14:37:30.768Z
---
# 需求规格（Requirements）— 2026-10-21-verify-reuse-large-repo

## 功能需求

### FR-01: 大仓代码树键非空——safeGit 显式 maxBuffer（必须）

src/run/code-face-key.js 的 safeGit 必须为 execFileSync 显式设置 maxBuffer（256MB，对齐 src/git-helper.js GIT_MAX_BUFFER 口径）：git ls-tree -r -z 输出超过 execFileSync 默认 1MB 的仓（multi-agent-platform 实测 1.95MB、本仓 1.76MB）不得再因 ENOBUFS 被吞成 null。computeCodeTreeKey 在此类仓必须返回非 null 的 sha256 hex——否则 computeQualityScanFingerprint / dedupKey / passedKey / rerunSignature 全链 null，失败签名去重与 passed 幂等复用在 >1MB 仓整体失效（dsh 0ff6f1c8 取证：76 分钟内同码态全量实测 6 次 ×10~13.5 分钟）。git 真不可用/非 git 目录仍返回 null（fail-open 语义不变）。

#### 场景：ls-tree 输出 >1MB 的仓

- Given：fixture 仓 HEAD 的 `git ls-tree -r -z` 输出字节数 > 1MB（默认 maxBuffer 上限）
- When：调用 computeCodeTreeKey({ cwd })
- Then：返回 64 位 hex 字符串（修复前为 null）

#### 场景：非 git 目录（语义保持）

- Given：无 .git 的临时目录
- When：调用 computeCodeTreeKey({ cwd })
- Then：返回 null（fail-open，不误复用）

### FR-02: verify 中间步 --done 批量资格先行——批量不会触发不预跑亲测（必须）

src/run/complete.js 的 verify 批量对齐块必须先做**纯资格判定**（isVerifyBatchEligible：verify-result.md 在场且结论枚举已填 + verify-facts.json 在场 + 首个 pending 步索引 ≥2，不改步骤状态），仅当资格成立且亲测步（verifyRunQualityScan）未完成时才预跑 executeVerifyQualityScan。资格不成立时中间步 --done 不得触发亲测（实测归亲测步自身与收口门，语义不变）。资格成立时行为不变：先亲测后批量，亲测 throw → 放弃批量单步推进（「批量省的是上下文往返，不省任何门」承诺保持）。

#### 场景：报告未就绪的中间步 --done

- Given：verify 步骤 3/7 pending，verify-result.md 结论枚举未填（或 verify-facts.json 缺席）
- When：run verify --done --step 逐项检查任务
- Then：不调用 executeVerifyQualityScan（无测试执行），单步推进到 4/7

#### 场景：报告就绪的 --done（批量会触发）

- Given：结论枚举已填 + verify-facts.json 在场 + step 3 pending、亲测步 step 6 pending
- When：run verify --done
- Then：先亲测再批量对齐（既有行为不变）；亲测失败 → 放弃批量单步推进（既有行为不变）

### FR-03: 收口门与 gate verify 对同签名失败记录复用阻断（必须）

verify 收口门（src/run/gates.js 实测 else 分支）与 gate verify CLI（src/machine-interface.js verify-test facet）在真跑前必须咨询失败签名复用（新共享 helper consultFailedScanReuse，包装既有 loadLastQualityScanRecord + computeQualityScanDedupKey + shouldReuseLastFailedScan）：上次质量扫描 failed 且 dedupKey（代码树键×配置×known_failures）全等 + 快照口径一致 + 记录未过期（30min TTL，对齐 green-cache 窗口）→ 不重跑，合成 failed 结果（reason 前缀 ♻️ 复用披露 + 原失败事实）照常走阻断/rollback 语义。任一不满足 → 照旧真跑（fail-closed）。SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN（1/force）设值时本复用旁路（与 noAI 失败签名闸逃生阀口径对称）。

#### 场景：同签名失败复用命中

- Given：lastRecord.testResult.status=failed、dedupKey 与当前全等、usedSnapshot 与本轮口径一致、ranAt 在 TTL 内
- When：verify --done 收口门实测 / gate verify CLI verify-test facet
- Then：不执行测试命令，verify-test 结果为 failed（reason 含「♻️ 复用上次失败实测」），收口照常阻断

#### 场景：豁免/代码/配置变化后回退真跑

- Given：known_failures 清单或代码树任一变化（dedupKey 失配），或记录超 TTL，或 RERUN 环境变量设值
- When：同上
- Then：照旧真跑（复用是优化不是正确性依赖）

### FR-04: 回归测试与既有测试面全绿（必须）

本变更必须新增回归测试文件覆盖三面：大仓键非空（FR-01）、批量资格纯判定与接线（FR-02）、失败复用命中/回退/逃生阀（FR-03）；受影响既有面（code-face-key-doc-commit-survival / verify-artifact-triage / flag-contract / verify-quality-scan / green-cache）必须复跑 0 失败。

#### 场景：测试面

- Given：本变更实现完成
- When：跑新增测试文件 + 受影响既有测试面
- Then：0 失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/verify-reuse-large-repo.test.mjs「大仓（ls-tree>1MB）computeCodeTreeKey 非 null——maxBuffer 回归」
FR-02: test/verify-reuse-large-repo.test.mjs「isVerifyBatchEligible 纯资格判定矩阵（不 mutating）」+「detectVerifyBatchFinish 行为等价（理由串保留）」
FR-03: test/verify-reuse-large-repo.test.mjs「consultFailedScanReuse 命中/键失配/TTL 过期/RERUN 旁路矩阵」+「gates.js 复用分支合成 failed 结果（reason 含 ♻️ 披露）」
FR-04: test/verify-reuse-large-repo.test.mjs「回归面：既有五文件复跑 0 失败」
