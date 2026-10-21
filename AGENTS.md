# AGENTS.md

- 提交信息与 PR 标题遵循 Conventional Commits（仅允许 Squash 合并，PR 标题即最终提交信息）
- `main` 受保护：必须经 PR 合并，要求线性历史，禁止强制推送和删除
- 版本发布由 release-please 完成：合并其 release PR 即自动升级版本、更新 CHANGELOG.md、打 tag、创建 GitHub Release 并发布到 npm。不要手动改版本号或执行发布。PR 标题会成为 changelog 条目，请面向用户撰写
- 若 release PR 合并后 `publish` job 失败，后续推送不会再触发它。对于配置或 registry 问题（如 npm trusted publisher），修正设置后用 `gh run rerun <run-id> --failed` 重跑失败的 job，重跑会构建同一个 release commit
