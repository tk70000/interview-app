# Claude Code Actions 活用ガイド

## 🚀 すぐに使える実用例

### 1. **自動コードフォーマット**
```yaml
name: Auto Format Code
on:
  workflow_dispatch:
    inputs:
      files:
        description: 'Files to format (e.g., src/**/*.ts)'
        default: 'src/**/*.{ts,tsx}'

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prettier --write ${{ github.event.inputs.files }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'Auto-format code'
```

### 2. **依存関係の更新チェック**
```yaml
name: Check Dependencies
on:
  workflow_dispatch:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜9時

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm outdated || true
      - run: npm audit
```

### 3. **AIによるコード分析**
```yaml
name: AI Code Analysis
on:
  workflow_dispatch:
    inputs:
      analyze_type:
        type: choice
        options:
          - security
          - performance
          - quality
          - all

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Analysis
        run: |
          echo "🤖 AI Analysis Type: ${{ github.event.inputs.analyze_type }}"
          # ここにOpenAI APIを使った分析ロジックを追加
```

## 💡 Claude Code Actionの活用シナリオ

### シナリオ1: 開発効率化
- **自動テスト実行**: コミット時に自動でテスト
- **ビルドチェック**: PRマージ前に自動ビルド確認
- **コード品質チェック**: ESLint/Prettierの自動実行

### シナリオ2: 運用自動化
- **定期バックアップ**: データベースの定期バックアップ
- **ログ分析**: エラーログの自動分析とレポート
- **パフォーマンス監視**: 定期的なパフォーマンステスト

### シナリオ3: AI連携
- **コードレビュー**: AIによる自動コードレビュー
- **ドキュメント生成**: コードからドキュメント自動生成
- **バグ予測**: AIによるバグ発生予測

## 🛠 セットアップ手順

1. **ワークフローファイルを作成**
   - `.github/workflows/`ディレクトリに`.yml`ファイルを配置

2. **ローカルアプリから実行**
   ```javascript
   // APIコール例
   await fetch('/api/v1/github/workflows', {
     method: 'POST',
     body: JSON.stringify({
       owner: 'tk70000',
       repo: 'interview-app',
       workflow_id: 'your-workflow.yml',
       ref: 'main',
       inputs: { /* パラメータ */ }
     })
   })
   ```

3. **結果の確認**
   - GitHub Actions タブ
   - アーティファクトのダウンロード
   - 通知設定（Slack, Email等）

## 📊 ベストプラクティス

1. **小さく始める**: シンプルなワークフローから徐々に複雑化
2. **エラーハンドリング**: 失敗時の通知とリトライ設定
3. **セキュリティ**: シークレットの適切な管理
4. **コスト管理**: 実行時間の最適化
5. **ドキュメント化**: ワークフローの目的と使い方を明記

## 🎯 次のアクション

1. `http://localhost:3000/github-actions-test`でテスト実行
2. 上記の実用例から1つ選んでGitHubに追加
3. ローカルアプリから実行して動作確認
4. チームのニーズに合わせてカスタマイズ