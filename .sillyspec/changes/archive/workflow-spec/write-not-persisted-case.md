# 失败案例：edit 修改未落盘

## 问题

depends_on round（commit 4c3ba39）中，agent 对 archive-impact.yaml 的 edit 修改未真正写入 git。

commit message 声明：
> archive-impact.yaml: doc-syncer depends_on impact-analyzer with from_role

实际 git diff 不含 archive-impact.yaml 的改动。

## 发现方式

后续 archive-impact 验证时（commit bbb5c17），发现 YAML 中缺失 depends_on / from_role 字段。对比 commit message 和实际 diff，确认不一致。

## 根因

agent 执行了 edit，edit 工具返回成功，但文件改动可能被后续操作覆盖，或 edit 未正确匹配/持久化。agent 以 edit 返回值为准，没有通过 `git diff` 二次确认落盘。

## 影响

- depends_on 校验代码存在于 workflow.js，但 YAML 中没有实际 depends_on 声明
- validateWorkflow() 对所有 workflow 的校验通过（因为 archive-impact 没有 depends_on 被校验为合法空值）
- doc-syncer prompt 不包含前置依赖信息
- 功能不会报错，但依赖注入形同虚设

## 修复

commit bbb5c17 补回 depends_on / inputs.from_role / output_description。

## 教训

1. **口头完成不算，git diff 为准**：agent 报告"已修改文件 X"后，必须通过 `git diff` 确认文件确实被修改
2. **commit 前必须 git diff --stat**：对比 agent 声称的改动和实际 diff
3. **commit message 不要过度声明**：不要列出没有实际 diff 的文件

## 防线建议

commit 流程增加一步：
```
git add . → git commit → git show --stat HEAD
```
确认 HEAD 改动文件与预期一致后再 push。
