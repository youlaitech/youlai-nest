import axios from "axios";
import { readFileSync } from "fs";
import { join } from "path";

import { BusinessException } from "../exceptions/business.exception";

/** 提示词目录，各模块的 md 提示词集中放在动态表单模块下 */
const PROMPTS_DIR = ["src", "form", "templates"];

/**
 * 读取提示词文件。
 */
export function loadPrompt(name: string): string {
  return readFileSync(join(process.cwd(), ...PROMPTS_DIR, ...name.split("/")), "utf-8").trim();
}

/**
 * 调用 AI 对话接口，返回去掉代码围栏的文本内容。
 */
export async function chat(systemPrompt: string, userPrompt: string): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "qwen-plus";
  const timeout = Number(process.env.AI_TIMEOUT_MS) > 0 ? Number(process.env.AI_TIMEOUT_MS) : 60000;

  if (!baseUrl || !apiKey) {
    throw new BusinessException("AI 功能未开启，请配置 AI_BASE_URL 与 AI_API_KEY");
  }

  const response = await axios.post(
    `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout,
    },
  );

  return stripCodeFence(response.data?.choices?.[0]?.message?.content ?? "");
}

/**
 * 调用 AI 对话接口，把返回内容解析为对象。
 */
export async function chatJson<T = Record<string, any>>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const content = await chat(systemPrompt, userPrompt);
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new BusinessException("AI 返回内容非合法 JSON，请重试");
  }
}

/**
 * 去掉模型输出里可能包裹的 json 代码围栏。
 */
function stripCodeFence(content: string): string {
  const text = (content || "").trim();
  if (!text.startsWith("```")) {
    return text;
  }
  const start = text.indexOf("\n");
  const end = text.lastIndexOf("```");
  if (start === -1 || end <= start) {
    return text;
  }
  return text.slice(start + 1, end).trim();
}
