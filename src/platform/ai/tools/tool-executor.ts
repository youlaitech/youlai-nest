import type { ToolRegistry, ToolContext } from "./tool-registry";

export class ToolExecutor {
  constructor(private readonly registry: ToolRegistry) {}

  // 根据 function name 分发执行。
  async execute(name: string, args: Record<string, any>, ctx: ToolContext) {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Unsupported function: ${name}`);
    }
    return await tool.execute(args || {}, ctx);
  }
}
