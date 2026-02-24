# 📦 NPM包发布完整步骤

## 当前状态

✅ **版本已更新**: 1.0.0 → 1.1.0  
✅ **已提交到Git**: fe5e130  
✅ **包已准备好**: 30.3 kB  
⏳ **等待**: npm登录和发布

## 🔐 第一步：登录npm

### 检查当前registry
```bash
npm config get registry
```

如果显示淘宝镜像，需要临时切换到官方npm源：
```bash
# 临时设置官方源
npm config set registry https://registry.npmjs.org/
```

### 登录npm
```bash
npm login
```

系统会提示输入：
- **Username**: 你的npm用户名
- **Password**: 你的npm密码
- **Email**: 你的npm邮箱
- **OTP**: 如果启用了两步验证，检查手机获取一次性密码

或者使用token（推荐）：
```bash
# 创建token: https://www.npmjs.com/settings/tokens
npm token create

# 使用token登录
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN_HERE
```

## 🚀 第二步：发布到npm

### 方法1: 直接发布（推荐）
```bash
cd opencode-memory-plugin/opencode-memory-plugin
npm publish --access public
```

**参数说明**:
- `--access public`: 将包设置为公开（@作用域包需要）
- 不加该参数可能默认为private导致发布失败

### 方法2: 检查后再发布
```bash
# 1. 测试打包
npm pack

# 2. 查看打包内容
tar -tzf *.tgz | head -30

# 3. 删除测试包
rm -f *.tgz

# 4. 发布
npm publish --access public
```

## 📋 发布前最终检查清单

### package.json检查
```bash
cd opencode-memory-plugin/opencode-memory-plugin

# 检查版本号（应该是1.1.0）
cat package.json | grep version

# 检查包名（应该是@csuwl/opencode-memory-plugin）
cat package.json | grep name

# 检查files字段
cat package.json | grep -A 10 '"files"'
```

应该包含：
```json
{
  "name": "@csuwl/opencode-memory-plugin",
  "version": "1.1.0",
  "files": [
    "memory/",
    "tools/",
    "agents/",
    "scripts/",
    "bin/",
    "index.js",
    "README.npm.md"
  ]
}
```

### 权限检查
```bash
# 检查npm账号
npm whoami

# 查看包信息（如果已发布）
npm view @csuwl/opencode-memory-plugin
```

## ⚡ 快速发布命令

```bash
# 一键发布脚本
cd /Users/wl/opencode-project/opencode-memory-plugin/opencode-memory-plugin

# 1. 确保使用官方npm源
npm config set registry https://registry.npmjs.org/

# 2. 登录（如果未登录）
npm login

# 3. 发布
npm publish --access public
```

## ✅ 发布成功后

### 验证发布
```bash
# 查看包信息
npm view @csuwl/opencode-memory-plugin

# 或访问网页
# https://www.npmjs.com/package/@csuwl/opencode-memory-plugin
```

### 测试安装
```bash
# 全局安装测试
npm install -g @csuwl/opencode-memory-plugin@1.1.0

# 查看已安装的版本
npm list -g @csuwl/opencode-memory-plugin
```

### 创建GitHub标签
```bash
cd /Users/wl/opencode-project/opencode-memory-plugin
git tag -a v1.1.0 -m "Release v1.1.0: True semantic search"
git push origin v1.1.0
```

## ⚠️ 常见问题

### 1. 403 Forbidden错误
```
npm ERR! 403 Forbidden - PUT @csuwl/opencode-memory-plugin
```
**原因**: 没有该作用域的发布权限  
**解决**: 
- 访问 https://www.npmjs.com/settings/organizations
- 确保你在csuwl组织下有发布权限
- 或联系组织管理员

### 2. 需要认证错误
```
npm ERR! code ENEEDAUTH
```
**原因**: 未登录  
**解决**: `npm login`

### 3. 包名已存在
```
npm ERR! 403 You cannot publish over the existing version
```
**原因**: 版本号已存在  
**解决**: `npm version patch/minor/major`

### 4. 淘宝镜像问题
```
npm ERR! need auth This command requires you to be logged in to http://registry.npm.taobao.org/
```
**原因**: 当前使用淘宝镜像  
**解决**: 
```bash
npm config set registry https://registry.npmjs.org/
npm publish --access public
# 恢复淘宝镜像（可选）
npm config set registry https://registry.npmmirror.com
```

## 📊 发布后的包信息

**包名**: @csuwl/opencode-memory-plugin  
**版本**: 1.1.0  
**大小**: 30.3 kB  
**解压后**: 119.5 kB  
**文件数**: 23个  

**包含文件**:
- memory/ (9个文件)
- tools/ (3个TypeScript文件)
- agents/ (2个agent定义)
- scripts/ (3个脚本)
- bin/ (安装脚本)
- index.js
- README.npm.md

## 🎯 下一步

发布成功后，用户可以这样安装：

```bash
# 全局安装
npm install -g @csuwl/opencode-memory-plugin

# 或安装特定版本
npm install -g @csuwl/opencode-memory-plugin@1.1.0

# 本地安装
npm install @csuwl/opencode-memory-plugin
```

## 📞 获取帮助

- npm官方文档: https://docs.npmjs.com/cli/publish.html
- 包名管理: https://www.npmjs.com/settings/packages
- 权限管理: https://www.npmjs.com/settings/organizations

---

## 🚀 立即开始发布

```bash
# 1. 进入目录
cd /Users/wl/opencode-project/opencode-memory-plugin/opencode-memory-plugin

# 2. 切换到官方npm源
npm config set registry https://registry.npmjs.org/

# 3. 登录npm
npm login

# 4. 发布
npm publish --access public

# 5. 验证
npm view @csuwl/opencode-memory-plugin@1.1.0
```

**准备好了吗？版本1.1.0已经准备好了！** 📦✨
