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
