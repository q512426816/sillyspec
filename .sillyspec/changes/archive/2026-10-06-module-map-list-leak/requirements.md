---
author: flow-machine-draft
created_at: 2026-10-06T06:35:49.994Z
---
# 需求规格（Requirements）— 2026-10-06-module-map-list-leak

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: 三个解析器（parseModulePathsSubset / parseModuleMapPaths / parseModuleMapSimple）修复列表收集终止条件：任何缩进 4 的字段头行（形如 '字段名:' 或 '字段名: 值'——开放世界判据，不枚举字段名清单）终结上一个 list 字段的收集；块式 paths 后跟 tags/aliases/depends_on 的 yaml 解析后 paths/core_files 恰只含各自声明的列表项；未来新增字段名（当前未识别的自定义字段）同样不泄漏；既有内联 'paths: [..]' 行为不变

- 必须：三个解析器对块式列表字段的收集以「字段头行」为终止边界——任何形如 `    <字段名>:` 或 `    <字段名>: <值>` 的行（无论字段名是否被识别）都必须终结上一个 list 字段的收集，之后到下一个已知 list 字段头之间的 `- ` 项不得并入任何 list 字段。
- 禁止：以字段名枚举白名单实现终止判定（开放世界字段集不可枚举——parseModuleMapSimple 现状即此形态，枚举外字段仍泄漏）；禁止改变字段语义识别（各解析器仍只取自己关心的字段，未知字段内容丢弃）。
- 必须保持：内联数组写法（`paths: [a, b]`）与既有已知字段（doc/status 等）行为不变——本修复只收紧收集边界，不新增字段语义。
- 必须：parseModuleMapPaths 补齐内联 `paths: [..]` 识别（ground truth 审计实证：sillyhub-daemon 整图内联写法，该解析器此前恒漏 343 条 paths＝模块归属全盲）——对齐另两个解析器的既有内联支持。

#### 场景：块式多字段（实测形态）

- Given yaml 模块段：`paths:` 块（1 项）后依次跟 `tags:`/`aliases:`/`depends_on:` 各含列表项
- When 任一解析器解析该内容
- Then paths 只含其声明项，tags/aliases/depends_on 的项不出现在 paths/core_files

#### 场景：未识别自定义字段（开放世界）

- Given yaml 模块段：`core_files:` 块后跟当前代码未识别的自定义字段（如 `owner_tags:`）含列表项
- When 解析
- Then core_files 只含其声明项；owner_tags 的项不出现在任何 list 字段

### FR-02: flow start fresh 起点域路由的 input token 增加在场过滤：token 相对 cwd 在文件系统存在（existsSync）才参与域路由——文件系统当裁判不建前缀白名单；绿地模块图草案的路径提取（bsPaths）保持不过滤（绿地语料允许指向尚不存在的目标）；实测误路由用例回归：git/DB/JSON 不再路由到 server-parser

- 必须：flow start fresh 起点传给域路由（flowKnowledgeDigest 的 filesOverride）的 input 路径样 token 先经「在场或图内」过滤——token 相对 cwd 用 existsSync 判定在场，或被模块图声明的路径覆盖（matchedModuleIds 单一匹配规则：图内尚不存在的目标文件照常路由，保住 thin-fr-inject-parity ④ 契约「--input 提到将新建的 src/cli/login.js 须命中 cli 域」）；两判据都不成立即不参与路由（落空则走既有「起点无依据」诚实提示，不静默造伪域）。
- 禁止：以前缀白名单/扩展名清单/特定目录名枚举做过滤判据（文件系统在场性与仓内模块图即开放世界裁判）。
- 必须保持：绿地模块图草案路径提取（bsPaths）不过滤——绿地场景 --input 路径语料允许指向尚不存在的目标，草案恰需它们起草。

#### 场景：散文斜杠词不路由（实测回归）

- Given 仓内模块图模块 paths 只含多段真实路径（解析器已修复无泄漏项）；--input 语料含 `git/DB/JSON` 这类散文斜杠词、在场真实路径、以及图内声明的尚不存在目标路径
- When flow start fresh 域路由
- Then 散文 token 因不在场且不在图内被过滤；在场与图内 token 正常路由；不出现由散文 token 铸出的伪域

#### 场景：图内目标文件（尚不存在）照常路由

- Given 模块图声明模块 cli 覆盖 `src/cli/` 前缀；--input 提到 `src/cli/login2.js`（文件尚未创建）
- When flow start fresh 域路由
- Then 该 token 命中 cli 域（thin-fr-inject-parity ④ 契约保持）

#### 场景：绿地草案不受影响

- Given 模块图缺席的绿地仓，--input 含尚不存在的路径语料（如 src/server.py）
- When flow start 起草绿地模块图草案
- Then 草案路径提取仍含该 token（不在场过滤只作用于域路由，不作用于绿地草案）

### FR-03: 测试覆盖：三解析器的块式多字段不泄漏回归、未识别自定义字段名不泄漏（开放世界性）、routing 在场过滤保留真实路径 token 且过滤散文斜杠词、绿地草案路径提取不受影响

- 必须：新增测试文件覆盖 FR-01（三解析器 × 块式多字段 / 自定义字段两场景）、FR-02（在场过滤保留真实 token、过滤散文 token；绿地提取不过滤；resolveTouchedDomains 端到端不误路由）；全绿后方可收口。

#### 场景：主路径

- Given 测试运行环境
- When 执行新增测试
- Then 全部断言通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/module-map-list-leak.test.mjs「块式多字段不泄漏（三解析器）」
FR-02: test/module-map-list-leak.test.mjs「域路由在场过滤与绿地草案不受影响」
FR-03: test/module-map-list-leak.test.mjs「全量用例（含 resolveTouchedDomains 端到端误路由回归）」
