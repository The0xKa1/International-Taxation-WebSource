# 维护说明

本项目使用 HTML、CSS 和原生 JavaScript，无需构建。

## 目录

- `cn/`：中文首页、章节页面和章节计算脚本。
- `en/`：英文版本，文件名与中文版对应。
- `assets/css/`：公共样式。
- `assets/js/`：首页滚动、移动端参数展开等公共交互。
- `assets/images/`：头像、校标和图标。
- 根目录的 HTML：默认中文入口及旧章节地址跳转。

## 本地预览与检查

在仓库根目录运行：

```sh
python3 -m http.server 8000
```

打开 <http://localhost:8000/>。修改后运行：

```sh
python3 scripts/check_site.py
```

检查需要 Python 3 和 Node.js，用于验证本地资源路径、双语页面对应关系及 JavaScript 语法。计算与排版的改动还应在浏览器中检查。

## 更新章节

1. 在 `cn/` 和 `en/` 同步修改对应页面与脚本。
2. 保持计算逻辑与输入范围一致，分别维护文案。
3. 检查语言切换、默认结果、输入错误提示和重置。
4. 通过 PR 合入 `main`。

## 静态部署

发布目录为仓库根目录。路径均相对于页面，适用于 GitHub Pages 项目路径及 Vercel 静态托管。

- GitHub Pages：Settings → Pages → Deploy from a branch，选择 `main` 和 `/ (root)`。`.nojekyll` 用于直接发布静态文件。
- Vercel：导入仓库，Framework Preset 选择 Other，无需构建命令，发布根目录。

仓库创建与网站部署是两个独立步骤。
