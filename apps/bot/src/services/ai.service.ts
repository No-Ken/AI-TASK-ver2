import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

interface MemoExtractionResult {
  title: string;
  content: string;
  tags: string[];
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.googleAI.geminiApiKey);
  }

  async extractMemoData(messageText: string): Promise<MemoExtractionResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
以下のメッセージからメモの情報を抽出してください。

メッセージ: "${messageText}"

以下のJSON形式で回答してください：
{
  "title": "適切なタイトル（30文字以内）",
  "content": "メモの本文",
  "tags": ["関連するタグ1", "関連するタグ2"]
}

注意点：
- タイトルは内容を簡潔に表現する
- タグは内容に関連する重要なキーワード（最大5個）
- JSON以外の文字は含めない
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // JSONをパース
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      return {
        title: parsed.title || 'untitled',
        content: parsed.content || messageText,
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      };
    } catch (error) {
      console.error('AI extraction failed:', error);
      
      // フォールバック処理
      const lines = messageText.replace(/@メモ\s*(作成)?/g, '').trim().split('\n');
      return {
        title: lines[0]?.substring(0, 30) || 'untitled',
        content: messageText,
        tags: this.extractHashtags(messageText)
      };
    }
  }

  async generateSummary(content: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
以下のメモ内容を日本語で簡潔に要約してください（100文字以内）：

${content}

要約は重要なポイントを含め、読みやすい文章にしてください。
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('AI summary generation failed:', error);
      throw error;
    }
  }

  async analyzeScheduleMessage(messageText: string): Promise<{
    title: string;
    description?: string;
    candidateDates: Array<{
      date: string;
      startTime?: string;
      endTime?: string;
    }>;
  }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
以下のメッセージから日程調整の情報を抽出してください：

メッセージ: "${messageText}"

以下のJSON形式で回答してください：
{
  "title": "イベントタイトル",
  "description": "説明（あれば）",
  "candidateDates": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:mm",
      "endTime": "HH:mm"
    }
  ]
}

注意点：
- 日付は YYYY-MM-DD 形式
- 時間は HH:mm 形式（24時間表記）
- 候補日が複数ある場合は配列で返す
- JSON以外の文字は含めない
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('AI schedule analysis failed:', error);
      throw error;
    }
  }

  async analyzeWarikanMessage(messageText: string): Promise<{
    name: string;
    totalAmount?: number;
    description?: string;
    items: Array<{
      name: string;
      amount: number;
    }>;
  }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
以下のメッセージから割り勘の情報を抽出してください：

メッセージ: "${messageText}"

以下のJSON形式で回答してください：
{
  "name": "割り勘プロジェクト名",
  "totalAmount": 合計金額（数値）,
  "description": "説明（あれば）",
  "items": [
    {
      "name": "品目名",
      "amount": 金額（数値）
    }
  ]
}

注意点：
- 金額は数値のみ（円記号や,は不要）
- 品目が複数ある場合は配列で返す
- JSON以外の文字は含めない
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('AI warikan analysis failed:', error);
      throw error;
    }
  }

  async generateHelpResponse(query: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
あなたはLINE秘書TASKというアプリのアシスタントです。
以下の機能について、ユーザーの質問に日本語で親切に回答してください：

利用可能な機能：
- 割り勘管理（@割り勘）
- 日程調整（@予定、@スケジュール） 
- メモ機能（@メモ）

ユーザーの質問: "${query}"

回答は300文字以内で、具体的な使用例も含めて説明してください。
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('AI help generation failed:', error);
      return 'ヘルプの生成に失敗しました。基本的な使い方は以下の通りです：\n\n@割り勘 - 割り勘を作成\n@予定 - 日程調整を作成\n@メモ - メモを作成';
    }
  }

  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#[^\s#]+/g) || [];
    return hashtags.map(tag => tag.substring(1));
  }
}

export const aiService = new AIService();