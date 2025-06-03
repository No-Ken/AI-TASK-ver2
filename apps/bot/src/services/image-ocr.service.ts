import axios from 'axios';
import sharp from 'sharp';
import { createHash } from 'crypto';

/**
 * OCR処理結果の共通インターフェース
 */
export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  blocks: TextBlock[];
  metadata: {
    imageWidth: number;
    imageHeight: number;
    processingTime: number;
    optimizationApplied: string[];
    estimatedCost?: number;
  };
}

export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type: 'paragraph' | 'line' | 'word';
}

/**
 * SNS別の画像レイアウト情報
 */
export interface SNSLayout {
  platform: 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'youtube' | 'general';
  confidence: number;
  textRegions: Array<{
    name: string;
    region: { x: number; y: number; width: number; height: number };
    priority: number;
  }>;
  skipRegions: Array<{
    name: string;
    region: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * 画像前処理オプション
 */
export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  grayscale: boolean;
  contrast: number;
  brightness: number;
  sharpen: boolean;
  removeNoise: boolean;
}

/**
 * コスト効率的な画像OCRサービス
 * 前処理による画像最適化とSNS別レイアウト解析でOCRコストを削減
 */
export class ImageOCRService {
  private readonly maxFileSize = 4 * 1024 * 1024; // 4MB
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24時間
  private readonly ocrCache = new Map<string, { result: OCRResult; timestamp: number }>();
  
  // OCR API設定（複数プロバイダー対応）
  private readonly ocrProviders = {
    googleVision: {
      enabled: !!process.env.GOOGLE_VISION_API_KEY,
      costPerImage: 1.5, // USD per 1000 images
      accuracy: 0.95,
    },
    azureCV: {
      enabled: !!process.env.AZURE_CV_KEY,
      costPerImage: 1.0,
      accuracy: 0.93,
    },
    awsTextract: {
      enabled: !!process.env.AWS_TEXTRACT_ENABLED,
      costPerImage: 1.5,
      accuracy: 0.92,
    },
    tesseract: {
      enabled: true, // フォールバック用
      costPerImage: 0.0,
      accuracy: 0.85,
    },
  };

  constructor() {
    // キャッシュクリーンアップを定期実行
    setInterval(() => this.cleanupCache(), 60 * 60 * 1000); // 1時間ごと
  }

  /**
   * 画像からテキストを抽出（メイン処理）
   */
  async extractTextFromImage(
    imageBuffer: Buffer,
    options: {
      preferredProvider?: string;
      maxCost?: number;
      forceReprocess?: boolean;
      contextHint?: string;
    } = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // 画像ハッシュでキャッシュチェック
      const imageHash = this.generateImageHash(imageBuffer);
      
      if (!options.forceReprocess) {
        const cached = this.getCachedResult(imageHash);
        if (cached) {
          return cached;
        }
      }

      // 画像バリデーション
      this.validateImage(imageBuffer);

      // SNSプラットフォーム判定
      const layout = await this.detectSNSLayout(imageBuffer);
      
      // 画像前処理・最適化
      const optimizedImage = await this.optimizeImageForOCR(imageBuffer, layout);
      
      // 最適なOCRプロバイダー選択
      const provider = this.selectOptimalProvider(options);
      
      // OCR実行
      const ocrResult = await this.performOCR(optimizedImage, provider, layout);
      
      // 結果の後処理
      const finalResult = await this.postProcessOCRResult(ocrResult, layout, {
        processingTime: Date.now() - startTime,
        imageHash,
        provider,
      });

      // キャッシュに保存
      this.cacheResult(imageHash, finalResult);
      
      return finalResult;

    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR処理に失敗しました: ${error.message}`);
    }
  }

  /**
   * SNSプラットフォームを画像から判定
   */
  private async detectSNSLayout(imageBuffer: Buffer): Promise<SNSLayout> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 0, height = 0 } = metadata;
      
      // アスペクト比による判定
      const aspectRatio = width / height;
      
      // Instagram Stories (9:16)
      if (aspectRatio >= 0.5 && aspectRatio <= 0.6) {
        return {
          platform: 'instagram',
          confidence: 0.9,
          textRegions: [
            { name: 'caption', region: { x: 0.05, y: 0.7, width: 0.9, height: 0.25 }, priority: 1 },
            { name: 'username', region: { x: 0.05, y: 0.02, width: 0.6, height: 0.08 }, priority: 2 },
            { name: 'location', region: { x: 0.05, y: 0.1, width: 0.7, height: 0.05 }, priority: 3 },
          ],
          skipRegions: [
            { name: 'ui_elements', region: { x: 0.85, y: 0.02, width: 0.15, height: 0.15 } },
          ],
        };
      }
      
      // TikTok (9:16)
      if (aspectRatio >= 0.55 && aspectRatio <= 0.65) {
        return {
          platform: 'tiktok',
          confidence: 0.85,
          textRegions: [
            { name: 'description', region: { x: 0.05, y: 0.75, width: 0.7, height: 0.2 }, priority: 1 },
            { name: 'username', region: { x: 0.05, y: 0.85, width: 0.5, height: 0.06 }, priority: 2 },
            { name: 'hashtags', region: { x: 0.05, y: 0.91, width: 0.9, height: 0.08 }, priority: 3 },
          ],
          skipRegions: [
            { name: 'sidebar', region: { x: 0.85, y: 0.3, width: 0.15, height: 0.4 } },
            { name: 'bottom_ui', region: { x: 0, y: 0.95, width: 1, height: 0.05 } },
          ],
        };
      }
      
      // Twitter/X (1.91:1 or square)
      if (aspectRatio >= 0.9 && aspectRatio <= 2.1) {
        return {
          platform: 'twitter',
          confidence: 0.8,
          textRegions: [
            { name: 'tweet_text', region: { x: 0.05, y: 0.15, width: 0.9, height: 0.6 }, priority: 1 },
            { name: 'username', region: { x: 0.05, y: 0.05, width: 0.6, height: 0.08 }, priority: 2 },
            { name: 'timestamp', region: { x: 0.7, y: 0.05, width: 0.25, height: 0.05 }, priority: 3 },
          ],
          skipRegions: [
            { name: 'avatar', region: { x: 0.02, y: 0.02, width: 0.08, height: 0.12 } },
            { name: 'action_buttons', region: { x: 0, y: 0.85, width: 1, height: 0.15 } },
          ],
        };
      }

      // YouTube (16:9)
      if (aspectRatio >= 1.7 && aspectRatio <= 1.9) {
        return {
          platform: 'youtube',
          confidence: 0.75,
          textRegions: [
            { name: 'title', region: { x: 0.02, y: 0.75, width: 0.96, height: 0.1 }, priority: 1 },
            { name: 'description', region: { x: 0.02, y: 0.85, width: 0.7, height: 0.13 }, priority: 2 },
            { name: 'channel', region: { x: 0.02, y: 0.88, width: 0.4, height: 0.05 }, priority: 3 },
          ],
          skipRegions: [
            { name: 'video_player', region: { x: 0, y: 0, width: 1, height: 0.7 } },
          ],
        };
      }

      // 一般的なスクリーンショット
      return {
        platform: 'general',
        confidence: 0.5,
        textRegions: [
          { name: 'main_content', region: { x: 0.05, y: 0.1, width: 0.9, height: 0.8 }, priority: 1 },
        ],
        skipRegions: [],
      };

    } catch (error) {
      console.error('SNS layout detection failed:', error);
      return {
        platform: 'general',
        confidence: 0.3,
        textRegions: [
          { name: 'full_image', region: { x: 0, y: 0, width: 1, height: 1 }, priority: 1 },
        ],
        skipRegions: [],
      };
    }
  }

  /**
   * 画像をOCR用に最適化
   */
  private async optimizeImageForOCR(
    imageBuffer: Buffer,
    layout: SNSLayout
  ): Promise<{ buffer: Buffer; optimizations: string[] }> {
    const optimizations: string[] = [];
    
    try {
      let image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      // サイズ最適化（解像度 vs コスト のバランス）
      const maxDimension = 2048; // OCRに十分な解像度
      if (metadata.width! > maxDimension || metadata.height! > maxDimension) {
        image = image.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true,
        });
        optimizations.push('resize');
      }
      
      // グレースケール変換（テキスト抽出が目的なので色情報は不要）
      image = image.grayscale();
      optimizations.push('grayscale');
      
      // コントラスト強化（文字を読みやすく）
      image = image.normalize();
      optimizations.push('normalize');
      
      // シャープ化（文字のエッジを強調）
      image = image.sharpen();
      optimizations.push('sharpen');
      
      // ノイズ除去（JPEG圧縮ノイズなど）
      image = image.median(3);
      optimizations.push('denoise');
      
      // 関心領域のみを抽出（SNSレイアウトベース）
      if (layout.platform !== 'general' && layout.textRegions.length > 0) {
        const primaryRegion = layout.textRegions[0];
        const { region } = primaryRegion;
        
        // 相対座標を絶対座標に変換
        const left = Math.round(metadata.width! * region.x);
        const top = Math.round(metadata.height! * region.y);
        const width = Math.round(metadata.width! * region.width);
        const height = Math.round(metadata.height! * region.height);
        
        image = image.extract({ left, top, width, height });
        optimizations.push(`crop_${primaryRegion.name}`);
      }
      
      // 最終的な品質最適化
      const buffer = await image
        .png({ 
          quality: 90,
          compressionLevel: 6,
        })
        .toBuffer();
      
      return { buffer, optimizations };

    } catch (error) {
      console.error('Image optimization failed:', error);
      // フォールバック：元の画像をそのまま使用
      return { buffer: imageBuffer, optimizations: ['fallback'] };
    }
  }

  /**
   * 最適なOCRプロバイダーを選択
   */
  private selectOptimalProvider(options: {
    preferredProvider?: string;
    maxCost?: number;
  }): string {
    const { preferredProvider, maxCost = 10.0 } = options;
    
    // 明示的な指定がある場合
    if (preferredProvider && this.ocrProviders[preferredProvider]?.enabled) {
      return preferredProvider;
    }
    
    // コスト制限に基づく選択
    const availableProviders = Object.entries(this.ocrProviders)
      .filter(([_, config]) => config.enabled && config.costPerImage <= maxCost)
      .sort((a, b) => b[1].accuracy - a[1].accuracy); // 精度順
    
    if (availableProviders.length === 0) {
      return 'tesseract'; // フォールバック
    }
    
    return availableProviders[0][0];
  }

  /**
   * 実際のOCR処理を実行
   */
  private async performOCR(
    imageData: { buffer: Buffer; optimizations: string[] },
    provider: string,
    layout: SNSLayout
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    switch (provider) {
      case 'googleVision':
        return await this.performGoogleVisionOCR(imageData.buffer, layout);
      
      case 'azureCV':
        return await this.performAzureOCR(imageData.buffer, layout);
      
      case 'awsTextract':
        return await this.performAWSTextract(imageData.buffer, layout);
      
      case 'tesseract':
      default:
        return await this.performTesseractOCR(imageData.buffer, layout);
    }
  }

  /**
   * Google Vision API でOCR
   */
  private async performGoogleVisionOCR(imageBuffer: Buffer, layout: SNSLayout): Promise<OCRResult> {
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
        {
          requests: [{
            image: {
              content: imageBuffer.toString('base64'),
            },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 100 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            ],
            imageContext: {
              languageHints: ['ja', 'en'],
            },
          }],
        }
      );

      const annotations = response.data.responses[0];
      const fullText = annotations.fullTextAnnotation?.text || '';
      const textAnnotations = annotations.textAnnotations || [];

      const blocks: TextBlock[] = textAnnotations.slice(1).map((annotation: any) => ({
        text: annotation.description,
        confidence: 0.9, // Google Vision は詳細な信頼度を返さない
        boundingBox: {
          x: annotation.boundingPoly.vertices[0].x || 0,
          y: annotation.boundingPoly.vertices[0].y || 0,
          width: (annotation.boundingPoly.vertices[2].x || 0) - (annotation.boundingPoly.vertices[0].x || 0),
          height: (annotation.boundingPoly.vertices[2].y || 0) - (annotation.boundingPoly.vertices[0].y || 0),
        },
        type: 'word' as const,
      }));

      return {
        text: fullText,
        confidence: 0.95,
        language: 'ja',
        blocks,
        metadata: {
          imageWidth: 0,
          imageHeight: 0,
          processingTime: 0,
          optimizationApplied: [],
          estimatedCost: this.ocrProviders.googleVision.costPerImage / 1000,
        },
      };

    } catch (error) {
      console.error('Google Vision OCR failed:', error);
      throw error;
    }
  }

  /**
   * Azure Computer Vision でOCR
   */
  private async performAzureOCR(imageBuffer: Buffer, layout: SNSLayout): Promise<OCRResult> {
    try {
      const endpoint = process.env.AZURE_CV_ENDPOINT;
      const key = process.env.AZURE_CV_KEY;

      const response = await axios.post(
        `${endpoint}/vision/v3.2/read/analyze`,
        imageBuffer,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/octet-stream',
          },
          params: {
            language: 'ja',
          },
        }
      );

      // Azure Read API は非同期なので結果を取得
      const operationLocation = response.headers['operation-location'];
      const operationId = operationLocation.split('/').pop();

      // 結果を取得（ポーリング）
      let result;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultResponse = await axios.get(
          `${endpoint}/vision/v3.2/read/analyzeResults/${operationId}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': key,
            },
          }
        );

        if (resultResponse.data.status === 'succeeded') {
          result = resultResponse.data;
          break;
        }
      }

      if (!result) {
        throw new Error('Azure OCR processing timeout');
      }

      const readResults = result.analyzeResult.readResults[0];
      const fullText = readResults.lines.map((line: any) => line.text).join('\n');
      
      const blocks: TextBlock[] = readResults.lines.map((line: any) => ({
        text: line.text,
        confidence: 0.93,
        boundingBox: {
          x: Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 0)),
          y: Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 1)),
          width: Math.max(...line.boundingBox.filter((_: any, i: number) => i % 2 === 0)) - 
                 Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 0)),
          height: Math.max(...line.boundingBox.filter((_: any, i: number) => i % 2 === 1)) - 
                  Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 1)),
        },
        type: 'line' as const,
      }));

      return {
        text: fullText,
        confidence: 0.93,
        language: 'ja',
        blocks,
        metadata: {
          imageWidth: readResults.width,
          imageHeight: readResults.height,
          processingTime: 0,
          optimizationApplied: [],
          estimatedCost: this.ocrProviders.azureCV.costPerImage / 1000,
        },
      };

    } catch (error) {
      console.error('Azure OCR failed:', error);
      throw error;
    }
  }

  /**
   * Tesseract でOCR（フォールバック用）
   */
  private async performTesseractOCR(imageBuffer: Buffer, layout: SNSLayout): Promise<OCRResult> {
    try {
      // Tesseract.js を使用（実際の実装では適切にインストール）
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker();
      
      await worker.loadLanguage('jpn+eng');
      await worker.initialize('jpn+eng');
      
      const { data } = await worker.recognize(imageBuffer);
      await worker.terminate();

      const blocks: TextBlock[] = data.words.map((word: any) => ({
        text: word.text,
        confidence: word.confidence / 100,
        boundingBox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
        type: 'word' as const,
      }));

      return {
        text: data.text,
        confidence: data.confidence / 100,
        language: 'ja',
        blocks,
        metadata: {
          imageWidth: 0,
          imageHeight: 0,
          processingTime: 0,
          optimizationApplied: [],
          estimatedCost: 0,
        },
      };

    } catch (error) {
      console.error('Tesseract OCR failed:', error);
      // 最終フォールバック
      return {
        text: '',
        confidence: 0,
        language: 'ja',
        blocks: [],
        metadata: {
          imageWidth: 0,
          imageHeight: 0,
          processingTime: 0,
          optimizationApplied: [],
          estimatedCost: 0,
        },
      };
    }
  }

  /**
   * AWS Textract でOCR
   */
  private async performAWSTextract(imageBuffer: Buffer, layout: SNSLayout): Promise<OCRResult> {
    try {
      // AWS SDK実装（実際の環境では適切に設定）
      // import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
      
      const response = await axios.post('https://textract.amazonaws.com/', {
        Document: {
          Bytes: imageBuffer.toString('base64'),
        },
        FeatureTypes: ['TABLES', 'FORMS'],
      }, {
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 ${process.env.AWS_ACCESS_KEY_ID}`,
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Textract.DetectDocumentText',
        },
      });

      const blocks = response.data.Blocks || [];
      const textBlocks = blocks
        .filter((block: any) => block.BlockType === 'LINE')
        .map((block: any) => ({
          text: block.Text,
          confidence: block.Confidence / 100,
          boundingBox: {
            x: Math.round(block.Geometry.BoundingBox.Left * 1000),
            y: Math.round(block.Geometry.BoundingBox.Top * 1000),
            width: Math.round(block.Geometry.BoundingBox.Width * 1000),
            height: Math.round(block.Geometry.BoundingBox.Height * 1000),
          },
          type: 'line' as const,
        }));

      const fullText = textBlocks.map((block: any) => block.text).join('\n');

      return {
        text: fullText,
        confidence: 0.92,
        language: 'ja',
        blocks: textBlocks,
        metadata: {
          imageWidth: 0,
          imageHeight: 0,
          processingTime: 0,
          optimizationApplied: [],
          estimatedCost: this.ocrProviders.awsTextract.costPerImage / 1000,
        },
      };

    } catch (error) {
      console.error('AWS Textract OCR failed:', error);
      throw error;
    }
  }

  /**
   * OCR結果の後処理
   */
  private async postProcessOCRResult(
    ocrResult: OCRResult,
    layout: SNSLayout,
    metadata: { processingTime: number; imageHash: string; provider: string }
  ): Promise<OCRResult> {
    
    // テキストクリーンアップ
    const cleanedText = this.cleanupExtractedText(ocrResult.text, layout);
    
    // メタデータ更新
    ocrResult.text = cleanedText;
    ocrResult.metadata.processingTime = metadata.processingTime;
    
    return ocrResult;
  }

  /**
   * 抽出されたテキストをクリーンアップ
   */
  private cleanupExtractedText(text: string, layout: SNSLayout): string {
    let cleaned = text;
    
    // 一般的なノイズ除去
    cleaned = cleaned
      .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303Fa-zA-Z0-9\s\.,!?@#$%&()[\]{}":;]/g, '') // 不要な文字除去
      .replace(/\s+/g, ' ') // 空白の正規化
      .replace(/\n\s*\n/g, '\n') // 空行の除去
      .trim();
    
    // SNS特有のUI要素を除去
    const uiPatterns = [
      /\d+\s*(いいね|likes?|❤️|♥️)/gi,
      /\d+\s*(コメント|comments?|💬)/gi,
      /\d+\s*(シェア|shares?|🔄)/gi,
      /\d+\s*(再生|views?|👀)/gi,
      /(フォロー|follow|following)/gi,
      /(ストーリー|story|stories)/gi,
      /もっと見る/gi,
      /See more/gi,
    ];
    
    for (const pattern of uiPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    return cleaned.trim();
  }

  /**
   * 画像のハッシュを生成（キャッシュ用）
   */
  private generateImageHash(imageBuffer: Buffer): string {
    return createHash('md5').update(imageBuffer).digest('hex');
  }

  /**
   * キャッシュから結果を取得
   */
  private getCachedResult(imageHash: string): OCRResult | null {
    const cached = this.ocrCache.get(imageHash);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result;
    }
    return null;
  }

  /**
   * 結果をキャッシュに保存
   */
  private cacheResult(imageHash: string, result: OCRResult): void {
    this.ocrCache.set(imageHash, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * 期限切れキャッシュをクリーンアップ
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.ocrCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.ocrCache.delete(key);
      }
    }
  }

  /**
   * 画像の妥当性を検証
   */
  private validateImage(imageBuffer: Buffer): void {
    if (imageBuffer.length === 0) {
      throw new Error('画像データが空です');
    }
    
    if (imageBuffer.length > this.maxFileSize) {
      throw new Error(`画像サイズが大きすぎます（最大: ${this.maxFileSize / 1024 / 1024}MB）`);
    }
    
    // 画像フォーマットの確認
    const header = imageBuffer.subarray(0, 12);
    const isPNG = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    const isJPEG = header.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]));
    const isWebP = header.subarray(0, 4).equals(Buffer.from('RIFF', 'ascii')) && 
                   header.subarray(8, 12).equals(Buffer.from('WEBP', 'ascii'));
    
    if (!isPNG && !isJPEG && !isWebP) {
      throw new Error('サポートされていない画像フォーマットです（PNG, JPEG, WebP のみ対応）');
    }
  }

  /**
   * コスト見積もりを取得
   */
  getCostEstimate(provider: string): number {
    return this.ocrProviders[provider]?.costPerImage || 0;
  }

  /**
   * 利用可能なプロバイダー一覧を取得
   */
  getAvailableProviders(): Array<{ name: string; cost: number; accuracy: number }> {
    return Object.entries(this.ocrProviders)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({
        name,
        cost: config.costPerImage,
        accuracy: config.accuracy,
      }));
  }
}

export const imageOCRService = new ImageOCRService();