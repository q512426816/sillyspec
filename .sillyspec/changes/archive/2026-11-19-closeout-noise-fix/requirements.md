---
author: flow-machine-draft
created_at: 2026-11-19T15:55:46.116Z
---
# 需求规格（Requirements）— 2026-11-19-closeout-noise-fix

## 功能需求

### FR-01: 删除面不误报跨仓——冻结面对账的疑似跨仓点名必须跳过本变更删除面（baseline..HEAD 已提交删除 ∪ 工作树未提交删除）：design 声明的删除交付主仓不在盘是删除语义而非跨仓嫌疑，跳过时必须输出 ℹ️ 留痕行（几条、哪些路径）；非删除面的缺路径声明（foo.js 等真跨仓形态）必须照常点名不误放

- 约束强度：必须（负面②——删除类变更收口时「主仓不存在/疑似跨仓声明」点名噪音）

#### 场景：删除交付收口

Given design 清单声明 src/gone.js（已随本变更提交删除）／When flow done 冻结对账／Then 无「疑似跨仓声明」点名、输出「N 条声明为删除交付（主仓不在盘=删除语义），不按跨仓嫌疑点名」留痕行、收口正常完成。

#### 场景：真跨仓形态（负例不误放）

Given design 清单声明 src/never-in-repo.js（盘上不存在且不在删除面）／When 冻结对账／Then 照常输出「疑似跨仓声明」点名（warn 不阻断）。

### FR-02: dirty 缺口签收持久化——--accept-dirty-gap 签收必须持久化到 flow-state（含签收文件清单）：断点续跑时已签收面免拦（不再要求重新处置），缺口面新增（不在签收清单内）必须仍拦并显式提示增量数与已签收免拦数；预检（收口预检）与权威门（patch 子步）两路口径必须同判定

- 约束强度：必须（负面③——签收不持久化致断点续跑需重签且数字随时点漂移，「2 跳 31」误判形态）

#### 场景：签收留痕

Given 工作树有 residue/x.js 未提交缺口／When flow done --accept-dirty-gap／Then 收口完成且归档件 flow-state 含 accept_dirty_gap 段（files 清单列 residue/x.js）。

#### 场景：断点续跑已签收面免拦

Given flow-state 已有签收清单 [residue/signed.js]、工作树缺口恰为该文件／When 重跑 flow done（无 flag）／Then 预检与权威门均免拦、输出「全部在此前 --accept-dirty-gap 签收清单内（增量 0）——按签收免拦」、收口完成。

#### 场景：缺口面新增仍拦

Given 签收清单 [residue/signed.js] 在场、工作树又新增 residue/new-gap.js／When 重跑 flow done（无 flag）／Then 拦截且提示「1 个未提交交付文件未入冻结面（增量——另有 1 个已按签收免拦）」。

### FR-03: 缺口数字时点快照解释——同轮收口内预检时点缺口数小于权威门时点缺口数时，必须输出解释行（预检 N → 权威门 M、实测窗口内 dirty 面新增、非口径漂移）

- 约束强度：SHOULD（负面③——预检在实测门前、权威门在实测门后，两道门数字是时点快照，中间隔完整实测+处置窗口，数字增大无解释时易误判为口径漂移）

#### 场景：实测窗口主仓新增脏面

Given 预检时主仓 0 缺口放行、实测执行期间主仓新增 residue/during-test.js（并行会话/工具写盘形态）／When 权威门发现 1 个缺口／Then 输出「缺口数字是时点快照：收口预检（实测前）0 个 → 权威门（实测后）1 个——实测窗口内 dirty 面新增……非口径漂移」解释行。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/closeout-noise-fix.test.mjs「collectDeletedFace：已提交/未stage/已stage 删除并集，非删除不进，坏 baseline 只采工作树源」+「e2e：design 声明删除交付（已提交删除）→ 无「疑似跨仓」点名、ℹ️ 删除交付行在场、收口完成」+「e2e 负例：声明路径盘上不存在且非删除面 → 「疑似跨仓」点名照常（不误放）」
FR-02: test/closeout-noise-fix.test.mjs「e2e：--accept-dirty-gap 签收清单持久化 flow-state（归档件可查）」+「e2e：预置签收清单 → 已签收面免拦收口完成；新增缺口（不在清单）仍拦并报增量」
FR-03: test/closeout-noise-fix.test.mjs「e2e：实测命令落脏文件 → 预检 0/权威门 N → 「时点快照」解释行在场（数字非口径漂移）」
