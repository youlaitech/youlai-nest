import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("ai_assistant_record")
export class AiAssistantRecord {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "user_id", type: "bigint", nullable: true, comment: "用户ID" })
  userId?: string | null;

  @Column({ length: 64, nullable: true, comment: "用户名" })
  username?: string | null;

  @Column({ name: "original_command", type: "text", nullable: true, comment: "原始命令" })
  originalCommand?: string | null;

  @Column({ name: "ai_provider", length: 32, nullable: true, comment: "AI 供应商" })
  aiProvider?: string | null;

  @Column({ name: "ai_model", length: 64, nullable: true, comment: "AI 模型名称" })
  aiModel?: string | null;

  @Column({
    name: "parse_status",
    type: "tinyint",
    default: 0,
    comment: "解析是否成功(0-失败, 1-成功)",
  })
  parseStatus?: number | null;

  @Column({
    name: "function_calls",
    type: "text",
    nullable: true,
    comment: "解析出的函数调用列表(JSON)",
  })
  functionCalls?: string | null;

  @Column({ length: 500, nullable: true, comment: "解析说明" })
  explanation?: string | null;

  @Column({ type: "decimal", precision: 3, scale: 2, nullable: true, comment: "置信度(0.00-1.00)" })
  confidence?: string | null;

  @Column({ name: "parse_error_message", type: "text", nullable: true, comment: "解析错误信息" })
  parseErrorMessage?: string | null;

  @Column({ name: "input_tokens", type: "int", nullable: true, comment: "输入Token数量" })
  inputTokens?: number | null;

  @Column({ name: "output_tokens", type: "int", nullable: true, comment: "输出Token数量" })
  outputTokens?: number | null;

  @Column({ name: "parse_duration_ms", type: "int", nullable: true, comment: "解析耗时(毫秒)" })
  parseDurationMs?: number | null;

  @Column({ name: "function_name", length: 255, nullable: true, comment: "执行的函数名称" })
  functionName?: string | null;

  @Column({ name: "function_arguments", type: "text", nullable: true, comment: "函数参数(JSON)" })
  functionArguments?: string | null;

  @Column({
    name: "execute_status",
    type: "tinyint",
    nullable: true,
    comment: "执行状态(0-待执行, 1-成功, -1-失败)",
  })
  executeStatus?: number | null;

  @Column({ name: "execute_error_message", type: "text", nullable: true, comment: "执行错误信息" })
  executeErrorMessage?: string | null;

  @Column({ name: "ip_address", length: 128, nullable: true, comment: "IP地址" })
  ipAddress?: string | null;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime?: Date | null;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime?: Date | null;
}
