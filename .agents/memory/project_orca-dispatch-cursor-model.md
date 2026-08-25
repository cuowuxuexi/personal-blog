---
name: orca-dispatch-cursor-model
description: Orca S2 新建 Cursor 执行窗口的默认模型与绑定验证约束
updated: 2026-08-25
type: project
---

# Orca 派发默认：Cursor 执行窗口模型

## 事实

- Phase 2 Run `run_5b8be14ff75e` 的 approved/historical 执行 profile 仍是 `cursor-grok-4.5-high`（Fast 关闭）；不要回写那份 approved-v1。
- 用户最新指定：Orca S2 派发**此后新建**的 Cursor 执行窗口必须用 **Cursor Grok 4.5 High Fast**（`cursor-grok-4.5-high-fast`）。已在跑/已 retain 的窗不要改绑。
- 新开 fresh 终端优先（Orca receipt 的 `launch.effective` 为准）：

```bash
orca orchestration worker-start --task <task_id> --worktree current --agent cursor --model cursor-grok-4.5-high-fast --json
```

- 若该 model id 被拒，再试 `--model grok-4.5 --effort high`（本机 cli-config 里 `fast=true`）；仍不能精确绑 Fast 则决策门，禁止静默关掉 Fast。

- 复用已有 `--terminal` 时不能再传 `--model` / `--effort`（Orca 契约）；需要换绑模型时另开 fresh 窗口。
- 不要在未实际传入 `--model` 时声称已绑定该模型；receipt 的 `launch.effective` 为准。

## 非目标

- 不强制改写派发主窗口自身模型。
- 不默认改成 Grok 4.6 / Sol / 其他模型，除非用户当场另定。

最后更新：2026-08-25
