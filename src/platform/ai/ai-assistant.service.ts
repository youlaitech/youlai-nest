import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";

import { AiAssistantRecord } from "./entities/ai-assistant-record.entity";
import { AiParseRequestDto } from "./dto/ai-parse-request.dto";
import { AiParseResponseDto } from "./dto/ai-parse-response.dto";
import { AiExecuteRequestDto } from "./dto/ai-execute-request.dto";
import { AiExecuteResponseDto } from "./dto/ai-execute-response.dto";
import { AiAssistantQueryDto } from "./dto/ai-assistant-query.dto";

import { OpenAiClientService } from "./openai/openai-client.service";
import { ToolRegistry } from "./tools/tool-registry";
import { ToolExecutor } from "./tools/tool-executor";
import { UserToolsService } from "./tools/user-tools.service";

/**
 * AI 助手服务
 */
@Injectable()
export class AiAssistantService {
  // 工具注册表：集中声明模型可调用的函数
  private readonly registry = new ToolRegistry();
  // 工具执行器：根据 functionCall.name 分发到具体实现
  private readonly executor = new ToolExecutor(this.registry);

  private inferProvider(): string {
    const baseUrlRaw = this.configService.get<string>("AI_BASE_URL") || "";
    const baseUrl = baseUrlRaw.toLowerCase();
    if (baseUrl.includes("dashscope") || baseUrl.includes("aliyuncs")) return "qwen";
    if (baseUrl.includes("deepseek")) return "deepseek";
    if (baseUrl.includes("openai")) return "openai";
    if (baseUrl.includes("gemini") || baseUrl.includes("google")) return "gemini";
    return "openai";
  }

  constructor(
    @InjectRepository(AiAssistantRecord)
    private readonly recordRepository: Repository<AiAssistantRecord>,
    private readonly openAiClient: OpenAiClientService,
    private readonly configService: ConfigService,
    private readonly userTools: UserToolsService
  ) {
    // 示例工具：修改用户昵称（前端 useAiAction 已内置同名 handler）
    this.registry.register({
      name: "updateUserNickname",
      description: "Update a user's nickname by username",
      parameters: {
        type: "object",
        properties: {
          username: { type: "string", description: "username" },
          nickname: { type: "string", description: "new nickname" },
        },
        required: ["username", "nickname"],
      },
      execute: async (args) => {
        return await this.userTools.updateUserNickname(args.username, args.nickname);
      },
    });

    // 示例工具：查询用户（前端会识别为 query/get/list/search 类函数，并跳转自动搜索）
    this.registry.register({
      name: "queryUser",
      description: "Search users by keywords (frontend will navigate and auto-search)",
      parameters: {
        type: "object",
        properties: {
          keywords: { type: "string", description: "search keywords" },
        },
        required: ["keywords"],
      },
      execute: async (args) => {
        return { keywords: args.keywords };
      },
    });
  }

  private getIpAddress(req: any): string {
    const xff = (req?.headers?.["x-forwarded-for"] as string) || "";
    const realIp = xff.split(",")[0]?.trim();
    return realIp || req?.ip || req?.connection?.remoteAddress || "";
  }

  private buildToolsForOpenAi() {
    // 将工具注册表转换为 OpenAI-compatible tools payload。
    return this.registry.list().map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  async parseCommand(request: AiParseRequestDto, httpRequest: any, currentUser?: any) {
    const start = Date.now();
    const command = (request?.command || "").trim();

    if (!command) {
      const out: AiParseResponseDto = {
        success: false,
        functionCalls: [],
        error: "命令不能为空",
      };
      return out;
    }

    const userId = currentUser?.userId ? String(currentUser.userId) : null;
    const username = currentUser?.username ? String(currentUser.username) : null;
    const ipAddress = this.getIpAddress(httpRequest);

    // parse 阶段先落一条记录，后续 execute 可通过 parseLogId 复用
    const record = this.recordRepository.create({
      userId,
      username,
      originalCommand: command,
      ipAddress,
      aiProvider: this.inferProvider(),
      aiModel: this.configService.get<string>("AI_MODEL") || null,
      createTime: new Date(),
      updateTime: new Date(),
    });

    try {
      const tools = this.buildToolsForOpenAi();

      // system prompt 约束模型仅在匹配工具时才调用。
      const systemPrompt =
        "You are an enterprise operations assistant. Decide which tool(s) to call based on the user's command. If no tool matches, do not call any tool.";

      const userPrompt = JSON.stringify({
        command,
        currentRoute: request.currentRoute,
        currentComponent: request.currentComponent,
        context: request.context || {},
      });

      const resp = await this.openAiClient.chatCompletions({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      });

      const raw = JSON.stringify(resp);
      const choice = resp?.choices?.[0];
      const toolCalls = choice?.message?.tool_calls || [];

      // 将 tool_calls 统一为 functionCalls，便于前端与记录落库。
      const functionCalls = (toolCalls || []).map((c: any) => {
        const fn = c?.function || {};
        const name = String(fn.name || "");
        const tool = this.registry.get(name);
        let args: any = {};
        try {
          args = fn.arguments ? JSON.parse(fn.arguments) : {};
        } catch {
          args = {};
        }
        return {
          name,
          description: tool?.description,
          arguments: args,
        };
      });

      const provider = this.inferProvider();
      const model = resp?.model || this.configService.get<string>("AI_MODEL") || null;
      const usage = resp?.usage || {};

      record.aiProvider = provider;
      record.aiModel = model;
      record.parseStatus = functionCalls.length > 0 ? 1 : 0;
      record.functionCalls = JSON.stringify(functionCalls);
      record.explanation = choice?.message?.content
        ? String(choice.message.content).slice(0, 500)
        : null;
      record.confidence = null;
      record.parseErrorMessage = functionCalls.length > 0 ? null : "无法识别命令";
      record.inputTokens = usage.prompt_tokens ?? null;
      record.outputTokens = usage.completion_tokens ?? null;
      record.parseDurationMs = Date.now() - start;
      record.updateTime = new Date();

      const saved = await this.recordRepository.save(record);

      const out: AiParseResponseDto = {
        parseLogId: saved.id?.toString(),
        success: functionCalls.length > 0,
        functionCalls,
        explanation: record.explanation || undefined,
        confidence: undefined,
        error: functionCalls.length > 0 ? undefined : record.parseErrorMessage || undefined,
        rawResponse: raw,
      };
      return out;
    } catch (e: any) {
      record.parseStatus = 0;
      record.functionCalls = JSON.stringify([]);
      record.parseErrorMessage = e?.message || "命令解析失败";
      record.parseDurationMs = Date.now() - start;
      record.updateTime = new Date();
      const saved = await this.recordRepository.save(record);

      const out: AiParseResponseDto = {
        parseLogId: saved.id?.toString(),
        success: false,
        functionCalls: [],
        error: record.parseErrorMessage || "命令解析失败",
      };
      return out;
    }
  }

  async executeCommand(request: AiExecuteRequestDto, httpRequest: any, currentUser?: any) {
    const fnCall = request?.functionCall;
    if (!fnCall?.name) {
      const out: AiExecuteResponseDto = { success: false, error: "functionCall.name is required" };
      return out;
    }

    const userId = currentUser?.userId ? String(currentUser.userId) : null;
    const username = currentUser?.username ? String(currentUser.username) : null;
    const ipAddress = this.getIpAddress(httpRequest);

    let record: AiAssistantRecord;
    if (request.parseLogId) {
      record = await this.recordRepository.findOne({ where: { id: String(request.parseLogId) } });
      if (!record) {
        throw new Error(`未找到对应的解析记录，ID: ${request.parseLogId}`);
      }
    } else {
      record = this.recordRepository.create({
        userId,
        username,
        originalCommand: request.originalCommand || null,
        ipAddress,
        aiProvider: this.inferProvider(),
        aiModel: this.configService.get<string>("AI_MODEL") || null,
        createTime: new Date(),
        updateTime: new Date(),
      });
      record = await this.recordRepository.save(record);
    }

    record.functionName = fnCall.name;
    record.functionArguments = JSON.stringify(fnCall.arguments || {});
    record.executeStatus = 0;
    record.updateTime = new Date();
    await this.recordRepository.save(record);

    const confirmMode = request.confirmMode || "auto";
    // manual 模式需用户确认后才执行。
    if (confirmMode === "manual" && request.userConfirmed !== true) {
      const out: AiExecuteResponseDto = {
        success: false,
        requiresConfirmation: true,
        confirmationPrompt: "需要用户确认后才能执行",
        recordId: record.id?.toString(),
      };
      return out;
    }

    try {
      const result = await this.executor.execute(fnCall.name, fnCall.arguments || {}, {
        currentUser: {
          userId: userId || undefined,
          username: username || undefined,
        },
      });

      record.executeStatus = 1;
      record.executeErrorMessage = null;
      record.updateTime = new Date();
      await this.recordRepository.save(record);

      const out: AiExecuteResponseDto = {
        success: true,
        data: result,
        message: "执行成功",
        recordId: record.id?.toString(),
      };
      return out;
    } catch (e: any) {
      record.executeStatus = -1;
      record.executeErrorMessage = e?.message || "执行失败";
      record.updateTime = new Date();
      await this.recordRepository.save(record);
      throw e;
    }
  }

  async getRecordPage(query: AiAssistantQueryDto) {
    const {
      pageNum,
      pageSize,
      keywords,
      executeStatus,
      parseStatus,
      userId,
      aiProvider,
      aiModel,
      functionName,
      createTime,
    } = query;

    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const qb = this.recordRepository.createQueryBuilder("r");

    if (keywords) {
      qb.andWhere(
        "(r.original_command LIKE :kw OR r.function_name LIKE :kw OR r.username LIKE :kw)",
        { kw: `%${keywords}%` }
      );
    }
    if (executeStatus !== undefined && executeStatus !== null) {
      qb.andWhere("r.execute_status = :executeStatus", { executeStatus });
    }
    if (parseStatus !== undefined && parseStatus !== null) {
      qb.andWhere("r.parse_status = :parseStatus", { parseStatus });
    }
    if (userId) {
      qb.andWhere("r.user_id = :userId", { userId: userId.toString() });
    }
    if (aiProvider) {
      qb.andWhere("r.ai_provider = :aiProvider", { aiProvider });
    }
    if (aiModel) {
      qb.andWhere("r.ai_model = :aiModel", { aiModel });
    }
    if (functionName) {
      qb.andWhere("r.function_name = :functionName", { functionName });
    }
    if (createTime && createTime.length === 2) {
      const startRaw = createTime[0];
      const endRaw = createTime[1];
      const start =
        typeof startRaw === "string" && startRaw.length === 10 ? `${startRaw} 00:00:00` : startRaw;
      const end =
        typeof endRaw === "string" && endRaw.length === 10 ? `${endRaw} 23:59:59` : endRaw;
      qb.andWhere("r.create_time BETWEEN :start AND :end", { start, end });
    }

    qb.orderBy("r.create_time", "DESC");

    const [records, total] = await qb
      .skip((pageNumSafe - 1) * pageSizeSafe)
      .take(pageSizeSafe)
      .getManyAndCount();

    const formatDateTime = (d?: Date | null) => {
      if (!d) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
    };

    const list = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.username,
      originalCommand: r.originalCommand,
      aiProvider: r.aiProvider,
      aiModel: r.aiModel,
      parseStatus: r.parseStatus,
      functionCalls: r.functionCalls,
      explanation: r.explanation,
      confidence: r.confidence ? Number(r.confidence) : null,
      parseErrorMessage: r.parseErrorMessage,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      parseDurationMs: r.parseDurationMs,
      functionName: r.functionName,
      functionArguments: r.functionArguments,
      executeStatus: r.executeStatus,
      executeErrorMessage: r.executeErrorMessage,
      ipAddress: r.ipAddress,
      createTime: formatDateTime(r.createTime),
      updateTime: formatDateTime(r.updateTime),
    }));

    return {
      data: list,
      page: {
        pageNum: pageNumSafe,
        pageSize: pageSizeSafe,
        total,
      },
    };
  }

  async deleteRecords(ids: string[]) {
    if (!ids?.length) return true;
    await this.recordRepository.delete(ids.map((v) => v.toString()));
    return true;
  }
}
