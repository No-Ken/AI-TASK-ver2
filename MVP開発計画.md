# LINE秘書 TASK MVP開発計画書

## 1. エグゼクティブサマリー

### 1.1 プロジェクト概要
LINE秘書「TASK」は、LINEをプラットフォームとして、AI（Google Gemini）の能力を活用し、日常やビジネスシーンにおけるコミュニケーションに伴う煩雑なタスク（日程調整、割り勘計算、情報メモ・整理）を自動化・効率化するサービスです。

### 1.2 MVP目標
- コア機能（割り勘、日程調整、個人メモ、共有メモ）を実装
- 実際のユーザーに利用してもらい、受容性と有効性を検証
- ユーザーフィードバックを収集し、将来的な改善・拡張の方向性を見出す

### 1.3 開発期間とリソース
- 開発期間：3ヶ月（2025年6月〜8月）
- 開発チーム：フルスタック開発者 2名、デザイナー 1名
- 予算：月額50万円以内（累計赤字上限300万円）

## 2. MVPスコープと機能仕様

### 2.1 割り勘機能

#### コア機能
- グループ/個人チャットでの割り勘プロジェクト作成・管理
- 支払い情報（支払者、金額、メモ）の記録
- **均等割り**に基づく自動計算と精算結果表示
- LINEユーザーおよび共有URLを介したゲスト（匿名認証）の参加

#### 操作方法
- LINEコマンド：`@TASK 割り勘`, `@TASK [金額]...`
- LIFFアプリでの詳細操作（メンバー管理、支払い記録、精算実行）

#### MVP除外項目
- 傾斜配分、複雑な貸し借り管理
- 送金機能との連携

### 2.2 日程調整機能

#### コア機能
- グループ/個人チャットでの調整開始
- 複数候補日時の提示
- メンバーによる回答（〇△✕＋コメント）
- 日程の確定

#### 操作方法
- LINEコマンド：`@TASK スケジュール`
- LIFFアプリでの投票・確認

#### MVP除外項目
- 外部カレンダー（Google/Outlook等）との連携・同期
- 空き時間の自動分析・提案
- オンライン会議URL自動発行
- 繰り返し予定設定
- 複雑な参加条件設定

### 2.3 個人メモ機能

#### コア機能
- 個人チャットでのコマンド（`@TASK メモ [内容]`）またはLIFFアプリからのテキストメモ作成・保存
- タグ付け、論理削除（`isArchived`）
- 3つのビュー（タイムライン順、ページ階層による構造化、関連性グラフ - MVP版）での閲覧
- AI連携：非同期でGemini APIを呼び出し、要約やタグ候補を生成

#### MVP除外項目
- 高度な自動分類・整理
- ファイル添付
- 全文検索
- リマインダー機能
- グループチャットでの個人メモ作成・更新

### 2.4 共有メモ機能

#### コア機能
- グループチャットでのコマンド（`@TASK 共有メモ [タイトル]`）によるメモ作成開始
- LIFFアプリ上での基本的なテキスト共同編集（リアルタイム同期なし）
- テンプレート利用（会議、外出）
- 編集者管理（作成者による追加/削除）
- 論理削除（`isArchived`）

#### アクセス権管理
- メモ作成時のグループメンバー、および後から招待/追加された編集者のみが読み書き可能
- `readableUserIds`で管理

#### AI連携
- ユーザーが更新コマンド（`@TASK 更新`等）を実行した際に、非同期でGemini APIが指定期間の会話ログを基に、テンプレート形式に合わせて内容を要約・構造化

#### MVP除外項目
- トーク履歴ファイルのアップロードからの自動作成
- リッチテキスト編集
- 高度な情報タグ
- リアルタイム共同編集

## 3. 技術アーキテクチャ

### 3.1 全体構成図

```
┌── LINE App ──┐   POST /webhook       ┌─────────────────┐ pub/sub  ┌────────────┐
│ user / group │ ────────────────────► │  Bot (apps/bot) │─────────►│ CloudTasks │
└──────────────┘                       └──────▲──────────┘          └────┬───────┘
                                              │ ACK / 202              │
                                   REST/JSON  │                        ▼
                                            Firestore   pull       Worker (apps/worker)
                                              │   ▲   Gemini API      │
                       Hosting (static)       │   │                   │
      browser ◄──────── LIFF SPA  ◄───────────┘   │◄──────────────────┘
```

### 3.2 技術スタック

#### 共通
- 言語：TypeScript
- モノレポ管理：pnpm ワークスペース, Turborepo
- スキーマ/バリデーション：Zod

#### バックエンド
- Runtime：Node.js, Express (on Cloud Run)
- データベース：Firebase Firestore
- 認証：Firebase Authentication (Custom Token via LINE Login)
- 非同期処理：Google Cloud Tasks
- AI：Google Gemini API (`gemini-2.0-flash-lite`)
- LINE連携：`@line/bot-sdk`

#### フロントエンド
- Framework：React, Vite
- スタイリング：Tailwind CSS (+ shadcn/ui 検討)
- 状態管理：Zustand
- ルーティング：React Router DOM v6
- データフェッチング：TanStack Query (React Query) v5
- APIクライアント：OpenAPI Generator (typescript-axios), Axios
- プラットフォーム連携：LIFF SDK

#### インフラ
- クラウド：Google Cloud Platform (GCP)
- IaC：Terraform
- CI/CD：GitHub Actions, Google Cloud Build

### 3.3 ディレクトリ構造

```
task-mvp/
├─ README.md
├─ .gitignore
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ apps/
│  ├─ bot/                 # LINE Messaging API エンドポイント
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ routers/
│  │  │  ├─ services/
│  │  │  ├─ adapters/
│  │  │  └─ utils/
│  │  ├─ Dockerfile
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  ├─ worker/              # Cloud Run Job で Gemini 呼び出し
│  │  ├─ src/
│  │  ├─ Dockerfile
│  │  └─ package.json
│  └─ liff/                # LIFF フロントエンド
│     ├─ src/
│     │  ├─ App.tsx
│     │  ├─ pages/
│     │  ├─ components/
│     │  ├─ hooks/
│     │  ├─ stores/
│     │  └─ api/
│     ├─ public/
│     ├─ vite.config.ts
│     └─ package.json
├─ libs/                   # 共有ライブラリ
│  └─ types/               # Firestore 型定義
├─ firestore/              # Firestore設定
│  ├─ firestore.rules
│  └─ indexes.yaml
├─ infra/                  # インフラ設定
│  ├─ terraform/
│  └─ cloudbuild.yaml
└─ docs/                   # ドキュメント
   └─ api/
```

## 4. データモデル設計

### 4.1 Firestoreコレクション構造

| コレクション | キー | 主要フィールド | サブコレクション |
|------------|------|--------------|----------------|
| `users` | `lineUserId` | `displayName`, `status`, `iconUrl` | - |
| `groups` | `lineGroupId` | `groupName`, `members` | - |
| `chatContexts` | `chatId` | `activeWarikanProjectId`, `activeSharedMemoId` | - |
| `warikanProjects` | 自動ID | `projectName`, `status`, `totalAmount`, `memberCount` | `warikanMembers`, `warikanPayments`, `warikanSettlements` |
| `schedules` | 自動ID | `title`, `status`, `candidateDates`, `confirmedDate` | `scheduleParticipants`, `scheduleVotes` |
| `personalMemos` | 自動ID | `content`, `tags[]`, `isArchived`, `aiAnalysis` | - |
| `memoPages` | 自動ID | `title`, `parentPageId` | - |
| `sharedMemos` | 自動ID | `title`, `content`, `template`, `readableUserIds[]`, `isArchived` | `sharedMemoEditors` |
| `messageLogs` | 自動ID | `messageId`, `chatId`, `chatType`, `userId`, `text`, `lineTimestamp` | - |

### 4.2 非正規化フィールド

パフォーマンス向上のため、以下のフィールドは意図的に重複保持：

- `warikanProjects`の`totalAmount`, `memberCount`：支払い追加/削除時に同時更新
- `sharedMemos`の`readableUserIds`：編集者追加/削除時に同時更新

## 5. LIFF アプリケーション設計

### 5.1 主要画面構成

```
/ (ホーム/ダッシュボード)
  ├─→ /warikan (割り勘プロジェクト一覧)
  │     └─→ /warikan/:projectId (割り勘プロジェクト詳細)
  ├─→ /schedule/:scheduleId (スケジュール詳細・投票)
  ├─→ /memo (個人メモ - タイムライン/構造/グラフビュー)
  │     └─→ /memo/edit/:memoId (メモ編集)
  └─→ /shared-memo/:memoId (共有メモ詳細・編集)
```

### 5.2 認証フロー

1. LIFF SDK初期化 (`liff.init()`)
2. LINEログイン状態確認 (`liff.isLoggedIn()`)
3. LINEアクセストークン取得 (`liff.getAccessToken()`)
4. バックエンドAPIでFirebaseカスタムトークン取得
5. Firebase Authentication でサインイン (`signInWithCustomToken()`)
6. 認証状態をZustandストアで管理

### 5.3 共通コンポーネント

- **入力系**: Button, Input, Textarea, Select, DatePicker
- **表示系**: Card, Dialog, Sheet, Avatar, Badge, Spinner, Alert
- **レイアウト系**: Container, Header, Footer, PageTitle

## 6. 開発タイムラインとマイルストーン

### Phase 1: 基盤構築（3週間）
**Week 1-3**
- [ ] S0: `libs/types` - Firestore型定義とZodスキーマ
- [ ] S1: Firestore Rules生成
- [ ] S2: Bot Webhook骨格実装
- [ ] S3: IntentRouter実装
- [ ] 基本的なCI/CDパイプライン構築

### Phase 2: コア機能実装（6週間）
**Week 4-5: 割り勘機能**
- [ ] S4: Warikan CRUD API実装
- [ ] S5: APIクライアント生成
- [ ] S6: Warikan UI実装

**Week 6-7: 日程調整機能**
- [ ] Schedule API実装
- [ ] Schedule UI実装
- [ ] 投票機能実装

**Week 8-9: メモ機能**
- [ ] Personal Memo API/UI実装
- [ ] Shared Memo API/UI実装
- [ ] S7: Gemini Summary Task実装

### Phase 3: 統合とテスト（3週間）
**Week 10-11**
- [ ] S8: Rate Limiter実装
- [ ] 全機能の統合テスト
- [ ] パフォーマンス最適化

**Week 12**
- [ ] S9: E2Eテスト実装
- [ ] ユーザー受け入れテスト
- [ ] デプロイ準備

## 7. MVP成功指標

### 7.1 技術的指標
- Bot応答レイテンシ：< 800ms
- エラーレート：< 1%
- 日次アクティブユーザー：100人以上

### 7.2 ビジネス指標
- ユーザー登録数：1,000人
- 機能利用率：各機能最低20%
- ユーザー満足度：NPS 30以上

### 7.3 コスト指標
- 月間API利用料：5万円以内
- インフラコスト：3万円以内

## 8. 実装アプローチ

### 8.1 開発原則
- **1 Pull Request = 1 ステップ**：段階的な実装
- **AIコーディング活用**：Context 200行以内で指示
- **テスト駆動開発**：各機能に対するユニットテスト実装
- **早期リリース**：2週間ごとのイテレーション

### 8.2 API利用最適化（コスト削減）
- Gemini 2.0 Flash-Lite使用（無料枠：30RPM, 1,500RPD）
- レスポンスキャッシング
- バッチ処理による効率化
- 段階的な処理（必要時のみAI呼び出し）

### 8.3 セキュリティ考慮事項
- LINE署名検証必須
- Firebase Authによる認証
- Firestore Rulesによる厳格なアクセス制御
- レート制限実装
- 環境変数でのシークレット管理（Secret Manager使用）

## 9. テスト戦略

### 9.1 ユニットテスト
- 各Service/Repository層のロジックテスト
- Zodスキーマ検証テスト
- カバレッジ目標：80%以上

### 9.2 統合テスト
- API エンドポイントテスト
- Firestore操作テスト
- LINE Webhook処理テスト

### 9.3 E2Eテスト
- Playwrightによる主要フローテスト
  - 割り勘作成〜精算フロー
  - 日程調整〜確定フロー
  - メモ作成〜AI処理フロー

### 9.4 パフォーマンステスト
- 同時接続数：100ユーザー
- レスポンスタイム測定
- API呼び出し回数モニタリング

## 10. リスクと対策

### 10.1 技術的リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| Gemini APIレート制限 | 高 | Cloud Tasksによるキューイング、レート制御 |
| Firestoreコスト超過 | 中 | 非正規化、効率的なクエリ設計 |
| LIFF環境制約 | 中 | Progressive Web App化の検討 |

### 10.2 ビジネスリスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| ユーザー獲得困難 | 高 | 早期ベータテスト、フィードバック収集 |
| プライバシー懸念 | 高 | 明確なプライバシーポリシー、オプトイン設計 |
| 競合サービス | 中 | 差別化機能の早期実装 |

## 11. Post-MVP拡張計画

### 機能拡張
- 外部カレンダー連携（Google Calendar, Outlook）
- 高度な割り勘計算（傾斜配分、個別設定）
- ファイル添付、画像OCR機能
- リアルタイム共同編集
- 音声メモ、音声認識機能

### プラットフォーム拡張
- Web版（LINE外からのアクセス）
- スマートフォンアプリ化
- 他SNS対応（Facebook, Instagram）

### ビジネスモデル
- 有料プラン設計（プロプラン）
- API利用量に基づく従量課金
- 企業向けプラン

## 12. 運用・保守計画

### 12.1 監視項目
- Cloud Monitoring：CPU/メモリ使用率、リクエスト数、エラーレート
- Cloud Logging：構造化ログ収集、エラー追跡
- カスタムメトリクス：API呼び出し回数、機能利用率

### 12.2 アラート設定
- エラーレート > 5%
- レスポンスタイム > 2秒
- API呼び出し数が日次上限の80%到達

### 12.3 バックアップ・リカバリ
- Firestoreの日次バックアップ
- 設定ファイルのバージョン管理
- ロールバック手順の文書化

## 13. プライバシーとコンプライアンス

### 13.1 データ収集と利用
- 収集データ：メッセージ内容、送信者、時刻
- 利用目的：共有メモの自動生成、サービス改善
- 保存期間：6ヶ月（MVP期間中）

### 13.2 ユーザー同意
- 初回利用時の同意画面実装
- プライバシーポリシーの明示
- データ削除リクエスト対応

### 13.3 セキュリティ対策
- 通信の暗号化（HTTPS必須）
- データの暗号化（保存時）
- アクセスログの記録

---

## 付録A: API仕様概要

### Bot API エンドポイント
- `POST /webhook` - LINE Webhook受信
- `POST /api/v1/auth/firebase-token` - Firebaseトークン生成
- `GET/POST /api/v1/warikan/*` - 割り勘関連API
- `GET/POST /api/v1/schedules/*` - 日程調整関連API
- `GET/POST /api/v1/personal-memos/*` - 個人メモ関連API
- `GET/POST /api/v1/shared-memos/*` - 共有メモ関連API

### Worker処理
- Geminiメモ要約タスク
- 共有メモ構造化タスク

---

## 付録B: 開発環境セットアップ

```bash
# リポジトリクローン
git clone https://github.com/your-org/task-mvp.git
cd task-mvp

# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集

# ローカル開発サーバー起動
pnpm dev

# テスト実行
pnpm test

# ビルド
pnpm build
```

---

本ドキュメントは開発の進捗に応じて随時更新されます。
最終更新日：2025年6月2日