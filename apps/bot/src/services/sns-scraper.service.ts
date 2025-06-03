import axios from 'axios';
import * as cheerio from 'cheerio';
import { URLSearchParams } from 'url';

/**
 * SNS投稿データの共通インターフェース
 */
export interface SNSPost {
  platform: 'instagram' | 'tiktok';
  postId: string;
  url: string;
  author: {
    username: string;
    displayName?: string;
    profileImage?: string;
    verified?: boolean;
  };
  content: {
    caption?: string;
    description?: string;
    hashtags: string[];
    mentions: string[];
  };
  media: {
    type: 'image' | 'video' | 'carousel';
    thumbnailUrl?: string;
    mediaUrls: string[];
    duration?: number; // 動画の場合（秒）
  };
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  postedAt: Date;
  scrapedAt: Date;
}

/**
 * SNSリンク解析・スクレイピングサービス
 * Instagram APIとTikTokスクレイピングを統合
 */
export class SNSScraperService {
  private instagramAccessToken?: string;
  private readonly userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';

  constructor() {
    this.instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  /**
   * URLからプラットフォームを判定
   */
  detectPlatform(url: string): 'instagram' | 'tiktok' | null {
    const normalizedUrl = url.toLowerCase();
    
    if (normalizedUrl.includes('instagram.com')) {
      return 'instagram';
    }
    
    if (normalizedUrl.includes('tiktok.com') || normalizedUrl.includes('vm.tiktok.com')) {
      return 'tiktok';
    }
    
    return null;
  }

  /**
   * SNS投稿データを取得（プラットフォーム自動判定）
   */
  async scrapePost(url: string): Promise<SNSPost | null> {
    const platform = this.detectPlatform(url);
    
    if (!platform) {
      throw new Error('Unsupported platform. Only Instagram and TikTok are supported.');
    }

    try {
      switch (platform) {
        case 'instagram':
          return await this.scrapeInstagramPost(url);
        case 'tiktok':
          return await this.scrapeTikTokPost(url);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error scraping ${platform} post:`, error);
      throw error;
    }
  }

  /**
   * Instagram投稿をスクレイピング（Instagram Basic Display API使用）
   */
  private async scrapeInstagramPost(url: string): Promise<SNSPost | null> {
    try {
      // URLからpost IDを抽出
      const postId = this.extractInstagramPostId(url);
      
      if (!postId) {
        throw new Error('Invalid Instagram URL');
      }

      // Instagram Basic Display API (公開投稿のみ)
      // 実際の実装では、Instagram Graph APIやInstagram Basic Display APIを使用
      // ここではスクレイピングベースのフォールバック実装
      const response = await axios.get(`${url}?__a=1&__d=dis`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 10000,
      });

      // HTMLパースによるフォールバック
      if (response.headers['content-type']?.includes('text/html')) {
        return await this.parseInstagramHTML(response.data, url, postId);
      }

      // JSON APIレスポンスの場合
      const data = response.data;
      if (data?.graphql?.shortcode_media) {
        return this.parseInstagramAPIResponse(data.graphql.shortcode_media, url, postId);
      }

      throw new Error('Unable to parse Instagram post data');

    } catch (error) {
      console.error('Instagram scraping error:', error);
      // フォールバック: HTMLスクレイピング
      return await this.scrapeInstagramHTML(url);
    }
  }

  /**
   * Instagram HTMLスクレイピング（フォールバック）
   */
  private async scrapeInstagramHTML(url: string): Promise<SNSPost | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 10000,
      });

      return await this.parseInstagramHTML(response.data, url, this.extractInstagramPostId(url) || '');
    } catch (error) {
      console.error('Instagram HTML scraping failed:', error);
      return null;
    }
  }

  /**
   * Instagram HTMLをパース
   */
  private async parseInstagramHTML(html: string, url: string, postId: string): Promise<SNSPost | null> {
    const $ = cheerio.load(html);
    
    // JSON-LDからデータを抽出
    const jsonLdScript = $('script[type="application/ld+json"]').first().html();
    let structuredData: any = null;
    
    if (jsonLdScript) {
      try {
        structuredData = JSON.parse(jsonLdScript);
      } catch (e) {
        console.warn('Failed to parse JSON-LD data');
      }
    }

    // メタデータから情報を抽出
    const title = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    
    // ユーザー名を抽出
    const usernameMatch = title.match(/^(.+?) on Instagram:/);
    const username = usernameMatch ? usernameMatch[1] : '';

    // ハッシュタグとメンションを抽出
    const hashtags = this.extractHashtags(description);
    const mentions = this.extractMentions(description);

    // 位置情報を抽出（可能な場合）
    const locationElement = $('a[href*="/explore/locations/"]').first();
    const locationName = locationElement.text().trim();

    return {
      platform: 'instagram',
      postId,
      url,
      author: {
        username: username,
        displayName: username,
        profileImage: undefined, // HTMLからは取得困難
        verified: false, // HTMLからは取得困難
      },
      content: {
        caption: description,
        hashtags,
        mentions,
      },
      media: {
        type: 'image', // HTMLからは詳細判定が困難
        thumbnailUrl: image,
        mediaUrls: image ? [image] : [],
      },
      location: locationName ? {
        name: locationName,
      } : undefined,
      engagement: {
        likes: undefined, // HTMLからは取得困難
        comments: undefined,
        shares: undefined,
      },
      postedAt: new Date(), // HTMLからは正確な投稿時間取得が困難
      scrapedAt: new Date(),
    };
  }

  /**
   * Instagram API JSONレスポンスをパース
   */
  private parseInstagramAPIResponse(media: any, url: string, postId: string): SNSPost {
    const mediaType = media.__typename === 'GraphVideo' ? 'video' : 
                     media.__typename === 'GraphSidecar' ? 'carousel' : 'image';

    const mediaUrls: string[] = [];
    if (media.edge_sidecar_to_children?.edges) {
      // カルーセル投稿
      media.edge_sidecar_to_children.edges.forEach((edge: any) => {
        if (edge.node.display_url) {
          mediaUrls.push(edge.node.display_url);
        }
      });
    } else if (media.display_url) {
      mediaUrls.push(media.display_url);
    }

    const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || '';
    const hashtags = this.extractHashtags(caption);
    const mentions = this.extractMentions(caption);

    return {
      platform: 'instagram',
      postId,
      url,
      author: {
        username: media.owner.username,
        displayName: media.owner.full_name,
        profileImage: media.owner.profile_pic_url,
        verified: media.owner.is_verified,
      },
      content: {
        caption,
        hashtags,
        mentions,
      },
      media: {
        type: mediaType,
        thumbnailUrl: media.display_url,
        mediaUrls,
        duration: media.video_duration,
      },
      location: media.location ? {
        name: media.location.name,
        latitude: media.location.lat,
        longitude: media.location.lng,
        address: media.location.address_json ? JSON.parse(media.location.address_json) : undefined,
      } : undefined,
      engagement: {
        likes: media.edge_media_preview_like?.count,
        comments: media.edge_media_to_comment?.count,
        views: media.video_view_count,
      },
      postedAt: new Date(media.taken_at_timestamp * 1000),
      scrapedAt: new Date(),
    };
  }

  /**
   * TikTok投稿をスクレイピング
   */
  private async scrapeTikTokPost(url: string): Promise<SNSPost | null> {
    try {
      // TikTokの短縮URLを展開
      const expandedUrl = await this.expandTikTokUrl(url);
      const postId = this.extractTikTokPostId(expandedUrl);
      
      if (!postId) {
        throw new Error('Invalid TikTok URL');
      }

      const response = await axios.get(expandedUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 15000,
      });

      return await this.parseTikTokHTML(response.data, expandedUrl, postId);

    } catch (error) {
      console.error('TikTok scraping error:', error);
      return null;
    }
  }

  /**
   * TikTok短縮URLを展開
   */
  private async expandTikTokUrl(url: string): Promise<string> {
    if (url.includes('vm.tiktok.com')) {
      try {
        const response = await axios.head(url, {
          maxRedirects: 5,
          headers: {
            'User-Agent': this.userAgent,
          },
        });
        return response.request.res.responseUrl || url;
      } catch (error) {
        console.warn('Failed to expand TikTok URL:', error);
        return url;
      }
    }
    return url;
  }

  /**
   * TikTok HTMLをパース
   */
  private async parseTikTokHTML(html: string, url: string, postId: string): Promise<SNSPost | null> {
    const $ = cheerio.load(html);
    
    // Next.jsのデータから抽出
    const nextDataScript = $('#__NEXT_DATA__').html();
    let nextData: any = null;
    
    if (nextDataScript) {
      try {
        nextData = JSON.parse(nextDataScript);
        const itemStruct = nextData?.props?.pageProps?.itemInfo?.itemStruct;
        
        if (itemStruct) {
          return this.parseTikTokItemStruct(itemStruct, url, postId);
        }
      } catch (e) {
        console.warn('Failed to parse TikTok Next.js data');
      }
    }

    // メタタグからフォールバック
    const title = $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    const video = $('meta[property="og:video"]').attr('content') || '';

    // ユーザー名を抽出
    const usernameMatch = title.match(/@([^'s\s]+)/);
    const username = usernameMatch ? usernameMatch[1] : '';

    const hashtags = this.extractHashtags(description);
    const mentions = this.extractMentions(description);

    return {
      platform: 'tiktok',
      postId,
      url,
      author: {
        username: username,
        displayName: username,
      },
      content: {
        description,
        hashtags,
        mentions,
      },
      media: {
        type: 'video',
        thumbnailUrl: image,
        mediaUrls: video ? [video] : [],
      },
      engagement: {},
      postedAt: new Date(), // HTMLからは正確な投稿時間取得が困難
      scrapedAt: new Date(),
    };
  }

  /**
   * TikTok itemStructデータをパース
   */
  private parseTikTokItemStruct(itemStruct: any, url: string, postId: string): SNSPost {
    const author = itemStruct.author || {};
    const video = itemStruct.video || {};
    const music = itemStruct.music || {};
    const stats = itemStruct.stats || {};

    const caption = itemStruct.desc || '';
    const hashtags = this.extractHashtags(caption);
    const mentions = this.extractMentions(caption);

    return {
      platform: 'tiktok',
      postId,
      url,
      author: {
        username: author.uniqueId,
        displayName: author.nickname,
        profileImage: author.avatarMedium || author.avatarThumb,
        verified: author.verified,
      },
      content: {
        description: caption,
        hashtags,
        mentions,
      },
      media: {
        type: 'video',
        thumbnailUrl: video.cover || video.dynamicCover,
        mediaUrls: [video.playAddr],
        duration: video.duration,
      },
      engagement: {
        likes: stats.diggCount,
        comments: stats.commentCount,
        shares: stats.shareCount,
        views: stats.playCount,
      },
      postedAt: new Date(itemStruct.createTime * 1000),
      scrapedAt: new Date(),
    };
  }

  /**
   * Instagram Post IDを抽出
   */
  private extractInstagramPostId(url: string): string | null {
    const match = url.match(/\/p\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * TikTok Post IDを抽出
   */
  private extractTikTokPostId(url: string): string | null {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * ハッシュタグを抽出
   */
  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
    return hashtags.map(tag => tag.substring(1)); // #を除去
  }

  /**
   * メンションを抽出
   */
  private extractMentions(text: string): string[] {
    const mentions = text.match(/@[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
    return mentions.map(mention => mention.substring(1)); // @を除去
  }

  /**
   * スクレイピング可能性をチェック
   */
  async checkAccessibility(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * レート制限対応のためのクールダウン
   */
  private async cooldown(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const snsScraperService = new SNSScraperService();