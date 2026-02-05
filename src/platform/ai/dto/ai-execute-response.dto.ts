/**
 * AI 执行响应
 */
export class AiExecuteResponseDto {
  success: boolean;
  data?: any;
  message?: string;
  affectedRows?: number;
  error?: string;
  recordId?: string;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}
