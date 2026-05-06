# 📋 版本更新日志同步规则

## 规则说明

每次对本项目代码进行任何修改或功能更新后，**必须同步更新 `app_updates` 数据库表**，在 Supabase 中插入一条新的更新记录。

## 操作方式

### 方式一：通过 Supabase 仪表盘（推荐）

1. 打开 https://supabase.com/dashboard/project/popxjdngakindnqmahnl/sql/new
2. 执行以下 SQL：

```sql
INSERT INTO public.app_updates (version, title, content, type, created_at)
VALUES (
  '1.0.x',                                    -- 版本号（递增）
  '更新标题',                                  -- 简短的标题
  '更新内容描述...',                            -- 详细的更新内容
  'feature' | 'fix' | 'update',               -- 类型
  NOW()                                        -- 当前时间
);
```

### 方式二：通过代码（自动插入）

在 `MainLayout.tsx` 的 `fetchAppUpdates` 函数中，数据从 `app_updates` 表读取。如果需要代码自动插入，可以使用 Supabase 客户端：

```typescript
await supabase.from("app_updates").insert([{
  version: "1.0.7",
  title: "示例更新",
  content: "- 更新内容1\n- 更新内容2",
  type: "feature", // feature | fix | update
}]);
```

## 版本号规则

- 主版本：重大重构/UI 改版
- 次版本：新功能
- 修订号：Bug 修复

## 更新日志字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | text | 版本号，如 `1.0.7` |
| `title` | text | 更新标题，简短概括 |
| `content` | text | 详细更新内容，支持换行 |
| `type` | text | `feature`（新功能）、`fix`（修复）、`update`（更新） |
| `created_at` | timestamptz | 自动填充当前时间 |

## 每次代码修改后必须执行

无论任何 AI 助手或开发者修改此项目代码，**在完成修改后必须执行以下步骤之一**：

1. ✅ 在 `app_updates` 表中插入一条更新记录
2. ✅ 或者在提交信息中注明需要手动添加更新日志

这样确保所有更新都能在软件的 🔔 通知面板中可见。
