#!/bin/bash

# キャリア相談チャットアプリ セットアップスクリプト

echo "🚀 キャリア相談チャットアプリのセットアップを開始します..."

# Node.jsバージョンチェック
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18以上が必要です。現在のバージョン: $(node -v)"
    exit 1
fi

echo "✅ Node.js バージョン: $(node -v)"

# 依存関係のインストール
echo "📦 依存関係をインストールしています..."
npm install

# 環境変数ファイルのセットアップ
if [ ! -f .env.local ]; then
    echo "📝 環境変数ファイルを作成しています..."
    cp .env.local.example .env.local
    echo "⚠️  .env.localファイルを編集して、必要な環境変数を設定してください:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - OPENAI_API_KEY"
else
    echo "✅ 環境変数ファイルは既に存在します"
fi

# TypeScriptの型チェック
echo "🔍 TypeScriptの型チェックを実行しています..."
npx tsc --noEmit

# ビルドテスト
echo "🏗  ビルドテストを実行しています..."
npm run build

echo ""
echo "✨ セットアップが完了しました！"
echo ""
echo "次のステップ:"
echo "1. .env.localファイルを編集して環境変数を設定"
echo "2. Supabaseプロジェクトを作成し、データベースマイグレーションを実行"
echo "3. npm run dev で開発サーバーを起動"
echo ""
echo "詳細はREADME.mdを参照してください。"
