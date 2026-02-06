export interface ToolContext {
  currentUser?: {
    userId?: string;
    username?: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>, ctx: ToolContext) => Promise<any>;
}

export class ToolRegistry {
  // 工具注册表
  private readonly tools = new Map<string, ToolDefinition>();

  // 注册工具
  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  // 获取工具
  get(name: string) {
    return this.tools.get(name);
  }

  // 列出所有工具
  list() {
    return Array.from(this.tools.values());
  }
}
