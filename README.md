# LINE秘書 TASK

LINE上で動作する多機能AIアシスタントサービス

## 🚀 プロジェクト概要

LINE秘書TASKは、個人とグループの活動を支援する情報管理、タスク実行、コミュニケーション促進、外部サービス連携を提供するLINEボットサービスです。

### 主要機能
- 📝 **メモ機能** - LINEメッセージから自動的にメモを作成
  - 公式LINEへのメッセージをメモとして保存
  - グループトークの内容をメモ化
  - AIによる内容解析とタグ付け
- 📅 スケジュール・タスク管理
- 💰 割り勘計算・管理
- 👥 グループ機能
- 🔗 外部サービス連携

## 📋 必要条件

- Node.js 18.0.0以上
- pnpm 8.0.0以上
- Google Cloud Platform アカウント
- LINE Developers アカウント
- Firebase プロジェクト

## 🛠️ セットアップ

### 1. リポジトリのクローン

```bash
git clone [repository-url]
cd AI秘書TASK
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. LINE Developer設定

1. [LINE Developers Console](https://developers.line.biz/console/)にアクセス
2. 新しいプロバイダーを作成
3. Messaging APIチャンネルを作成
4. チャンネルアクセストークンを発行
5. Webhook URLを設定（後述）
6. LIFFアプリを作成

### 4. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Firestoreデータベースを有効化
3. サービスアカウントキーをダウンロード
4. 認証を有効化（Custom Token認証）

### 5. 環境変数の設定

```bash
# apps/bot/.env を作成
cp apps/bot/.env.example apps/bot/.env
```

以下の環境変数を設定：

```env
# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
LIFF_ID=your_liff_id

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceaccount.json

# Google AI
GEMINI_API_KEY=your_gemini_api_key

# Application URLs
BOT_WEBHOOK_URL=https://your-domain.com/webhook
LIFF_APP_URL=https://your-domain.com/liff
```

### 6. 開発サーバーの起動

```bash
# すべてのアプリケーションを起動
pnpm dev

# 個別に起動
pnpm --filter @line-secretary/bot dev
```

## 📁 プロジェクト構造

```
AI秘書TASK/
├── apps/
│   ├── bot/          # LINE Bot アプリケーション
│   ├── worker/       # バックグラウンドワーカー
│   ├── liff/         # LIFF フロントエンド
│   └── liff-api/     # LIFF用APIサーバー
├── packages/
│   ├── shared/       # 共通型定義・ユーティリティ
│   ├── database/     # データベースアクセス層
│   └── line-sdk/     # LINE SDK ラッパー
├── infrastructure/
│   ├── terraform/    # インフラ定義
│   └── docker/       # Docker設定
└── docs/            # ドキュメント
```

## 🔧 開発コマンド

```bash
# ビルド
pnpm build

# テスト実行
pnpm test

# リント
pnpm lint

# 型チェック
pnpm typecheck

# フォーマット
pnpm format
```

## 🚀 デプロイ

### Google Cloud Runへのデプロイ

```bash
# Dockerイメージのビルド
docker build -t gcr.io/[PROJECT_ID]/line-secretary-bot:latest .

# イメージのプッシュ
docker push gcr.io/[PROJECT_ID]/line-secretary-bot:latest

# Cloud Runへデプロイ
gcloud run deploy line-secretary-bot \
  --image gcr.io/[PROJECT_ID]/line-secretary-bot:latest \
  --platform managed \
  --region asia-northeast1
```

## 📖 ドキュメント

- [プロジェクト概要](./LINE秘書_プロジェクト概要.md)
- [MVP開発計画](./MVP開発計画.md)
- [データベース設計書](./データベース設計書.md)
- [実装ガイド](./実装ガイド_注意事項.md)
- [機能一覧](./機能一覧_要件定義.md)
- [詳細設計書](./詳細設計書.md)

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容について議論してください。

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。