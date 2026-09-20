# 符号影响面报告

> tasks.md 内容指纹（生成时）: ba4f54acd9854328——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。

- task-01: 无签名级变更（新增模块 src/command-cards.js，导出面 COMMAND_CARD_TARGETS/COMMAND_CARD_NAMES/readCardAssets/injectCommandCards 均为全新符号，零既有调用点）；唯一接触的既有符号是 fs-atomic.js 的 writeAtomicSync（只读消费，签名零改动）。
- task-02: 签名级变更一处——src/init.js 内部新增对 injectCommandCards 的调用（新消费点，无既有签名修改）；VALID_TOOLS 数组增 'zcode' 元素（常量值扩面，消费点 init.js:578 toolChoices 与 :674 校验同文件内自动适配）；AGENTS.md 注入条件 init.js:447 从 `claude||codex` 扩为含 zcode（布尔条件扩面非签名变更）。
