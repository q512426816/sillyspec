**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 修改任何代码（只做检查和报告）
- ❌ 自行推进到下一阶段

## 加载规范

```bash
# 确定变更目录
if [ -n "$ARGUMENTS" ]; then
  CHANGE_DIR=".sillyspec/changes/$ARGUMENTS"
else
  CHANGE_DIR=$(ls -d .sillyspec/changes/*/ 2>/dev/null | grep -v archive | tail -1)
fi
cat "$CHANGE_DIR"/{design,tasks}.md 2>/dev/null
cat .sillyspec/local.yaml 2>/dev/null
```

锚定确认实际存在的文件。

## 工作区模式处理

如果 `.sillyspec/projects/` 目录下有 yaml 文件：
1. 检查工作区根目录 `.sillyspec/changes/` 下的未归档变更
2. 检查每个子项目 `<子项目路径>/.sillyspec/changes/` 下的未归档变更
3. 列出所有未归档变更，让用户选择要验证哪个
4. 根据 $ARGUMENTS 或用户选择，cd 到对应目录执行验证
