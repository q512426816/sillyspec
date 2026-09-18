---
id: task-05
title: 'runProbe8PayloadParity diff 源切换接线（collectProbe8DiffFiles 替换 parseFileChangeListDetailed 调用点+模式注记）'
title_zh: 'runProbe8PayloadParity diff 源切换接线（collectProbe8DiffFiles 替换 parseFileChangeListDetailed 调用点+模式注记）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-18 07:47:32
priority: P0
depends_on: ['task-01', 'task-04']
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/verify-probes.js
target_files: [src/verify-probes.js]
expects_from:
  task-01:
    - contract: diff-files-collector
      needs: [diffFiles, fileClassification, designOnlyPaths, fallbackMode]
  task-04:
    - contract: compare-and-render
      needs: [comparePayloadFields, renderDirectCompareSection]
provides:
  - contract: probe8-wired
    fields: [runProbe8PayloadParity-diff-source, design-list-advisory]
goal: >
  runProbe8PayloadParity diff 源接线——:401 parseFileChangeListDetailed 调用点替换为
  collectProbe8DiffFiles（三态+模式注记+design 差集 advisory 渲染），既有 design 契约面
  对账零改动。
implementation:
  - runProbe8PayloadParity（:386-553）内 :401 调用点替换——collectProbe8DiffFiles 产出的分类面（frontend/backend/other）接入 task-02/03 提取链与 task-04 对账渲染（消费 diffFiles/fileClassification）
  - fallbackMode 模式注记渲染——diff/in-place/design-list 三态各落注记行；design-list 态显式注记「文件源=design 清单（diff 不可用）」
  - design 差集 advisory 行渲染——designOnlyPaths 逐条列注记行（不参与对账、不阻断，供人工复核）
  - design 清单读取保留给 fallback 态与既有契约面对账（parseFileChangeListDetailed import :32 不删——contractOrphans/missingRequired 契约面对账零改动）
acceptance:
  - probe8 文件源按 collectProbe8DiffFiles 三态切换；输出含模式注记行
  - designOnlyPaths 渲染为 advisory 注记行（不阻断）
  - 既有 design 契约面对账（contractOrphans/missingRequired）输出前后一致零变化
  - probe1-7/9 输出零改动；diff 取数失败 fail-open 不炸
verify:
  - npm run lint
constraints:
  - 只改 runProbe8PayloadParity 调用点+渲染尾接；不动提取/对账函数本体（归 task-01~04）
  - 零新增模块 import 边
  - 既有 probe8 两测试文件的断言适配归 task-06（本卡不修改测试文件——接线后既有断言可能随源切换变化，W6 随行收口）
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
