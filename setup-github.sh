#!/bin/bash

echo "🔧 GitHub接続セットアップスクリプト"
echo "================================"
echo ""
echo "このスクリプトはGitHub Personal Access Tokenを使って接続を設定します。"
echo ""
echo "1. まず、GitHub Personal Access Tokenを作成してください:"
echo "   https://github.com/settings/tokens/new"
echo "   必要なスコープ: repo, workflow"
echo ""
read -p "GitHub Username: " GITHUB_USERNAME
read -s -p "GitHub Personal Access Token: " GITHUB_TOKEN
echo ""

# APIを呼び出し
curl -X POST http://localhost:3000/api/setup-github \
  -H "Content-Type: application/json" \
  -d "{\"github_token\": \"$GITHUB_TOKEN\", \"github_username\": \"$GITHUB_USERNAME\"}" \
  | python3 -m json.tool

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "確認: http://localhost:3000/github-status"