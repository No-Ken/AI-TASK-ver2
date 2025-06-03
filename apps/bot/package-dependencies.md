# AI秘書TASK - Dependencies

AI秘書TASKの全機能（SNSスクレイピング・画像OCR）を実装するために、以下の依存関係を`apps/bot/package.json`に追加してください：

## 依存関係

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "sharp": "^0.33.0",
    "tesseract.js": "^5.0.0"
  },
  "devDependencies": {
    "@types/cheerio": "^0.22.35",
    "@types/sharp": "^0.32.0"
  }
}
```

## 環境変数

`.env`ファイルに以下の環境変数を追加してください：

```bash
# Instagram API (オプション - 使用する場合)
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token

# Rate limiting settings (オプション)
SNS_SCRAPER_RATE_LIMIT_MS=1000
SNS_SCRAPER_TIMEOUT_MS=10000

# OCR API設定 (いずれか一つまたは複数を設定)
GOOGLE_VISION_API_KEY=your_google_vision_api_key
AZURE_CV_ENDPOINT=your_azure_computer_vision_endpoint
AZURE_CV_KEY=your_azure_computer_vision_key
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_TEXTRACT_ENABLED=true

# OCR設定 (オプション)
OCR_MAX_FILE_SIZE_MB=4
OCR_CACHE_EXPIRY_HOURS=24
OCR_MAX_COST_PER_IMAGE=2.0
```

## 注意事項

### SNS機能
1. **Instagram API**: 現在の実装はHTMLスクレイピングベースですが、本格運用時はInstagram Basic Display APIの取得を推奨
2. **Rate Limiting**: Instagram/TikTokの利用規約に従い、適切なレート制限を設定
3. **User Agent**: 適切なUser-Agentを設定してリクエストを行う
4. **Error Handling**: ネットワークエラーやパース失敗時の適切なエラーハンドリング
5. **Privacy**: 取得したデータの適切な取り扱いとプライバシー保護

### OCR機能
1. **API選択**: 複数のOCR API対応（Google Vision、Azure CV、AWS Textract、Tesseract）
2. **コスト管理**: 各APIのコスト制限設定、前処理による最適化でコスト削減
3. **画像制限**: 最大4MB、対応フォーマット（PNG、JPEG、WebP）
4. **キャッシュ**: 同一画像の重複処理を避けるため24時間キャッシュ
5. **プライバシー**: 画像データは処理後即座に削除、テキストのみ保存

## 使用方法

### SNS機能
```typescript
import { snsScraperService } from './services/sns-scraper.service';

// Instagram投稿をスクレイピング
const instagramPost = await snsScraperService.scrapePost('https://www.instagram.com/p/ABC123/');

// TikTok投稿をスクレイピング  
const tiktokPost = await snsScraperService.scrapePost('https://www.tiktok.com/@user/video/123456');

// プラットフォーム判定
const platform = snsScraperService.detectPlatform(url); // 'instagram' | 'tiktok' | null
```

### OCR機能
```typescript
import { imageOCRService } from './services/image-ocr.service';

// 画像からテキスト抽出（基本）
const ocrResult = await imageOCRService.extractTextFromImage(imageBuffer);

// コスト制限とプロバイダー指定
const ocrResult = await imageOCRService.extractTextFromImage(imageBuffer, {
  preferredProvider: 'tesseract', // フリーで使用
  maxCost: 1.0, // 最大1ドル
  contextHint: 'sns_screenshot' // SNSスクリーンショットのヒント
});

// 利用可能なプロバイダーとコスト確認
const providers = imageOCRService.getAvailableProviders();
const estimatedCost = imageOCRService.getCostEstimate('googleVision');
```

### メモ作成（画像付き）
```typescript
import { memoService } from './services/memo.service';

// 画像からメモ作成（OCR自動実行）
const response = await memoService.processMessage({
  userId: 'user123',
  messageText: 'インスタのスクリーンショット保存して',
  imageBuffers: [imageBuffer1, imageBuffer2] // 複数画像対応
});
```