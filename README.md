# キャリア相談チャットアプリ

データサイエンス領域の候補者と採用担当者をつなぐ、AIを活用したキャリア相談プラットフォームです。

## 🚀 主な機能

- **CV自動要約**: アップロードされたCVをAIが分析し、重要なポイントを自動抽出
- **インテリジェント質問生成**: 候補者の経験とスキルに基づいた最適な質問を自動生成
- **リアルタイムチャット**: ストリーミング技術による自然な対話体験
- **フォローアップ機能**: 回答内容を分析し、必要に応じて追加質問を生成
- **管理ダッシュボード**: 候補者情報と面談進捗の一元管理
- **ベクトル検索（RAG）**: 過去の回答を参照した文脈に沿った質問生成

## 🛠 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Supabase
- **AI/ML**: OpenAI GPT-4, pgvector
- **データベース**: PostgreSQL (Supabase)
- **ストレージ**: Supabase Storage
- **認証**: Supabase Auth

## 📋 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseアカウント
- OpenAI APIキー

## 🔧 セットアップ

### 1. リポジトリのクローン

```bash
cd /Users/ueyamatakuma/Desktop/interview_app
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local.example`を`.env.local`にコピーして、必要な値を設定してください：

```bash
cp .env.local.example .env.local
```

必要な環境変数：
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: SupabaseのService Roleキー
- `OPENAI_API_KEY`: OpenAI APIキー
- `GITHUB_CLIENT_ID`: GitHub OAuth AppのClient ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth AppのClient Secret
- `NEXT_PUBLIC_APP_URL`: アプリケーションのURL（デフォルト: http://localhost:3000）

### 4. Supabaseのセットアップ

1. Supabaseプロジェクトを作成
2. SQL Editorで`supabase/migrations/001_initial_schema.sql`を実行
3. Storageで`cv-uploads`バケットを作成
4. Authentication設定でユーザー登録を有効化

### 5. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 📱 使い方

### 候補者として

1. ホームページから「CVアップロード」を選択
2. 名前、メールアドレス、CVファイルをアップロード
3. 自動生成された質問に回答
4. AIカウンセラーとの対話を通じてキャリアを深掘り

### 採用担当者として

1. 「管理ダッシュボード」にアクセス
2. 候補者一覧と統計情報を確認
3. 個別の面談内容を詳細に閲覧
4. 必要に応じてデータをエクスポート

## 🔗 GitHub統合

### GitHub OAuth Appの設定

1. [GitHub Developer Settings](https://github.com/settings/developers)にアクセス
2. 「New OAuth App」をクリック
3. 以下の情報を入力：
   - Application name: Interview App
   - Homepage URL: http://localhost:3000（本番環境では実際のURL）
   - Authorization callback URL: http://localhost:3000/api/auth/github/callback
4. Client IDとClient Secretを環境変数に設定

### GitHub連携機能

- **リポジトリアクセス**: ユーザーのGitHubリポジトリを閲覧・管理
- **イシュー作成**: 面談内容に基づいたタスクをGitHub Issuesに作成
- **PR作成**: コード変更の提案をPull Requestとして作成
- **Actions連携**: CI/CDワークフローの実行とモニタリング

### 利用可能なAPIエンドポイント

- `GET /api/auth/github` - GitHub OAuth認証開始
- `GET /api/v1/github/repositories` - リポジトリ一覧取得
- `GET /api/v1/github/workflows` - ワークフロー実行履歴取得
- `POST /api/v1/github/workflows` - ワークフロー手動実行

## 🏗 プロジェクト構造

```
interview_app/
├── .github/
│   └── workflows/           # GitHub Actions ワークフロー
│       ├── ci.yml          # CI/テスト
│       ├── deploy.yml      # デプロイ
│       └── codeql.yml      # セキュリティ分析
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API Routes
│   │   ├── chat/            # チャットページ
│   │   ├── dashboard/       # ダッシュボード
│   │   └── upload/          # アップロードページ
│   ├── components/          # Reactコンポーネント
│   ├── lib/                 # ユーティリティ関数
│   ├── types/               # TypeScript型定義
│   └── hooks/               # カスタムフック
├── supabase/
│   └── migrations/          # データベースマイグレーション
└── public/                  # 静的ファイル
```

## 🔒 セキュリティ

- エンドツーエンド暗号化によるデータ保護
- Row Level Security (RLS)による細かなアクセス制御
- 環境変数による機密情報の管理
- セッションタイムアウト機能

## 🚀 デプロイ

### Vercelへのデプロイ

1. Vercelアカウントを作成
2. GitHubリポジトリと連携
3. 環境変数を設定
4. デプロイを実行

```bash
vercel --prod
```

## 📝 今後の改善点

- [ ] リアルタイム通知機能
- [ ] 多言語対応（i18n）
- [ ] モバイルアプリ版
- [ ] 音声・ビデオ面談機能
- [ ] より高度な分析レポート
- [ ] ATS（採用管理システム）との統合

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容を議論してください。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

- OpenAI - GPT-4 API
- Supabase - バックエンドインフラストラクチャ
- Vercel - ホスティングプラットフォーム
- コミュニティの皆様
