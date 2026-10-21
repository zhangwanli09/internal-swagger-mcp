# AGENTS.md

- 提交信息与 PR 标题遵循 Conventional Commits；只允许 Squash 合并，PR 标题即最终提交信息和 changelog 条目，面向用户撰写
- `main` 受保护：必须经 PR 合并，禁止强制推送
- 发布由 release-please 负责（合并 release PR 即升版本、打 tag、发 npm），不要手动改版本号或发布
- `publish` job 失败不会自动重试：修正配置后执行 `gh run rerun <run-id> --failed`
