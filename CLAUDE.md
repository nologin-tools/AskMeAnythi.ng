# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AskMeAnything (askmeanythi.ng) - 一次性 AMA 活动平台，即用即走，无需注册。

- **GitHub**：https://github.com/nologin-tools/AskMeAnythi.ng
- **线上地址**：https://askmeanythi.ng
- **License**：MIT

**技术栈**：
- 后端：Cloudflare Workers + Hono.js + D1 + Durable Objects
- 前端：SolidJS + TypeScript + Vite + Tailwind CSS
- 构建：pnpm + Turbo

## 常用命令

```bash
# 开发
pnpm dev                    # 启动所有应用（API 端口 8787，Web 端口 5173）
pnpm --filter api dev       # 仅启动后端
pnpm --filter web dev       # 仅启动前端

# 构建和部署
pnpm build                  # 构建所有应用
pnpm --filter api deploy    # 部署 API 到 Cloudflare

# 数据库
pnpm db:migrate             # 本地数据库迁移
pnpm --filter api db:migrate:remote  # 远程数据库迁移

# 检查
pnpm lint                   # 全量 TypeScript 类型检查
```

## 目录结构

```
AskMeAnythi.ng/
├── apps/
│   ├── api/                          # 后端 API (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── index.ts              # Hono 入口，CORS 配置，scheduled 导出
│   │   │   ├── scheduled.ts          # Cron 定时清理过期会话
│   │   │   ├── types.ts              # 环境类型定义
│   │   │   ├── utils/
│   │   │   │   └── auth.ts           # 共享管理员 Token 验证
│   │   │   ├── routes/               # API 路由
│   │   │   │   ├── sessions.ts       # 会话 CRUD
│   │   │   │   ├── questions.ts      # 问题 CRUD
│   │   │   │   ├── answers.ts        # 回答 CRUD
│   │   │   │   ├── votes.ts          # 投票
│   │   │   │   └── reactions.ts      # Emoji 反应
│   │   │   ├── durable-objects/
│   │   │   │   └── session-room.ts   # WebSocket Durable Object
│   │   │   └── db/
│   │   │       └── schema.sql        # D1 数据库 Schema
│   │   └── wrangler.toml             # Workers 配置
│   │
│   └── web/                          # 前端应用 (SolidJS)
│       ├── src/
│       │   ├── index.tsx             # 应用入口，SolidJS Router 挂载
│       │   ├── index.css             # 全局样式，Tailwind 导入
│       │   ├── App.tsx               # 路由定义
│       │   ├── pages/                # 页面组件（6 个）
│       │   │   ├── Home.tsx          # 首页，创建会话
│       │   │   ├── SessionPublic.tsx  # 公开页面，提问投票
│       │   │   ├── SessionAdmin.tsx   # 管理员仪表盘
│       │   │   ├── SessionProjector.tsx # 投影模式
│       │   │   ├── SessionEnded.tsx   # 会话已结束页面
│       │   │   └── NotFound.tsx       # 404 页面
│       │   ├── components/           # UI 组件（11 个）
│       │   │   ├── Logo.tsx          # 品牌 Logo
│       │   │   ├── QuestionCard.tsx   # 问题卡片
│       │   │   ├── QuestionInput.tsx  # 问题输入框
│       │   │   ├── AnswerEditor.tsx   # 回答编辑器
│       │   │   ├── FilterBar.tsx      # 过滤和排序工具栏
│       │   │   ├── Avatar.tsx         # 头像组件
│       │   │   ├── Modal.tsx          # 模态对话框
│       │   │   ├── Toast.tsx          # 吐司提示
│       │   │   ├── Loading.tsx        # 加载动画
│       │   │   ├── ConnectionStatus.tsx # WebSocket 连接状态
│       │   │   └── CopyButton.tsx     # 复制按钮
│       │   └── lib/                  # 工具库
│       │       ├── api.ts            # API 请求封装
│       │       ├── websocket.ts      # WebSocket 连接管理
│       │       ├── storage.ts        # 本地存储管理
│       │       ├── markdown.ts       # Markdown 解析渲染
│       │       ├── time.ts           # 时间格式化
│       │       └── sort.ts           # 问题排序逻辑
│       └── vite.config.ts            # Vite 配置（含 API 代理）
│
├── packages/
│   └── shared/                       # 共享包
│       └── src/
│           ├── types.ts              # 所有类型定义
│           ├── constants.ts          # 常量定义
│           └── utils/
│               ├── id.ts             # ID 生成（SessionId、AdminToken、VisitorId）
│               └── avatar.ts         # Hash Avatar 生成（SVG）
│
├── turbo.json                        # Turbo 构建管道配置
├── package.json                      # 根 workspace 配置
└── CLAUDE.md                         # 本文件
```

## 核心概念

### 认证机制
- **访客 ID**：UUID v4，通过 `X-Visitor-Id` 请求头传递，用于投票/反应/提问，存储在 localStorage (`ama_visitor_id`)。创建问题时强制使用请求头中的 Visitor ID 作为 author_id（防止身份伪造）
- **管理员 Token**：32 位 URL-safe Base64，通过 `X-Admin-Token` 请求头传递，用于管理操作，存储在 localStorage (`ama_admin_tokens`)。使用常量时间比较（`timingSafeEqual`）防止时序攻击。URL hash 中的 token 在存储前会验证格式
- **会话 ID**：5 位 Base58 编码（排除 0/O/I/1/l），使用 rejection sampling 避免模偏差，创建时有碰撞重试机制（最多 3 次）

### 数据模型

| 模型 | 说明 | 状态/生命周期 |
|------|------|--------------|
| **Session** | AMA 活动房间 | TTL 1-7 天，到期自动失效 |
| **Question** | 访客提交的问题 | `pending` → `approved` → `answered` / `rejected` |
| **Answer** | 管理员对问题的回答 | 每个问题最多一个回答，支持 Markdown |
| **Vote** | 问题的点赞 | 每个访客对每个问题最多一票，可切换 |
| **Reaction** | Emoji 反应 | 目标类型：`question` / `answer`，可切换 |

### 实时通信
- **WebSocket 端点**：`/ws/:sessionId`
- **实现**：Cloudflare Durable Object (`SessionRoom`)，使用 hibernation 模式
- **重连策略**：间隔 3 秒，最多 10 次

**事件列表**：

| 事件 | 数据类型 | 触发时机 |
|------|---------|---------|
| `question_added` | `QuestionAddedData` | 新问题被添加 |
| `question_updated` | `QuestionUpdatedData` | 问题状态/置顶变更 |
| `vote_changed` | `VoteChangedData` | 投票数变化 |
| `answer_added` | `AnswerAddedData` | 新回答被添加 |
| `answer_updated` | `AnswerUpdatedData` | 回答内容更新 |
| `reaction_changed` | `ReactionChangedData` | Emoji 反应变化 |
| `session_updated` | `SessionUpdatedData` | 会话设置更新 |
| `session_ended` | — | 会话结束/删除 |

### 前端路由

| 路由 | 组件 | 功能 |
|------|------|------|
| `/` | `Home` | 首页，创建新会话 |
| `/s/:id` | `SessionPublic` | 公开页面，提问投票 |
| `/s/:id/admin` | `SessionAdmin` | 管理员仪表盘 |
| `/s/:id/projector` | `SessionProjector` | 投影模式（支持快捷键） |
| `/s/:id/ended` | `SessionEnded` | 会话已结束页面 |
| `*` | `NotFound` | 404 页面 |

### API 端点

**会话 (Sessions)**：
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `POST` | `/api/sessions` | — | 创建新会话 |
| `GET` | `/api/sessions/:id` | — | 获取会话信息（公开） |
| `GET` | `/api/sessions/:id/admin` | Admin | 获取会话信息（管理员） |
| `PATCH` | `/api/sessions/:id` | Admin | 更新会话设置 |
| `DELETE` | `/api/sessions/:id` | Admin | 删除会话 |

**问题 (Questions)**：
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/api/questions/session/:sessionId` | — | 获取问题列表（过滤、排序、分页） |
| `POST` | `/api/questions/session/:sessionId` | Visitor | 创建问题 |
| `PATCH` | `/api/questions/:id` | Admin | 更新问题状态/置顶 |
| `DELETE` | `/api/questions/:id` | Admin | 删除问题 |

**回答 (Answers)**：
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `PUT` | `/api/answers/question/:questionId` | Admin | 创建或更新回答 |
| `POST` | `/api/answers/question/:questionId/mark-answered` | Admin | 标记为已回答（无文字） |
| `DELETE` | `/api/answers/question/:questionId` | Admin | 删除回答 |

**投票 (Votes)**：
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `POST` | `/api/votes/question/:questionId` | Visitor | 投票/取消投票 |
| `GET` | `/api/votes/session/:sessionId` | Visitor | 获取当前访客的投票状态 |

**反应 (Reactions)**：
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `POST` | `/api/reactions` | Visitor | 添加/移除反应 |
| `GET` | `/api/reactions/:targetType/:targetId` | Visitor | 获取目标的所有反应 |

**API 响应格式**：`{ success: boolean, data?: T, error?: string }`

## 开发规范

### 开发流程（每个任务必须遵循）

1. **代码实现** - 完成功能开发或 Bug 修复
2. **测试验证** - 确保功能正常工作
3. **文档更新（必须）** - 同步更新相关文档：
   - 修改了目录结构 → 更新目录结构章节
   - 修改了路由 → 更新前端路由章节
   - 修改了 API → 更新 API 端点章节
   - 修改了命令 → 更新常用命令章节
4. **代码提交** - 使用规范的 commit message

**重要**：代码和文档必须在同一个 commit 中更新，CLAUDE.md 是项目的单一事实来源。

### 提交信息规范
- `feat:` - 新功能
- `fix:` - Bug 修复
- `docs:` - 文档更新
- `refactor:` - 代码重构

### 代码规范
- API 响应格式：`{ success: boolean, data?: T, error?: string }`
- 使用 SolidJS 响应式原语：`createSignal`、`createResource`、`createEffect`
- 样式：极简主义黑白设计，Tailwind CSS
- 所有 API 输入必须验证长度限制（常量定义在 `packages/shared/src/constants.ts`）
- 分页参数 `limit` 必须 clamp 到 `[1, MAX_PAGE_SIZE]`

### 验证常量（`@askmeanything/shared`）

| 常量 | 值 | 说明 |
|------|------|------|
| `MAX_QUESTION_LENGTH` | 2000 | 问题内容最大长度 |
| `MAX_ANSWER_LENGTH` | 10000 | 回答内容最大长度 |
| `MAX_TITLE_LENGTH` | 200 | 会话标题最大长度 |
| `MAX_DESCRIPTION_LENGTH` | 1000 | 会话描述最大长度 |
| `MAX_AUTHOR_NAME_LENGTH` | 50 | 作者名最大长度 |
| `MAX_EMOJI_LENGTH` | 10 | Emoji 最大长度 |
| `DEFAULT_PAGE_SIZE` | 50 | 默认分页大小 |
| `MAX_PAGE_SIZE` | 100 | 最大分页大小 |
| `MIN_TTL_DAYS` | 1 | 最小 TTL 天数 |
| `VALID_QUESTION_STATUSES` | `['pending', 'approved', 'answered', 'rejected']` | 合法的问题状态枚举 |
| `ADMIN_TOKEN_PATTERN` | `/^[A-Za-z0-9_-]{20,64}$/` | 管理员 Token 格式正则 |

### 安全设计
- **SQL 注入防护**：所有数据库查询使用参数化绑定（`bind()`）
- **事务安全**：投票、反应、回答等多步操作使用 `DB.batch()` 保证原子性
- **身份验证**：问题创建强制使用 `X-Visitor-Id` 请求头作为 author_id，不信任请求体
- **Token 安全**：Admin Token 使用 `crypto.subtle.timingSafeEqual` 进行常量时间比较
- **输入验证**：所有 API 输入验证长度限制，问题状态更新验证枚举白名单
- **Markdown 安全**：使用 DOMPurify 过滤 XSS，`renderSimpleMarkdown` 额外过滤 `javascript:` 等危险协议
- **错误处理**：生产环境不泄露内部错误信息，JSON 解析失败返回 400
- **WebSocket 安全**：连接前验证 session 存在且未过期
- **定时清理**：使用 `DB.batch()` 原子清理，分批处理防止参数溢出（每批 50 个）

## 环境要求

- Node.js >= 20.0.0
- pnpm 9.15.0
- Cloudflare 账号（部署需要）
