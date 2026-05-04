# nuci-ai 项目升级计划（AI Coding 执行版）

> 本文件用于指导 AI Coding Agent 对 `nuci-ai` 进行整体升级。  
> 核心目标不是砍功能，而是将现有功能重新组织为清晰、可用、可扩展的产品闭环。

---

## 1. 项目新定位

### 1.1 产品定位

将项目定位为：

> 一个本地优先的网页知识采集浏览器插件，帮助用户在阅读网页时快速保存、AI 摘要、标签归类、深度整理，并最终沉淀为个人学习知识库。

### 1.2 产品方向

项目融合两个方向：

- **B：网页阅读摘录工具**
  - 阅读网页时一键保存
  - 自动抓取正文
  - AI 生成摘要、标签、分类
  - 支持手动选区和高亮片段

- **C：本地优先的个人知识库**
  - 本地存储网页内容
  - 支持搜索、分类、标签
  - 支持深度整理
  - 支持导出 Markdown / JSON / Obsidian

### 1.3 不再把项目理解为单纯的“书签整理工具”

书签整理只是其中一个功能模块，不应该成为所有功能的中心。

---

## 2. 核心产品原则

### 2.1 功能不删除，但必须分层

当前项目的问题不是功能太多，而是功能没有层级。

所有功能应拆成三层：

```text
L1：即时采集层 Capture
L2：整理加工层 Process
L3：知识管理层 Knowledge
```

### 2.2 用户路径必须分流

项目应支持两条用户路径：

#### 路径 A：快速保存

适合普通用户。

```text
浏览网页
  ↓
点击悬浮按钮
  ↓
自动抓取正文
  ↓
AI 自动生成摘要 / 标签 / 分类
  ↓
自动保存
  ↓
Toast 提示保存成功
```

#### 路径 B：深度整理

适合重度用户。

```text
浏览网页
  ↓
打开深度保存面板
  ↓
选择抓取范围 / 选区 / 分段
  ↓
AI 生成摘要、标签、分类、关键点
  ↓
用户编辑确认
  ↓
保存到知识库
  ↓
进入深度整理工作台
```

### 2.3 默认流程必须极简

普通用户第一次使用时，只应该理解一件事：

> 点一下，把当前网页保存进知识库。

所有复杂功能都必须藏到高级入口或管理台中。

---

## 3. 整体信息架构

### 3.1 顶层模块

```text
nuci-ai
├── 网页采集入口
│   ├── 悬浮按钮
│   ├── 快速保存
│   └── 深度保存面板
│
├── AI 处理模块
│   ├── 摘要生成
│   ├── 标签生成
│   ├── 分类推荐
│   ├── 关键点提取
│   └── 分段总结
│
├── 知识库管理台
│   ├── 知识列表
│   ├── 搜索
│   ├── 标签筛选
│   ├── 分类筛选
│   └── 详情查看
│
├── 深度整理工作台
│   ├── 内容编辑
│   ├── 摘要编辑
│   ├── 标签编辑
│   ├── AI 二次加工
│   └── Markdown 预览
│
├── 历史书签整理
│   ├── 导入浏览器书签
│   ├── AI 分类建议
│   ├── 批量预览
│   ├── 用户确认
│   └── 可撤销操作
│
└── 设置与导出
    ├── AI 模型配置
    ├── 本地数据管理
    ├── JSON 导出
    ├── Markdown 导出
    └── Obsidian 导出
```

---

## 4. 入口设计

### 4.1 网页侧唯一主入口：悬浮按钮

#### 位置

页面右下角固定显示。

#### 默认行为

单击：

```text
执行快速保存
```

#### 高级行为

可通过以下方式进入深度保存：

- 右键悬浮按钮
- 长按悬浮按钮
- 点击悬浮按钮展开菜单后选择「深度保存」
- 快捷键触发

#### 悬浮按钮菜单

展开后包含：

```text
快速保存当前网页
深度保存
保存选中文本
打开知识库
```

### 4.2 Popup 入口

Popup 不承担主要保存流程，只作为轻量导航中心。

Popup 内容：

```text
今日保存数量
最近保存的 3 条内容
按钮：打开知识库
按钮：历史书签整理
按钮：设置
```

### 4.3 管理台入口

管理台用于承载复杂功能：

```text
知识库
深度整理
历史书签整理
导入导出
设置
```

---

## 5. 核心功能模块设计

---

# 模块一：网页采集 Capture

## 5.1 快速保存

### 功能说明

用户点击悬浮按钮后，插件自动完成：

1. 获取当前网页标题
2. 获取当前网页 URL
3. 提取正文内容
4. 调用 AI 生成摘要、标签、分类
5. 保存到本地知识库
6. 显示保存成功提示

### 交互要求

保存过程中显示状态：

```text
正在抓取网页...
正在生成摘要...
正在保存...
保存成功
```

失败时显示：

```text
保存失败
重试
进入深度保存
```

### 验收标准

- 用户单击一次即可保存网页
- 不弹出复杂面板
- 保存失败时可重试
- 保存后的内容能在知识库中看到

---

## 5.2 深度保存

### 功能说明

深度保存是高级采集模式，允许用户在保存前编辑内容。

### 入口

- 悬浮按钮菜单
- Popup
- 快捷键
- 快速保存失败后的 fallback

### 面板布局

```text
右侧滑出面板

顶部：
- 页面标题
- URL
- 保存按钮
- 取消按钮

内容区域：
- 抓取模式
  - 整页
  - 选中文本
  - 手动编辑
  - 分段抓取

AI 区域：
- 摘要
- 标签
- 分类
- 关键点

底部：
- 保存到知识库
- 保存并进入深度整理
```

### 验收标准

- 用户可以编辑标题、摘要、标签、分类
- 用户可以选择不同抓取模式
- 保存后数据进入知识库
- 点击「保存并进入深度整理」后进入工作台

---

## 5.3 保存选中文本

### 功能说明

用户选中网页中的一段文字后，可以只保存该段内容。

### 入口

- 选中文本后的迷你浮动按钮
- 悬浮按钮菜单中的「保存选中文本」

### 数据要求

保存时需要记录：

```ts
sourceType: 'selection'
selectedText: string
pageTitle: string
url: string
```

### 验收标准

- 选中文本后能保存片段
- 保存内容能关联原网页
- 知识库中能区分「整页保存」和「片段保存」

---

# 模块二：内容提取

## 6.1 提取策略

实现一个统一的内容提取函数：

```ts
extractPageContent(): ExtractedPageContent
```

返回：

```ts
type ExtractedPageContent = {
  title: string
  url: string
  text: string
  html?: string
  excerpt?: string
  siteName?: string
}
```

## 6.2 提取优先级

正文提取顺序：

```text
1. article 标签
2. main 标签
3. 常见正文容器
4. body 文本清洗
```

常见正文容器可包含：

```text
.content
.post-content
.article-content
.markdown-body
.entry-content
```

## 6.3 文本清洗

需要移除：

- script
- style
- nav
- header
- footer
- aside
- 广告区域
- 重复空行

## 6.4 验收标准

- 普通博客文章能提取正文
- GitHub README 页面能提取核心内容
- 掘金 / 知乎 / MDN 等页面尽可能提取正文
- 提取失败时能 fallback 到 body 文本

---

# 模块三：AI 处理 Process

## 7.1 AI 能力分层

### 快速模式 AI 输出

快速保存只需要：

```json
{
  "summary": "100 字左右摘要",
  "tags": ["标签1", "标签2", "标签3"],
  "category": "一级分类"
}
```

### 深度模式 AI 输出

深度保存可以增加：

```json
{
  "summary": "",
  "tags": [],
  "category": "",
  "keyPoints": [],
  "outline": [],
  "readingNotes": "",
  "difficulty": "beginner | intermediate | advanced"
}
```

## 7.2 分类体系

### 一级分类固定

MVP 阶段使用固定一级分类：

```text
前端
后端
AI
产品
设计
效率工具
开源项目
论文资料
教程文档
其他
```

### 二级分类由 AI 生成

例如：

```text
一级分类：前端
二级分类：Vue / React / TypeScript / 工程化
```

## 7.3 AI Prompt：快速保存

```text
你是一个网页知识整理助手。

请根据网页标题和正文内容，生成适合个人知识库保存的信息。

要求：
1. 摘要控制在 100-200 字
2. 标签数量为 3-5 个
3. 从以下一级分类中选择一个最合适的：
   前端、后端、AI、产品、设计、效率工具、开源项目、论文资料、教程文档、其他
4. 可以额外推荐一个二级分类
5. 必须返回 JSON，不要返回 Markdown

返回格式：
{
  "summary": "",
  "tags": [],
  "category": "",
  "subCategory": ""
}
```

## 7.4 AI Prompt：深度整理

```text
你是一个个人知识库整理助手。

请将以下网页内容整理成结构化学习笔记。

要求：
1. 生成摘要
2. 提取 5-8 个关键点
3. 生成结构化大纲
4. 提取适合复习的知识点
5. 推荐标签
6. 推荐分类
7. 判断内容难度
8. 返回 JSON，不要返回 Markdown

返回格式：
{
  "summary": "",
  "keyPoints": [],
  "outline": [],
  "learningNotes": "",
  "tags": [],
  "category": "",
  "subCategory": "",
  "difficulty": ""
}
```

## 7.5 AI 调用要求

需要封装统一服务：

```ts
aiService.generateQuickMeta(content)
aiService.generateDeepNote(content)
aiService.regenerateSummary(item)
aiService.generateTags(item)
```

## 7.6 AI 失败处理

失败时不能阻塞保存。

如果 AI 失败，仍然保存基础数据：

```text
title
url
content
createdAt
status: ai_failed
```

并在知识库中提示：

```text
AI 处理失败，点击重试
```

---

# 模块四：本地知识库 Knowledge

## 8.1 数据结构

统一使用以下数据结构：

```ts
type KnowledgeItem = {
  id: string

  title: string
  url: string
  siteName?: string

  sourceType: 'page' | 'selection' | 'bookmark'
  content: string
  excerpt?: string

  summary?: string
  tags: string[]

  category: string
  subCategory?: string

  keyPoints?: string[]
  outline?: string[]
  learningNotes?: string
  highlights?: Highlight[]

  aiStatus: 'pending' | 'success' | 'failed'
  favorite?: boolean
  archived?: boolean

  createdAt: number
  updatedAt: number
}

type Highlight = {
  id: string
  text: string
  note?: string
  createdAt: number
}
```

## 8.2 存储方案

### MVP

继续使用：

```text
chrome.storage.local
```

### 代码要求

封装统一存储服务：

```ts
knowledgeStorage.create(item)
knowledgeStorage.update(id, patch)
knowledgeStorage.delete(id)
knowledgeStorage.getById(id)
knowledgeStorage.list(query)
knowledgeStorage.search(keyword)
```

### 后续升级

预留迁移到 IndexedDB 的接口，不要让业务组件直接调用 chrome.storage。

## 8.3 知识库列表页

### 页面结构

```text
顶部：
- 搜索框
- 分类筛选
- 标签筛选
- 新建 / 导入 / 导出按钮

左侧：
- 分类列表
- 标签列表
- 工具箱入口

中间：
- 知识卡片列表

右侧或详情页：
- 详情预览
```

### 知识卡片展示字段

```text
标题
摘要
标签
分类
来源网站
保存时间
```

### 支持操作

```text
查看
编辑
收藏
删除
重新 AI 整理
导出 Markdown
```

## 8.4 知识详情页

详情页包含：

```text
标题
URL
摘要
标签
分类
关键点
学习笔记
原文内容
高亮片段
操作按钮
```

操作按钮：

```text
编辑
重新生成摘要
重新生成标签
进入深度整理
导出
删除
```

---

# 模块五：深度整理工作台

## 9.1 功能定位

深度整理工作台不是默认流程，而是重度用户对已保存内容进行二次加工的地方。

## 9.2 入口

```text
保存成功后的“继续整理”
知识库详情页的“深度整理”
管理台左侧导航
```

## 9.3 工作台布局

```text
左侧：原文内容
中间：结构化笔记编辑器
右侧：AI 操作面板
```

## 9.4 AI 操作面板

提供按钮：

```text
重新生成摘要
提取关键点
生成学习笔记
生成复习问题
转换为 Markdown
推荐相关标签
```

## 9.5 编辑器能力

MVP 阶段可先使用 textarea 或基础 Markdown 编辑器。

需要支持：

```text
标题编辑
摘要编辑
关键点编辑
学习笔记编辑
标签编辑
分类编辑
```

## 9.6 验收标准

- 可以从知识库进入工作台
- 工作台可以读取知识项
- 用户修改后可以保存
- AI 可以对已有内容重新加工

---

# 模块六：历史书签整理

## 10.1 功能定位

历史书签整理是高级工具，不进入默认保存流程。

## 10.2 入口

```text
管理台 → 工具箱 → 历史书签整理
Popup → 历史书签整理
```

## 10.3 必须采用安全流程

不能直接修改用户书签。

流程必须是：

```text
读取书签
  ↓
AI 分类建议
  ↓
生成预览结果
  ↓
用户批量确认
  ↓
执行整理
  ↓
生成操作记录
  ↓
支持撤销
```

## 10.4 页面结构

```text
顶部：
- 开始扫描
- AI 分类
- 应用整理
- 撤销上次操作

中间：
- 原书签树
- 推荐分类结果

底部：
- 风险提示
- 操作日志
```

## 10.5 验收标准

- 用户可以预览整理结果
- 用户确认前不会修改书签
- 用户可以取消
- 整理后保留操作日志
- 至少支持撤销最近一次整理

---

# 模块七：搜索、筛选与回顾

## 11.1 MVP 搜索

支持本地搜索：

```text
标题
摘要
标签
分类
URL
```

## 11.2 筛选

支持：

```text
按分类筛选
按标签筛选
按来源类型筛选
按收藏状态筛选
按创建时间排序
```

## 11.3 后续语义搜索

v0.3 之后再做：

```text
用户输入自然语言：
“帮我找之前保存过的 React 性能优化文章”
```

MVP 阶段不要强依赖向量数据库。

---

# 模块八：导入导出

## 12.1 JSON 导出

用于备份全部知识库数据。

导出格式：

```json
{
  "version": "0.1.0",
  "exportedAt": 0,
  "items": []
}
```

## 12.2 Markdown 导出

单条知识导出格式：

```md
# 标题

原文链接：URL

## 摘要

摘要内容

## 关键点

- 关键点 1
- 关键点 2

## 标签

#tag1 #tag2

## 原文摘录

原文内容
```

## 12.3 Obsidian 导出

后续支持：

```text
按分类生成文件夹
每条知识生成一个 Markdown 文件
标签转换为 Obsidian tag
保留 source URL
```

---

# 模块九：设置页

## 13.1 AI 配置

支持配置：

```text
API Provider
API Key
Model Name
Base URL
```

MVP 可以优先支持一个 provider，但代码结构需要可扩展。

## 13.2 保存行为设置

支持：

```text
默认保存模式：快速保存 / 深度保存
快速保存后是否显示详情
是否自动生成摘要
是否自动生成标签
```

## 13.3 数据管理

支持：

```text
导出全部数据
导入备份数据
清空本地数据
```

---

# 14. 技术架构建议

## 14.1 推荐目录结构

```text
src
├── background
│   └── index.ts
│
├── content
│   ├── index.ts
│   ├── floating-button.ts
│   ├── selection-toolbar.ts
│   └── extractor.ts
│
├── popup
│   └── Popup.vue
│
├── options
│   └── Options.vue
│
├── pages
│   ├── KnowledgeBase.vue
│   ├── KnowledgeDetail.vue
│   ├── DeepWorkspace.vue
│   ├── BookmarkOrganizer.vue
│   └── Settings.vue
│
├── components
│   ├── KnowledgeCard.vue
│   ├── SavePanel.vue
│   ├── TagEditor.vue
│   ├── CategorySelector.vue
│   └── LoadingState.vue
│
├── services
│   ├── aiService.ts
│   ├── knowledgeStorage.ts
│   ├── bookmarkService.ts
│   ├── exportService.ts
│   └── contentExtractor.ts
│
├── types
│   └── knowledge.ts
│
└── utils
    ├── id.ts
    ├── time.ts
    └── text.ts
```

## 14.2 核心服务要求

业务组件不要直接调用底层 API。

必须封装：

```text
AI 调用 → aiService
本地存储 → knowledgeStorage
书签操作 → bookmarkService
网页提取 → contentExtractor
导出功能 → exportService
```

---

# 15. MVP 开发优先级

## P0：必须完成

```text
悬浮按钮
快速保存
网页正文提取
AI 摘要 / 标签 / 分类
本地保存
知识库列表
知识详情页
设置 API Key
```

## P1：强烈建议完成

```text
深度保存面板
编辑摘要 / 标签 / 分类
保存选中文本
AI 失败重试
Markdown 导出
```

## P2：可以延后但保留入口

```text
深度整理工作台
历史书签整理
JSON 备份
分类管理
标签管理
```

## P3：后续增强

```text
Obsidian 导出
语义搜索
知识关联
复习问题生成
多模型支持
```

---

# 16. 当前版本目标：v0.1 MVP

## 16.1 v0.1 必须实现的用户故事

### 用户故事 1：快速保存网页

```text
作为用户，
我希望在阅读网页时点击一次按钮，
就能把当前网页保存到我的知识库，
并自动生成摘要和标签。
```

验收：

- 点击悬浮按钮后能保存网页
- 保存时有状态提示
- 保存后能在知识库看到

### 用户故事 2：查看知识库

```text
作为用户，
我希望能查看我保存过的网页，
并通过搜索、标签和分类找到它们。
```

验收：

- 有知识库列表页
- 可搜索标题
- 可按分类筛选
- 可查看详情

### 用户故事 3：深度保存

```text
作为用户，
我希望在保存前可以编辑 AI 生成的摘要、标签和分类。
```

验收：

- 可以打开深度保存面板
- 可以编辑字段
- 可以保存修改后的内容

### 用户故事 4：配置 AI

```text
作为用户，
我希望能配置自己的 AI API Key，
让插件使用我的模型生成摘要。
```

验收：

- 有设置页
- 可以保存 API Key
- 保存后 AI 服务能读取配置

---

# 17. UI 文案建议

## 17.1 悬浮按钮

```text
保存到知识库
```

## 17.2 快速保存状态

```text
正在抓取网页...
正在生成摘要...
正在保存...
已保存到知识库
保存失败，点击重试
```

## 17.3 深度保存按钮

```text
快速保存
深度保存
保存并整理
重新生成
```

## 17.4 知识库空状态

```text
还没有保存任何内容。
去网页上点击「保存到知识库」，开始构建你的学习资料库。
```

---

# 18. README 需要同步调整

## 18.1 README 新标题

```text
Nuci AI
本地优先的网页知识采集与整理插件
```

## 18.2 README 核心描述

```text
Nuci AI 是一个浏览器插件，帮助你在阅读网页时一键保存内容，并使用 AI 自动生成摘要、标签和分类，最终沉淀为可搜索、可导出的个人学习知识库。
```

## 18.3 README 必须包含

```text
项目定位
核心功能
使用流程
截图
安装方式
开发方式
Roadmap
贡献指南
```

---

# 19. good first issue 建议

可以创建以下 issues：

```text
实现知识库卡片组件
实现标签编辑组件
实现 Markdown 导出
优化正文提取逻辑
实现保存成功 Toast
补充 README 使用截图
实现 AI 失败重试按钮
```

---

# 20. 开发注意事项

## 20.1 不要破坏现有功能

如果已有功能未完成，不要直接删除。

应该：

```text
保留代码
调整入口
隐藏到高级功能区
补充 TODO
```

## 20.2 所有复杂功能都不能阻塞主流程

快速保存失败时，用户仍然应该能进入深度保存手动处理。

## 20.3 AI 不是强依赖

没有 API Key 时，仍然允许保存：

```text
标题
URL
正文
```

AI 字段可以为空，并提示用户配置 API Key。

## 20.4 本地优先

不要引入服务端依赖。

除 AI API 调用外，所有数据默认存储在用户浏览器本地。

---

# 21. 最终目标

v0.1 的目标不是做完所有功能，而是完成一个清晰雏形：

```text
用户可以：
1. 在网页上一键保存内容
2. 获得 AI 摘要、标签和分类
3. 在本地知识库中查看和搜索
4. 对重要内容进行深度整理
```

项目应从“功能堆叠”升级为：

> 一个有默认路径、有高级能力、有知识库闭环的 AI 网页学习工具。
