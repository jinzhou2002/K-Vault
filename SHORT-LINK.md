# K-Vault 界面美化 + 短链优化

## 视觉

- 新皮肤 `skin-vault.css`：青绿矿物金库风格（告别默认紫色）
- 字体：Syne（品牌）+ Manrope（正文）
- 氛围背景：径向光斑 + 细网格
- 首页品牌副标题、上传区动效、短链徽章

## 功能

- 上传成功默认**自动复制短链**（可关掉，偏好会记住）
- 结果列表显示「短链」徽章
- 复制提示区分短链 / 普通链接
- 继续沿用上一版：`/s/` 代理不跳转、后台/图库复制短链

## 上传这些文件到 GitHub

覆盖到仓库根目录对应路径：

| 文件 |
|------|
| `skin-vault.css`（新建） |
| `index.html` |
| `admin.html` |
| `gallery.html` |
| `functions/utils/short-link.js` |
| `functions/s/[slug].js` |
| `functions/api/manage/short-link.js` |
| `functions/upload.js` |
| `functions/api/telegram/webhook.js` |
| `functions/api/upload-from-url.js` |

部署后 **Ctrl+F5** 强刷。
