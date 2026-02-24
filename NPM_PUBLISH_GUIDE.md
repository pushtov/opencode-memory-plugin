# 📦 NPM包发布完整指南

## 准备工作

### 1. 检查当前版本
```bash
cd opencode-memory-plugin/opencode-memory-plugin
cat package.json | grep version
```

当前版本应该是 `"version": "1.0.0"`

### 2. 确认npm账号
```bash
# 检查是否已登录
npm whoami

# 如果未登录，登录npm
npm login
```

## 🚀 发布流程

### 步骤1: 更新版本号

**方法A: 使用npm version命令（推荐）**

```bash
# 补丁版本（bug修复）：1.0.0 → 1.0.1
npm version patch

# 次要版本（新功能，向后兼容）：1.0.0 → 1.1.0  ✅ 使用这个
npm version minor

# 主要版本（破坏性变更）：1.0.0 → 2.0.0
npm version major
```

**方法B: 手动编辑package.json**
```bash
# 编辑package.json
nano package.json

# 将 "version": "1.0.0" 改为 "version": "1.1.0"
```

### 步骤2: 验证package.json配置

```bash
# 检查必要字段
cat package.json | grep -E "name|version|description|main|repository|keywords|license"

# 应该包含：
{
  "name": "@csuwl/opencode-memory-plugin",
  "version": "1.1.0",
  "description": "...",
  "main": "index.js",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/csuwl/opencode-memory-plugin.git"
  },
  "keywords": [...],
  "license": "MIT"
}
```

### 步骤3: 检查files字段（确保正确文件被打包）

```bash
# 查看.files配置
cat package.json | grep -A 10 '"files"'
```

应该包含：
```json
"files": [
  "memory/",
  "tools/",
  "agents/",
  "scripts/",
  "bin/",
  "index.js",
  "README.npm.md"
]
```

### 步骤4: 测试打包（dry-run）

```bash
# 测试打包但不发布
npm pack --dry-run

# 或者实际打包检查内容
npm pack
tar -tzf *.tgz | head -20
```

### 步骤5: 清理旧打包文件

```bash
# 删除旧的.tgz文件
rm -f *.tgz
```

### 步骤6: 发布到npm

```bash
# 正式发布
npm publish

# 带标签的发布（首次发布或公共包）
npm publish --access public
```

### 步骤7: 验证发布

```bash
# 在npmjs.com上查看包
# https://www.npmjs.com/package/@csuwl/opencode-memory-plugin

# 或使用命令查看
npm view @csuwl/opencode-memory-plugin
```

## 📋 发布前检查清单

### 必需检查
- [ ] package.json版本号已更新
- [ ] package.json包含所有必需字段
- [ ] README.npm.md存在且内容完整
- [ ] files字段正确（只包含必要文件）
- [ ] 没有包含敏感信息（.env, API keys等）
- [ ] .gitignore正确配置（不包括node_modules等）
- [ ] .npmignore正确配置（如果使用）

### 内容检查
- [ ] tools/config.ts存在
- [ ] tools/search-modes.ts存在
- [ ] tools/vector-memory.ts已更新
- [ ] CONFIGURATION.md在files中
- [ ] scripts/uninstall.sh可执行

### 版本号规则
- 补丁版本（patch）：1.0.0 → 1.0.1（bug修复）
- 次要版本（minor）：1.0.0 → 1.1.0（新功能，向后兼容）✅
- 主要版本（major）：1.0.0 → 2.0.0（破坏性变更）

## 🔐 首次发布注意事项

### 1. 包名作用域
```json
{
  "name": "@csuwl/opencode-memory-plugin"
}
```

### 2. 设置为public（如果是开源包）
```bash
npm publish --access public
```

### 3. 添加.npmignore（可选）
```
# 开发文件
*.md
!README.npm.md
!CONFIGURATION.md

# 测试文件
test/
*.test.js
*.spec.js

# Git
.git/
.gitignore

# 其他
.DS_Store
node_modules/
```

## 🎯 完整发布脚本

```bash
#!/bin/bash
set -e

echo "🚀 Starting npm package release..."

# 1. 切换到插件目录
cd opencode-memory-plugin/opencode-memory-plugin

# 2. 更新版本号
echo "📦 Updating version to 1.1.0..."
npm version minor -m "Release v1.1.0: True semantic search with flexible configuration"

# 3. 检查配置
echo "✅ Validating package.json..."
npm pack --dry-run

# 4. 清理旧文件
echo "🧹 Cleaning up..."
rm -f *.tgz

# 5. 发布
echo "📤 Publishing to npm..."
npm publish --access public

# 6. 验证
echo "✅ Verifying release..."
npm view @csuwl/opencode-memory-plugin

echo "🎉 Release complete!"
```

## 🔄 更新已发布的包

### 场景1: 发现bug需要修复
```bash
# 1. 修复bug
# 2. 更新补丁版本
npm version patch
# 3. 发布
npm publish
```

### 场景2: 添加新功能
```bash
# 1. 添加新功能
# 2. 更新次版本
npm version minor
# 3. 发布
npm publish
```

### 场景3: 破坏性变更
```bash
# 1. 进行破坏性更改
# 2. 更新主版本
npm version major
# 3. 发布
npm publish
```

## 📊 发布后检查

### 在浏览器中验证
访问：https://www.npmjs.com/package/@csuwl/opencode-memory-plugin

检查：
- [ ] 版本号正确
- [ ] 描述准确
- [ ] 关键词正确
- [ ] README显示
- [ ] 文件列表正确

### 安装测试
```bash
# 全局安装测试
npm install -g @csuwl/opencode-memory-plugin@1.1.0

# 本地安装测试
mkdir /tmp/test-install
cd /tmp/test-install
npm install @csuwl/opencode-memory-plugin
```

## ⚠️ 常见问题

### 1. 包名已存在
```
npm ERR! 403 You cannot publish over the existing version
```
**解决**: 更新版本号

### 2. 权限错误
```
npm ERR! 403 Forbidden
```
**解决**: 
- 确认你拥有该作用域的发布权限
- 对于@作用域，需要在npmjs.com上设置

### 3. 文件过大
```
npm ERR! Package too large
```
**解决**: 
- 检查.npmignore
- 确保package.json的files字段正确

## 🎉 成功发布后

### 创建Git标签
```bash
# Git标签与npm版本同步
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### 更新CHANGELOG（可选）
创建CHANGELOG.md记录版本变更

### 通知用户
- GitHub Release
- 更新README
- 社交媒体分享

## 📞 获取帮助

```bash
# npm帮助
npm help publish

# 查看包信息
npm profile get
```

---

## 🚀 立即开始

```bash
# 快速发布命令
cd opencode-memory-plugin/opencode-memory-plugin
npm version minor
npm publish --access public
```

**结果**: v1.0.0 → v1.1.0 发布成功！
