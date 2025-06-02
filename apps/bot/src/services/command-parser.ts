export type CommandType = 'warikan' | 'schedule' | 'memo' | 'help' | 'unknown';

export interface Command {
  type: CommandType;
  args: string[];
  raw: string;
}

class CommandParser {
  private commandMap: Map<string, CommandType> = new Map([
    ['割り勘', 'warikan'],
    ['わりかん', 'warikan'],
    ['割勘', 'warikan'],
    ['予定', 'schedule'],
    ['スケジュール', 'schedule'],
    ['メモ', 'memo'],
    ['memo', 'memo'],
    ['ヘルプ', 'help'],
    ['help', 'help'],
  ]);
  
  parse(text: string): Command {
    const trimmed = text.trim();
    
    // Check if message starts with @
    if (!trimmed.startsWith('@')) {
      return {
        type: 'unknown',
        args: [],
        raw: text,
      };
    }
    
    // Remove @ and split by spaces
    const withoutAt = trimmed.substring(1);
    const parts = withoutAt.split(/\s+/);
    const commandText = parts[0];
    const args = parts.slice(1);
    
    const type = this.commandMap.get(commandText) || 'unknown';
    
    return {
      type,
      args,
      raw: text,
    };
  }
}

export const commandParser = new CommandParser();