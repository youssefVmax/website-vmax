#!/bin/bash
# Cross-platform script to clear .next folder and start fresh development

echo "🧹 Clearing Next.js cache and build files..."

# Clear .next folder
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Cleared .next folder"
else
    echo "ℹ️ .next folder doesn't exist"
fi

# Clear node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✅ Cleared node_modules cache"
fi

# Clear npm cache
echo "🗑️ Clearing npm cache..."
npm cache clean --force

echo "🚀 Starting fresh development server..."
npm run dev
