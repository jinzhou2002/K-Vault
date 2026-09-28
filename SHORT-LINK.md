# K-Vault 短链补丁

上传成功后默认返回短链，例如：

```
https://你的域名/s/a1b2c3
```

并且：
- 打开短链时**不再 302 跳转**到长链（地址栏保持短链，复制图片地址也是短链）
- 首页 / 后台 / 图库复制链接时优先使用短链
- 旧文件在后台点击复制时会自动生成短链

## 需要覆盖的文件

| 文件 | 说明 |
|------|------|
| `functions/utils/short-link.js` | 短链工具（新建/覆盖） |
| `functions/s/[slug].js` | 短链改为代理，不再跳转 |
| `functions/api/manage/short-link.js` | 后台按需生成短链（新建） |
| `functions/upload.js` | 上传返回短链 |
| `functions/api/telegram/webhook.js` | TG 回链短链 |
| `functions/api/upload-from-url.js` | URL 上传短链 |
| `index.html` | 首页复制保留短链 |
| `admin.html` | 后台复制用短链 |
| `gallery.html` | 图库复制用短链 |

## 前提

1. Cloudflare Pages 已绑定 KV：`img_url`
2. 覆盖文件后重新部署
3. 部署后建议 **强制刷新** 页面（Ctrl+F5），避免旧 JS 缓存

## 可选环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `ENABLE_SHORT_URLS` | 有 KV 时默认开启 | 设为 `false` 关闭短链 |
| `SHORT_URL_LENGTH` | `6` | 短码长度 4–16 |
| `PUBLIC_BASE_URL` | 可选 | TG 通知用的完整域名 |
