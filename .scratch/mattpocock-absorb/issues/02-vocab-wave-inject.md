# 02: 词汇通道 Wave 级旁路（子代理共享域语言）

**What to build:** 同一词汇基准（knowledge/glossary.md 在场时）在 Wave 级子代理 prompt（buildWavePrompt → buildWaveKnowledgeSection）里同样在场——子代理与主代理共享同一套域语言。复用票 01 的读取函数（readVocabSection）与段渲染，禁止第二套实现。词汇文件缺失时 Wave 面同样静默零注入（输出与基线逐字一致）。

**Blocked by:** 01（词汇约定与阶段级旁路——提供 readVocabSection 与段渲染）。

**Status:** done

- [x] Wave 注入输出含同款词汇段（与阶段级形态一致——readVocabSection 同源渲染断言 + VOCAB_SECTION_HEADER 约定锚原文断言；拼装序同阶段级：命中知识段 → 空行 → 词汇段；零命中 Wave 也恒注入）
- [x] 词汇文件缺失时 Wave 面静默零回归（无 glossary 输出与基线逐字一致——A/B 全文缝口对比：插入恰为词汇段字节、删除后回基线逐字、零告警）
- [x] 复用票 01 读取函数与段渲染，无第二套实现（execute.js import readVocabSection，词汇旁路不进匹配层、不占 top-3、不进遥测）
- [x] 在场/缺失两态 Wave 专项测试跑绿（knowledge-vocab-channel.test.mjs 第 7/8 节）；既有 Wave/execute 知识注入相关测试零修改即绿（knowledge-inject 等 17 个测试文件）
