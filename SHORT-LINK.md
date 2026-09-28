# K-Vault 短链补丁

上传成功后默认返回短链，例如：

```
https://你的域名/s/a1b2c3
```

而不是很长的：

```
https://你的域名/file/BQACAgUAAxkBAAI...很长...jpg
```

`/s/短码` 会 302 跳转到真实 `/file/...`，图片嵌入、浏览器访问都可用。

## 需要改动的文件

把本目录下这些文件覆盖到你 fork 的同名路径：

| 文件 | 说明 |
|------|------|
| `functions/utils/short-link.js` | **新建** 短链工具 |
| `functions/upload.js` | 网页上传返回短链 |
| `functions/api/telegram/webhook.js` | TG Webhook 回链也用短链 |
| `functions/api/upload-from-url.js` | URL 上传返回短链 |

已有的 `functions/s/[slug].js` **不用改**，短链解析逻辑本来就有。

## 前提条件

1. Cloudflare Pages 已绑定 KV：变量名 `img_url`
2. 推送代码后重新部署

## 可选环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `ENABLE_SHORT_URLS` | 有 KV 时默认开启 | 设为 `false` 恢复长链 |
| `SHORT_URL_LENGTH` | `6` | 短码长度，范围 4–16 |
| `PUBLIC_BASE_URL` | 可选 | 如 `https://img.example.com`，TG 通知里的链接会用这个域名 |
