import { TextMessage, FlexMessage } from '@line/bot-sdk';
import { Warikan, WarikanSchema, WarikanMember, formatUtils } from '@line-secretary/shared';
import { WarikanRepository } from '@line-secretary/database';
import { Command } from './command-parser';
import { userService } from './user';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';

export class WarikanService {
  private warikanRepository: WarikanRepository;
  
  constructor() {
    this.warikanRepository = new WarikanRepository();
  }
  
  async handleCommand(userId: string, command: Command): Promise<TextMessage> {
    try {
      const user = await userService.getUser(userId);
      if (!user) {
        return {
          type: 'text',
          text: 'ユーザー情報が見つかりません。もう一度お試しください。',
        };
      }
      
      await userService.incrementApiUsage(user.userId);
      
      const [subCommand, ...args] = command.args;
      
      switch (subCommand) {
        case '作成':
        case '新規':
          return this.createWarikan(user.userId, args);
          
        case 'リスト':
        case '一覧':
          return this.listWarikan(user.userId);
          
        case '詳細':
          return this.getWarikanDetail(args[0]);
          
        case '支払い':
        case '決済':
          return this.markAsPaid(args[0], user.userId);
          
        case '完了':
        case '終了':
          return this.settleWarikan(args[0], user.userId);
          
        default:
          // Default to create if only amount and count provided
          if (args.length >= 2) {
            return this.createWarikan(user.userId, command.args);
          }
          return this.getHelpMessage();
      }
    } catch (error) {
      logger.error('Warikan command error:', error);
      return {
        type: 'text',
        text: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
      };
    }
  }
  
  private async createWarikan(userId: string, args: string[]): Promise<TextMessage> {
    if (args.length < 2) {
      return {
        type: 'text',
        text: '使い方: @割り勘 [金額] [人数] [タイトル（省略可）]\n例: @割り勘 3000 4 飲み会',
      };
    }
    
    const totalAmount = parseInt(args[0], 10);
    const memberCount = parseInt(args[1], 10);
    const title = args.slice(2).join(' ') || '割り勘';
    
    if (isNaN(totalAmount) || isNaN(memberCount)) {
      return {
        type: 'text',
        text: '金額と人数は数字で入力してください。',
      };
    }
    
    if (totalAmount <= 0 || memberCount <= 0) {
      return {
        type: 'text',
        text: '金額と人数は正の数で入力してください。',
      };
    }
    
    if (memberCount > 20) {
      return {
        type: 'text',
        text: '人数は20人以下で入力してください。',
      };
    }
    
    const amountPerPerson = Math.ceil(totalAmount / memberCount);
    const warikanId = uuid();
    
    // Create default members (creator + others)
    const members: WarikanMember[] = [
      {
        userId,
        displayName: 'あなた',
        amount: amountPerPerson,
        isPaid: false,
      },
    ];
    
    // Add placeholder members
    for (let i = 1; i < memberCount; i++) {
      members.push({
        userId: `placeholder_${i}`,
        displayName: `メンバー${i + 1}`,
        amount: amountPerPerson,
        isPaid: false,
      });
    }
    
    const warikan: Warikan = WarikanSchema.parse({
      warikanId,
      createdBy: userId,
      title,
      totalAmount,
      currency: 'JPY',
      members,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await this.warikanRepository.createWithId(warikanId, warikan);
    
    return {
      type: 'text',
      text: `割り勘を作成しました！

📝 ${title}
💰 総額: ${formatUtils.currency(totalAmount)}
👥 人数: ${memberCount}人
💳 一人あたり: ${formatUtils.currency(amountPerPerson)}

ID: ${warikanId}

詳細確認: @割り勘 詳細 ${warikanId}
支払い完了: @割り勘 支払い ${warikanId}`,
    };
  }
  
  private async listWarikan(userId: string): Promise<TextMessage> {
    const warikans = await this.warikanRepository.findByCreator(userId, 'active', 10);
    
    if (warikans.length === 0) {
      return {
        type: 'text',
        text: 'アクティブな割り勘はありません。\n\n新規作成: @割り勘 [金額] [人数]',
      };
    }
    
    const list = warikans.map((w, index) => {
      const amountPerPerson = Math.ceil(w.totalAmount / w.members.length);
      const paidCount = w.members.filter(m => m.isPaid).length;
      
      return `${index + 1}. ${w.title}
💰 ${formatUtils.currency(w.totalAmount)} (${formatUtils.currency(amountPerPerson)}/人)
👥 ${paidCount}/${w.members.length}人支払い済み
🆔 ${w.warikanId}`;
    }).join('\n\n');
    
    return {
      type: 'text',
      text: `📋 割り勘一覧

${list}

詳細確認: @割り勘 詳細 [ID]
支払い完了: @割り勘 支払い [ID]`,
    };
  }
  
  private async getWarikanDetail(warikanId: string): Promise<TextMessage> {
    if (!warikanId) {
      return {
        type: 'text',
        text: '割り勘IDを指定してください。\n例: @割り勘 詳細 abc123',
      };
    }
    
    const warikan = await this.warikanRepository.findById(warikanId);
    if (!warikan) {
      return {
        type: 'text',
        text: '指定された割り勘が見つかりません。',
      };
    }
    
    const memberList = warikan.members.map(member => {
      const status = member.isPaid ? '✅' : '⏳';
      return `${status} ${member.displayName}: ${formatUtils.currency(member.amount)}`;
    }).join('\n');
    
    const paidCount = warikan.members.filter(m => m.isPaid).length;
    const totalPaid = warikan.members
      .filter(m => m.isPaid)
      .reduce((sum, m) => sum + m.amount, 0);
    
    return {
      type: 'text',
      text: `📝 ${warikan.title}

💰 総額: ${formatUtils.currency(warikan.totalAmount)}
👥 人数: ${warikan.members.length}人
📊 支払い状況: ${paidCount}/${warikan.members.length}人完了
💸 支払い済み: ${formatUtils.currency(totalPaid)}

👤 メンバー:
${memberList}

🆔 ID: ${warikan.warikanId}
📅 作成日: ${warikan.createdAt.toLocaleDateString('ja-JP')}

支払い完了: @割り勘 支払い ${warikan.warikanId}
割り勘終了: @割り勘 完了 ${warikan.warikanId}`,
    };
  }
  
  private async markAsPaid(warikanId: string, userId: string): Promise<TextMessage> {
    if (!warikanId) {
      return {
        type: 'text',
        text: '割り勘IDを指定してください。\n例: @割り勘 支払い abc123',
      };
    }
    
    const warikan = await this.warikanRepository.findById(warikanId);
    if (!warikan) {
      return {
        type: 'text',
        text: '指定された割り勘が見つかりません。',
      };
    }
    
    const member = warikan.members.find(m => m.userId === userId);
    if (!member) {
      return {
        type: 'text',
        text: 'この割り勘のメンバーではありません。',
      };
    }
    
    if (member.isPaid) {
      return {
        type: 'text',
        text: 'すでに支払い済みです。',
      };
    }
    
    await this.warikanRepository.markMemberPaid(warikanId, userId);
    
    const paidCount = warikan.members.filter(m => m.isPaid || m.userId === userId).length;
    const isAllPaid = paidCount === warikan.members.length;
    
    if (isAllPaid) {
      await this.warikanRepository.updateStatus(warikanId, 'settled');
    }
    
    return {
      type: 'text',
      text: `✅ 支払い完了しました！

📝 ${warikan.title}
💰 支払い金額: ${formatUtils.currency(member.amount)}
📊 進捗: ${paidCount}/${warikan.members.length}人完了

${isAllPaid ? '🎉 全員の支払いが完了しました！' : ''}`,
    };
  }
  
  private async settleWarikan(warikanId: string, userId: string): Promise<TextMessage> {
    if (!warikanId) {
      return {
        type: 'text',
        text: '割り勘IDを指定してください。\n例: @割り勘 完了 abc123',
      };
    }
    
    const warikan = await this.warikanRepository.findById(warikanId);
    if (!warikan) {
      return {
        type: 'text',
        text: '指定された割り勘が見つかりません。',
      };
    }
    
    if (warikan.createdBy !== userId) {
      return {
        type: 'text',
        text: '割り勘の作成者のみが終了できます。',
      };
    }
    
    if (warikan.status === 'settled') {
      return {
        type: 'text',
        text: 'この割り勘はすでに終了しています。',
      };
    }
    
    await this.warikanRepository.updateStatus(warikanId, 'settled');
    
    const paidCount = warikan.members.filter(m => m.isPaid).length;
    const totalPaid = warikan.members
      .filter(m => m.isPaid)
      .reduce((sum, m) => sum + m.amount, 0);
    
    return {
      type: 'text',
      text: `✅ 割り勘を終了しました

📝 ${warikan.title}
💰 総額: ${formatUtils.currency(warikan.totalAmount)}
💸 支払い済み: ${formatUtils.currency(totalPaid)}
📊 最終結果: ${paidCount}/${warikan.members.length}人完了

お疲れさまでした！`,
    };
  }
  
  private getHelpMessage(): TextMessage {
    return {
      type: 'text',
      text: `💰 割り勘機能の使い方

【新規作成】
@割り勘 [金額] [人数] [タイトル]
例: @割り勘 3000 4 飲み会

【一覧表示】
@割り勘 リスト

【詳細確認】
@割り勘 詳細 [ID]

【支払い完了】
@割り勘 支払い [ID]

【割り勘終了】
@割り勘 完了 [ID]`,
    };
  }
}

export const warikanService = new WarikanService();