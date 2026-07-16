# Claude Code 详细操作指南

---

## 目录

1. [什么是 Claude Code](#1-什么是-claude-code)
2. [安装与启动](#2-安装与启动)
3. [基础交互](#3-基础交互)
4. [代码读写](#4-代码读写)
5. [搜索与导航](#5-搜索与导航)
6. [命令执行](#6-命令执行)
7. [Git 版本控制](#7-git-版本控制)
8. [斜杠命令大全](#8-斜杠命令大全)
9. [多 Agent 协作](#9-多-agent-协作)
10. [配置与自定义](#10-配置与自定义)
11. [实用技巧](#11-实用技巧)

---

## 1. 什么是 Claude Code

Claude Code 是 Anthropic 推出的**命令行 AI 编程助手**，直接在你的终端或 IDE 中运行。它不只是聊天机器人，而是可以：

- 直接**读取、创建、编辑**你项目中的文件
- 执行 shell **命令和脚本**
- 管理 **Git 仓库**（提交、分支、查看 diff）
- 搜索代码库和网络资源
- 派生子 Agent **并行处理**复杂任务

你可以把它当作一个**随时待命的资深工程师搭档**。

---

## 2. 安装与启动

### 安装
```bash
npm install -g @anthropic-ai/claude-code
```

### 启动方式

| 方式 | 命令 | 说明 |
|------|------|------|
| 终端启动 | `claude` | 在项目目录下直接运行 |
| VS Code 扩展 | 安装 Claude Code 扩展 | 在 IDE 内直接使用 |
| JetBrains 扩展 | 安装 Claude Code 插件 | 在 IDE 内直接使用 |

启动后你会看到一个交互式对话界面，直接输入问题或任务即可。

---

## 3. 基础交互

### 三种交互模式

| 模式 | 怎么进入 | 适合场景 |
|------|----------|----------|
| **对话模式**（默认） | 直接输入文字 | 提问、讨论、逐步完成任务 |
| **计划模式** | 我说 `EnterPlanMode` / 你让我先计划 | 复杂改动前先设计方案，你审批后再动手 |
| **权限模式** | 根据设置自动触发 | 执行敏感操作时需要你确认 |

### 对话示例

```
✅ "帮我创建一个 React 组件，显示用户列表"
✅ "这段代码有什么问题？"（然后粘贴代码）
✅ "搜索所有调用 getUsers 的地方"
✅ "运行测试，如果失败帮我修"
✅ "把这个函数重构得更容易理解"
```

**小贴士**：描述越具体，结果越准确。比如：
- ❌ "修复 bug"
- ✅ "点击登录按钮后页面报 500 错误，帮我定位并修复"

---

## 4. 代码读写

### 读取文件
直接告诉我要看什么文件：
```
"读取 src/utils/helper.ts 的内容"
"查看 app.js 第 50 到 100 行"
```

我会用带行号的格式展示，比如：
```
50  export function formatDate(date: Date): string {
51    return date.toISOString();
52  }
```

### 创建文件
```
"创建一个 Vite + React 项目"
"在 src/components/ 下新建一个 Button.tsx 组件"
"写一个 .gitignore 文件"
```

### 编辑文件
```
"把 formatDate 函数的返回值改成 YYYY-MM-DD 格式"
"在 UserProfile 组件中增加一个退出登录按钮"
"删除 deprecated 文件夹下的所有文件"
```

我会做**精确替换**，只改你指定的部分，不影响其他代码。

### Notebook 支持
```
"在 notebook 的第 3 个 cell 之后插入一个新 cell"
"把第 5 个 cell 改成 markdown 类型"
```

---

## 5. 搜索与导航

### 按文件名搜索（Glob）
```
"列出所有 .tsx 文件"
"找 src/ 下所有 test 开头的文件"
"显示所有配置文件（*.config.js）"
```

### 按内容搜索（Grep）
```
"搜索所有调用 useAuth 的地方"
"找包含 TODO 注释的行"
"搜索 import.*from.*lodash（支持正则）"
"在整个项目中搜索 'API_KEY' 不区分大小写"
```

### 组合搜索
```
"在所有 .ts 文件中搜索 interface.*Props"
"找 src/api/ 下包含 'fetch' 的所有文件"
```

---

## 6. 命令执行

### 运行命令
```
"运行 npm install"
"执行 pytest 测试"
"查看 git log --oneline"
"启动开发服务器 npm run dev"
```

### 后台运行
长时间任务可以放在后台：
```
"在后台运行 npm run build"
"后台启动数据库迁移"
```

任务完成后会自动通知你。

### 定时任务（Cron）
```
"每 5 分钟检查一次部署状态"
"每天早上 9 点提醒我更新依赖"
"每小时运行一次健康检查"
```

---

## 7. Git 版本控制

### 常用 Git 操作
```
"查看当前 git 状态"
"提交所有改动的文件，消息是 '修复登录bug'"
"创建一个新分支 feature/user-auth"
"切换到 main 分支"
"查看这次改动的 diff"
```

### GitHub 集成
```
"创建 PR 到 main 分支"
"查看 PR #42 的评论"
"合并 PR #15"
```

### 工作树（Worktree）
在隔离环境中并行处理多个任务：
```
"在 worktree 中修复这个 bug"
"退出 worktree 并保留改动"
"退出 worktree 并删除"
```

---

## 8. 斜杠命令大全

在对话中输入 `/` 开头的命令来触发特殊功能：

| 命令 | 功能 | 示例 |
|------|------|------|
| `/code-review` | 代码审查，找 bug 和改进点 | `/code-review` 审查当前改动 |
| `/security-review` | 安全审查 | `/security-review` |
| `/simplify` | 简化代码，去冗余 | `/simplify` |
| `/review` | 审查 PR | `/review #42` |
| `/deep-research` | 深度网络调研 | `/deep-research 微服务 vs 单体架构的优劣` |
| `/loop` | 定时重复执行 | `/loop 5m /code-review` |
| `/init` | 初始化项目文档 | `/init` |
| `/run` | 启动并验证应用 | `/run` |
| `/verify` | 验证改动效果 | `/verify` |
| `/clear` | 清空对话历史 | `/clear` |
| `/config` | 修改配置 | `/config theme dark` |
| `/help` | 查看帮助 | `/help` |

---

## 9. 多 Agent 协作

### 单 Agent 委派
把任务分派给专门的子 Agent 去执行：
```
"派一个 Agent 去搜索所有 API 端点"
"用探索 Agent 分析项目结构"
"让架构 Agent 先设计方案"
```

### Workflow 工作流（Ultracode）
对于复杂任务，可以编排多阶段工作流：

**当你需要时可以告诉我「用 workflow」，我会：**

1. **理解阶段** — 多个 Agent 并行阅读不同模块
2. **设计阶段** — 多个视角独立设计方案
3. **实现阶段** — 多文件并行编写
4. **审查阶段** — 多维度独立审查
5. **验证阶段** — 对抗性验证，确保正确性

### Agent 类型

| Agent 类型 | 擅长 |
|-----------|------|
| **general-purpose** | 通用任务，搜索代码，多步骤执行 |
| **Explore** | 只读搜索，快速扫描大量文件 |
| **Plan** | 软件架构设计，方案规划 |
| **claude-code-guide** | 回答关于 Claude Code 本身的问题 |
| **statusline-setup** | 配置状态栏 |

---

## 10. 配置与自定义

### 配置文件位置
- **全局配置**：`~/.claude/settings.json`
- **项目配置**：`项目/.claude/settings.json`
- **本地配置**：`项目/.claude/settings.local.json`

### 常用配置项

```json
{
  "model": "claude-sonnet-4-6",     // 默认模型
  "theme": "dark",                   // 主题
  "permissions": {
    "allow": [
      "Bash(npm test)",              // 允许的命令
      "Bash(git:*)",                 // 通配符匹配
      "Read(*)",
      "Edit(*)"
    ],
    "deny": [],
    "ask": []
  },
  "hooks": {
    "PostToolUse": [                 // 工具调用后触发
      { "matcher": "Edit", "command": "prettier --write $FILE" }
    ]
  }
}
```

### 权限管理
- **允许（allow）**：自动执行，不询问
- **询问（ask）**：执行前需要你确认（默认）
- **拒绝（deny）**：禁止执行

### 减少权限弹窗
```
/fewer-permission-prompts
```
这个命令会分析你的使用习惯，自动生成合适的权限配置。

### 键盘快捷键
```
/ keybindings-help
```
可以自定义快捷键绑定。

---

## 11. 实用技巧

### 🎯 描述任务时
```
✅ 好的描述：
"在 src/api/users.ts 中新增一个 deleteUser 函数，
接收 userId 参数，调用 DELETE /users/:id 接口，
返回布尔值表示是否成功"

❌ 不好的描述：
"加个删除用户功能"
```

### 🔄 利用上下文
Claude Code 会记住本次对话中的上下文，所以你可以连续对话：
```
你："创建一个登录页面"
你："在上面加一个记住密码的复选框"
你："现在把整个页面改成深色主题"
```

### 📎 引用文件
我可以生成可点击的文件链接：
- 文件：`[config.ts](src/config.ts)`
- 特定行：`[config.ts:42](src/config.ts#L42)`
- 代码范围：`[config.ts:42-51](src/config.ts#L42-L51)`

### 🧪 测试与验证
```
"运行 npm test，如果有失败的帮我修复"
"检查这段代码是否有安全问题"
"帮我写 unit test 覆盖这个函数的所有边界情况"
```

### 📚 学习和研究
```
"这个项目中是怎么做错误处理的？"
"对比一下 React 和 Vue 的路由方案"
"给我解释这个正则表达式是干什么的"
```

### ⚡ 并行处理
你可以同时让我做多件事：
```
"同时在 src/ 下搜索 TODO，在 docs/ 下搜索 FIXME，
然后运行 npm run lint 检查代码风格"
```

---

## 常见问题

**Q: Claude Code 能看到我的代码吗？**
A: 是的，它需要读取代码才能帮你。代码会发送到 Anthropic API 处理。**不会**用于训练模型。

**Q: 会不会乱改我的代码？**
A: 对于高风险操作（删除文件、强制推送、修改配置等），会先征求你的同意。你也可以设置权限策略来控制。

**Q: 支持哪些编程语言？**
A: 几乎所有主流语言：JavaScript/TypeScript、Python、Go、Rust、Java、C/C++、Ruby、PHP、Swift 等等。

**Q: 怎么收费？**
A: 使用 Anthropic API 的按量计费，具体取决于你选择的模型和 token 用量。可以通过 `/config model` 切换不同价格的模型。

**Q: 离线能用吗？**
A: 不能，需要联网调用 Anthropic API。

---

> 💡 **一句话总结**：把 Claude Code 想象成一个能**直接操作你的电脑**的资深程序员——告诉他你要什么，他会直接帮你做，而不只是给你建议。
