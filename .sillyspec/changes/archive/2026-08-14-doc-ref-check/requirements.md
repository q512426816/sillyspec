---
author: qinyi
created_at: 2026-08-14 21:34:04
---

# Requirements — 文档行号引用校验脚本（doc-ref-check）

## FR-01 引用提取
`test/doc-ref-check.test.mjs` 从白名单文档（`docs/sillyspec/platform-interface-map.md`）提取所有 `文件.js:行号` / `文件.js:起始-结束` 形态引用，并记录文档内行号（docLine）用于失败定位。

## FR-02 路径解析
带目录前缀的引用按仓库根解析；裸文件名在 `src/` 递归定位，仅唯一命中有效；0 或多命中 → fail 并提示写全路径。

## FR-03 存在性硬校验
每个引用断言：源文件存在；行号 ≥1 且 ≤ 文件总行数；范围引用 end 不超界。任一失败 → 计入 failures。

## FR-04 关键词断言（行号漂移检测）
引用前后 30 字符内最近的反引号 token 若「像代码符号」（首字符字母/_/$，含大写字母/下划线/点/$ 之一），断言源文件 start±1 行内含该 token（子串匹配）。纯小写英文单词跳过。失败 → 计入 failures 并附实际行内容摘要。

## FR-05 接入 npm test
文件为 `.test.mjs`，被 `test/run-tests.mjs` 自动收集执行；存在 failures 时进程退出码 1（使 npm test 红）。

## FR-06 失败可读性
每条失败输出：文档行号、引用原文、失败原因（文件不存在/行号超界/关键词缺失+期望 token+实际内容首 80 字符）。末尾输出统计（总数/通过/关键词断言数/失败数）。

## FR-07 首跑全绿验收
对当前 `platform-interface-map.md`（2026-08-14 多轮核对版）首跑必须全绿；人为篡改一处行号（+10）再跑必须变红且定位准确（验收脚本内自测）。

## 非功能
- NFR-01 纯 Node 内置模块，零新依赖。
- NFR-02 跨平台（Windows/Linux/macOS）：路径拼接用 path.join，行分隔兼容 CRLF/LF。
- NFR-03 只读：不修改任何被校验文件。
