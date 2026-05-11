扫描框架隐形规则 + 实体继承 + 代码风格，生成 `CONVENTIONS.md`。

参考 `.sillyspec/docs/<project>/scan/_env-detect.md`。

用 grep 搜索拦截器/插件/逻辑删除/基类/审计字段，**禁止读源码全文**。

根据检测到的语言/框架自行决定搜索什么模式，提取 3-5 个典型示例。

输出文件必须包含以下章节：
- `## 框架隐形规则`
- `## 实体继承规范`
- `## 代码风格`

路径用反引号，不编造。保存到 `.sillyspec/docs/<project>/scan/CONVENTIONS.md`。

完成后立即写文件，下一个 area 开始前清除源码上下文。
