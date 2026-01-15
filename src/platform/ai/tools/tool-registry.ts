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
  // 工具注册表：按 function name 保存可调用的工具定义。
  private readonly tools = new Map<string, ToolDefinition>();

  // 注册可被模型调用的工具。
  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  // 根据 function name 获取工具。
  get(name: string) {
    return this.tools.get(name);
  }

  // 列出所有工具，用于生成 tools payload。
  list() {
    return Array.from(this.tools.values());
  }
}
