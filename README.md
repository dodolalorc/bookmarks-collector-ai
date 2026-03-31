# Smart Favorites AI

一个基于 Plasmo 的浏览器扩展 SDK，用来辅助书签分类、页面知识抓取和用户确认式整理。

当前版本实现了一个可运行的 MVP：

- Popup 中抓取当前页面标题、摘要和用户选中文本
- 基于现有书签结构做本地启发式分类推荐
- 支持接入 OpenAI 兼容接口，增强文件夹推荐
- 用户确认后再创建或移动书签，不做不可逆自动整理
- Options 页面管理 API Key、模型和 Prompt 模板
- 支持导出本地配置、知识记录和收藏夹结构快照

## 项目结构

```text
.
├── background.ts              # 扩展后台，负责推荐、写入书签、导出快照
├── contents/page-capture.ts   # 页面抓取脚本
├── popup.tsx                  # 新书签推荐与确认入口
├── options.tsx                # 模型与策略配置页
└── src/sdk
    ├── bookmarks.ts           # 书签树读取、应用推荐
    ├── client.ts              # 前端调用 SDK
    ├── constants.ts           # 默认配置与模板
    ├── folder-recommender.ts  # 本地推荐引擎
    ├── provider.ts            # AI Provider 封装
    ├── storage.ts             # chrome.storage 封装
    ├── text.ts                # 文本处理工具
    └── types.ts               # 统一类型定义
```

## 开发

```bash
pnpm dev
```

加载 `build/chrome-mv3-dev` 到浏览器即可调试。

## 构建

```bash
pnpm build
```

## 使用流程

1. 打开任意网页，在页面中手动选择你认为重要的文字。
2. 点击插件 Popup，选择“重新抓取”。
3. 添加手动标签或备注，点击“开始推荐”。
4. 检查推荐的收藏夹，确认后执行写入。
5. 如需启用 AI 增强推荐，在 Options 页面配置 OpenAI 兼容模型接口。

## 设计取舍

- 保留用户确认权：推荐不等于自动执行。
- 先支持本地可用，再支持 AI 增强：未配置模型时也能工作。
- 统一 SDK 抽象：后续可继续扩展历史书签批量整理、导入导出、搜索与知识库。
