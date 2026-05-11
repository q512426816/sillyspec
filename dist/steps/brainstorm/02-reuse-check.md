检查已有变更和可复用模板，避免冲突和重复劳动。

- **同名变更：** `ls .sillyspec/changes/ | grep -v archive` — 有相关变更则提示避免冲突
- **全局模板：** `ls ~/.sillyspec/templates/ 2>/dev/null` — 有匹配模板则建议复用

无匹配则跳过，不输出。
