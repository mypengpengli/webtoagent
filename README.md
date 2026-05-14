# AI File Reader

让网页端 AI（通义千问、ChatGPT、Gemini、Claude）像 IDE 一样自动读取本地文件。

## 功能

- 📁 文件树侧边栏 — 浏览目录，点击文件直接插入聊天框
- @ 指令 — 输入 `@文件名` 模糊搜索并插入文件内容
- @ 文件夹 — 输入 `@文件夹名` 一次性加载整个目录
- 双模式 — 本地服务（全自动） / 浏览器 API（免安装，需授权）

支持：chat.qwen.ai · chatgpt.com · gemini.google.com · claude.ai

## 快速开始

### 方式一：本地服务模式（推荐）

需要 [Node.js](https://nodejs.org) v14+

```bash
# 1. 在 Chrome 加载扩展
#    chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选择本目录

# 2. 复制扩展 ID，填入 native-host/manifest.json 的 allowed_origins

# 3. 注册本地服务
cd native-host
install.bat

# 4. 重启 Chrome，点击扩展图标设置工作目录
```

### 方式二：浏览器模式（零安装）

1. 加载扩展到 Chrome
2. 打开任意支持的网站，点击右下角 📁 按钮
3. 在侧边栏点击「选择文件夹」，授权项目目录即可

> 浏览器模式每次重启 Chrome 需重新授权。

## 使用

| 操作 | 说明 |
|------|------|
| 点击 📁 | 打开/关闭文件树侧边栏 |
| 点击文件 | 将文件内容插入聊天输入框 |
| `@文件名` | 模糊搜索文件，选中后插入 |
| `@文件夹名` | 批量加载整个目录（最多 50 文件 / 5MB） |

文件内容以 markdown 代码块格式插入，自动识别语言。

## 注意事项

- 默认隐藏敏感文件（.env、私钥、证书等），防止误发密钥
- 默认忽略 `.git`、`node_modules`、`dist` 等目录
- 二进制文件自动跳过，单文件上限 1MB
- 文件索引上限 5000 个（大型项目会截断）

## 卸载

1. `chrome://extensions` 中移除扩展
2. 双击 `native-host/uninstall.bat`

## License

MIT
