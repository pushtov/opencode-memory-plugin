#!/bin/bash
# OpenCode Memory Plugin 验证脚本

echo "═══════════════════════════════════════════════════════════════"
echo "  OpenCode Memory Plugin 功能验证"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 检查目录结构
echo "1. 检查目录结构..."
if [ -d "$HOME/.opencode/memory" ]; then
    echo "   ✅ 内存目录存在: ~/.opencode/memory"
else
    echo "   ❌ 内存目录不存在"
    exit 1
fi

# 检查配置文件
echo ""
echo "2. 检查配置文件..."
if [ -f "$HOME/.opencode/memory/memory-config.json" ]; then
    echo "   ✅ 配置文件存在"
    cat "$HOME/.opencode/memory/memory-config.json" | head -5
else
    echo "   ❌ 配置文件不存在"
fi

# 检查 OpenCode 配置
echo ""
echo "3. 检查 OpenCode 配置..."
if [ -f "$HOME/.config/opencode/opencode.json" ]; then
    if grep -q "@csuwl/opencode-memory-plugin" "$HOME/.config/opencode/opencode.json"; then
        echo "   ✅ 插件已注册到 OpenCode"
    else
        echo "   ❌ 插件未注册到 OpenCode"
    fi
else
    echo "   ❌ OpenCode 配置文件不存在"
fi

# 检查核心文件
echo ""
echo "4. 检查核心文件..."
for file in MEMORY.md SOUL.md AGENTS.md USER.md; do
    if [ -f "$HOME/.opencode/memory/$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file 缺失"
    fi
done

# 检查向量索引
echo ""
echo "5. 检查向量索引..."
if [ -f "$HOME/.opencode/memory/vector-index.db" ]; then
    echo "   ✅ 向量索引数据库存在"
    echo "   大小: $(ls -lh $HOME/.opencode/memory/vector-index.db | awk '{print $5}')"
else
    echo "   ⚠️  向量索引数据库不存在 (首次使用时会自动创建)"
fi

# 检查 npm 包
echo ""
echo "6. 检查 npm 包安装..."
if npm list -g @csuwl/opencode-memory-plugin &>/dev/null; then
    VERSION=$(npm list -g @csuwl/opencode-memory-plugin 2>/dev/null | grep @csuwl/opencode-memory-plugin | sed 's/.*@//')
    echo "   ✅ 已安装版本: $VERSION"
else
    echo "   ❌ npm 包未全局安装"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  验证完成"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "在 OpenCode 中测试工具:"
echo "  memory_write content=\"测试记忆\" type=\"test\""
echo "  memory_read"
echo "  memory_search query=\"测试\""
echo "  index_status"