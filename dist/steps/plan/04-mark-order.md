按 Wave 分组，标注依赖关系：

```markdown
### Wave 1（并行，无依赖）
- [ ] 添加用户创建接口
  - 修改: `UserController.java`、`UserService.java`
  - 参考: `RoleController.createRole`

- [ ] 添加角色创建接口
  - ...

### Wave 2（依赖 Wave 1）
- [ ] 添加用户列表查询（依赖用户创建完成）
  - ...
```
