import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// OpenAI-compatible Chat Completions client
// 依赖环境变量：AI_BASE_URL / AI_API_KEY / AI_MODEL / AI_TIMEOUT_MS

type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface OpenAiTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, any>;
  };
}

/**
 * OpenAI-compatible 客户端
 */
@Injectable()
export class OpenAiClientService {
  constructor(private readonly configService: ConfigService) {}

  async chatCompletions(payload: {
    messages: ChatMessage[];
    tools?: OpenAiTool[];
    tool_choice?: "auto" | "none";
    temperature?: number;
  }) {
    const apiKey = this.configService.get<string>("AI_API_KEY") || "";
    const baseUrlRaw = this.configService.get<string>("AI_BASE_URL") || "https://api.openai.com/v1";
    // 补全 /v1
    let baseUrl = baseUrlRaw.replace(/\/+$/, "");
    if (!/\/v1$/i.test(baseUrl)) {
      baseUrl = `${baseUrl}/v1`;
    }
    const model = this.configService.get<string>("AI_MODEL") || "gpt-4o-mini";
    const timeoutMs = Number(this.configService.get<string>("AI_TIMEOUT_MS") || 20000);

    if (!apiKey) {
      throw new Error("Missing AI_API_KEY");
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // 请求 chat/completions
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          tools: payload.tools,
          tool_choice: payload.tool_choice,
          temperature: payload.temperature ?? 0.2,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `AI request failed: ${res.status}`);
      }

      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }
}
