---
id: task-03
title: 'plan-postcheck validateTargetFiles 检查（严格解析 + 存在性/格式核验 + design/allowed_paths 双交叉）'
title_zh: 'plan-postcheck validateTargetFiles 检查（严格解析 + 存在性/格式核验 + design/allowed_paths 双交叉）'
author: 'qinyi'
created_at: 2026-09-07 00:35:26
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/stages/plan-postcheck.js
goal: >
  plan-postcheck 新增第 7 项检查 validateTargetFiles：核验 task 卡
  target_files 声明（格式/存在性/双交叉），并导出 parseTargetFiles 供对账复用。
provides:
  - contract: parseTargetFiles
    fields:
      - entries
      - missing
implementation:
  - 'parseTargetFiles：parseAllowedPaths 同族列表解析，严格模式（拒 glob/引号/目录前缀/绝对路径），剥 NEW 前缀输出 { entries: [{raw,isNew,path}], missing }'
  - validateTargetFiles：路径不存在且非 NEW = ERROR；格式非法 = ERROR；字段缺失 = 每变更汇总一条 WARNING；design 清单外 / allowed_paths 白名单外 / 已存在文件带 NEW = WARNING
  - 接入 executePlanPostcheck 的 failures[] 聚合（检查独立、只读 changeDir 产物）
acceptance:
  - 幻觉路径与非法格式在 plan --done 被拦（ERROR 进 failures）
  - 存量卡缺失字段只产生一条汇总 WARNING，不阻断
verify:
  - node --test test/plan-postcheck.test.mjs test/plan-postcheck-blocklist.test.mjs
constraints:
  - 不动既有 6 项检查的语义与顺序
  - 解析器纯函数无 IO，供 task-04 跨文件复用
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
