---
author: flow-machine-draft
created_at: 2026-10-05T07:00:00.000Z
---
# 需求规格（Requirements）— 2026-10-05-visual-downgrade-narrow

## 功能需求

### FR-01: 后端/机制讨论语境的「降级」（探针档位讨论、性能降级等）与远处视觉词同行共现必须不再触发降级判定；2026-10-05-uivisual-word-narrow 的真实误伤 design 句作反例

src/ui-visual.js 的 DOWNGRADE_LINE 必须从裸词 `/(降级|样式统一级|partial)/` 收窄为绑定窗口正则：（视觉|样式|界面|UI）与「降级」在 ≤6 字内同短语共现（视觉词在前或在后皆认），「样式统一级」独立短语保留，partial 取词边界；VISUAL_LINE 与行级共现结构不变。讨论探针档位/后端降级策略且视觉词远距同行的文本禁止被判为降级声明。

#### 场景：元层误伤句（2026-10-05-uivisual-word-narrow 实测原文）

- Given: design 风险节含「探针 12 的 error 档（降级无裁决）不依赖词表触发条件的变化。缓解：……「渲染/组件/样式」」（降级距样式远、分属不同讨论对象）
- When: runUiVisualProbe 计算降级声明
- Then: downgradeDeclared === false（不再 error 档阻断）

#### 场景：后端降级语境

- Given: design 含「性能降级时切换只读模式，输出样式保持单行」（降级谈性能、样式谈日志格式）
- When: runUiVisualProbe 计算降级声明
- Then: downgradeDeclared === false

### FR-02: 既有降级正例（视觉收敛降级形态、样式统一级形态）检测能力必须不变；带用户裁决留痕放行路径不变

收窄必须零伤既有检测面：「视觉收敛降级」（视觉+2字+降级的既有正例形态）、「样式统一级达成」、带裁决留痕放行（rulingPresent）路径行为与收窄前一致。

#### 场景：既有正例回归

- Given: design 含「FR-04 partial：变更详情页 MetaPanel 六组视觉收敛降级为保留既有五卡」
- When: runUiVisualProbe（gate=warn）
- Then: downgradeDeclared === true 且无留痕 → error（与收窄前一致）

### FR-03: 单测覆盖：元层误伤反例（真实误伤句）+ 后端降级同行反例 + 既有两正例回归 + 跨行不误配回归

本变更必须以自动化单测覆盖：FR-01 两反例、FR-02 既有正例回归与裁决放行回归、既有「降级声明行级共现口径：跨行不误配」用例回归。

#### 场景：主路径

- Given: test/ui-visual-guidance.test.mjs
- When: 跑项目测试入口
- Then: 上述断言全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/ui-visual-guidance.test.mjs「元层误伤句与后端降级语境反例：downgradeDeclared=false」
FR-02: test/ui-visual-guidance.test.mjs「既有降级正例（视觉收敛降级/样式统一级）与裁决放行回归」
FR-03: test/ui-visual-guidance.test.mjs「反例+正例+跨行回归同文件收口」
