# 在线改文档内容（分享链接不变）

## 能力

1. **文本 Paste**：`PUT /api/v1/paste/:id` 覆盖正文，id / 链接不变  
2. **已上传文本文档**：后台「改内容」→ `PUT /api/manage/content/:id`  
   - 覆盖内容后，原 `/file/...` 与 `/s/短码` **保持不变**
3. 支持类型：txt / md / json / xml / csv / html / css / js 等文本类

## 后台用法

打开 `/admin.html` → 文本类文件会出现 **改内容** → 编辑保存即可。

## API 示例

```bash
# 更新 Paste（Bearer 需 paste 权限）
curl -X PUT "https://你的域名/api/v1/paste/AbCdEf1234" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"新的正文","language":"markdown"}'

# 更新已上传文本文档（后台登录 Cookie 或走 manage）
curl -X PUT "https://你的域名/api/manage/content/文件KV键" \
  -H "Content-Type: application/json" \
  -d '{"content":"更新后的文档内容"}'
```

## 需上传的文件

| 文件 |
|------|
| `functions/utils/paste-store.js` |
| `functions/utils/file-content.js`（新建） |
| `functions/api/v1/paste/[id].js` |
| `functions/api/v1/_middleware.js` |
| `functions/file/[id].js` |
| `functions/api/manage/content/[id].js`（新建） |
| `functions/api/manage/paste/[id].js`（新建） |
| `admin.html` |
| `skin-vault.css` |
