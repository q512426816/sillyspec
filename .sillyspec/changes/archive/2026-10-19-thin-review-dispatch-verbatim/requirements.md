---
author: flow-machine-draft
created_at: 2026-10-19T15:20:22.534Z
---
# 需求规格（Requirements）— 2026-10-19-thin-review-dispatch-verbatim

## 功能需求

### FR-01: 任务书头部与派发横幅含「原样复制给子代理——检查单生产权在 CLI，勿自行改写增删」指令（对齐厚道措辞）

- renderReviewerTaskbook 渲染的任务书**必须**在标题分隔线后含派发纪律行「（派发纪律：本任务书原样复制给干净上下文子代理——检查单/材料包生产权在 CLI，勿自行改写、增删或缩编）」；flow done 打印任务书前的横幅句**必须**由「起一个干净上下文的子代理执行后重跑本命令」改为含「任务书原样复制给子代理（勿自行改写增删）」的表述——**禁止**只改一处（两处都是主会话派发时实际读到的通道，厚道先例 stage-review.js:803 / index.js:2576 即双面措辞）。

#### 场景：主路径

- Given：变更命中独立评审、CLI 渲染任务书
- When：主会话阅读横幅与任务书
- Then：两处均含原样复制指令，措辞与厚道「检查单生产权在 CLI，勿自行改写增删」同型

### FR-02: 材料包在冻结面可得时含归属切分段：声明内（design 清单∩冻结面）/声明外（冻结面−design 清单）/他侧归因（splitOwnVsForeignDiffFiles 单源），声明外标注「并行混入候选，抽查即可勿逐文件考古」

- 材料包**必须**新增「冻结面归属切分」子段，机械核算三分类：声明内（parseFileChangeListDetailed 解析 design 文件变更清单 ∩ 冻结面文件）、声明外（冻结面−声明清单，**必须**标注「共享仓并行混入/生成物候选——抽查即可，勿逐文件 git 考古」）、他侧归因（splitOwnVsForeignDiffFiles 返回的 foreign[] 带 owner 变更名）；子段沿用基准面语义（定位索引非证据）。

#### 场景：平台仓混入形态（实测样本）

- Given：冻结面 20 文件中 6+ 文件不在 design 清单（config.py、translate/*、changelog 等）
- When：装配材料包
- Then：声明外子段列出这些文件并带「抽查即可」标注，评审员无需逐文件 git log 考古

#### 场景：声明面完整

- Given：冻结面文件全部在 design 清单内且无他侧归因
- When：装配材料包
- Then：归属切分段照常渲染（声明内 N、声明外 0、他侧归因 0），零文件不静默隐藏子段

### FR-03: 归属核算 fail-soft（git 失败/缺件零注入该子段，FR 表与文件摘要不受影响）；整体体积帽 12000 不变

- 归属核算（design 清单解析、splitOwnVsForeignDiffFiles 的 git 调用）**必须** fail-soft：任一源失败/缺件时该子段零注入，FR 表与 patch 文件级摘要**禁止**受影响；材料包整体体积帽**必须**维持 PACK_MAX_CHARS=12000（归属切分行计入帽内，超限行级截断语义不变）。

#### 场景：git 不可用

- Given：splitOwnVsForeignDiffFiles 内部 git 调用失败（返回 null/抛错）
- When：装配材料包
- Then：归属切分子段零注入，FR 表与文件摘要照常产出

### FR-04: 新增测试覆盖指令在场/归属切分注入/fail-soft 零注入/他侧归因形态；既有 flow-review 回归全绿

- 新增（或扩展 test/flow-review-pack.test.mjs）**必须**覆盖：派发纪律行在场（任务书头部）；归属切分三分类注入形态（含声明外「抽查即可」标注）；归属源 fail-soft 零注入（FR 表/摘要不受影响）；他侧归因带 owner 形态；既有 flow-review/review-probes/tick-evidence/wave-auto-adopt 回归**禁止**失败。

#### 场景：主路径

- Given：本变更交付面提交完毕
- When：跑新旧测试
- Then：全部用例通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-review-pack.test.mjs「派发纪律——任务书头部行在场（renderReviewerTaskbook 断言）；横幅句经 flow.js 静态源断言」
FR-02: test/flow-review-pack.test.mjs「归属切分——三分类注入形态 + 声明外『抽查即可』标注 + 他侧归因带 owner」
FR-03: test/flow-review-pack.test.mjs「fail-soft——归属源失败零注入子段、FR 表与摘要不受影响；体积帽 12000 不变」
FR-04: test/flow-review-pack.test.mjs（全文件用例 0 失败）+ test/flow-review.test.mjs + test/review-probes.test.mjs + test/tick-evidence-multi-anchor.test.mjs + test/wave-auto-adopt.test.mjs（既有回归 0 失败）
