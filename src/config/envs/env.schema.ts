import { plainToInstance } from "class-transformer";
import { IsEnum, IsNumber, IsString, validateSync } from "class-validator";

enum Environment {
  Dev = "dev",
  Prod = "prod",
}

class EnvSchema {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  API_VERSION: string;
}

export function validateEnv(config: Record<string, any>) {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated);
  if (errors.length) {
    throw new Error(`环境变量校验失败: ${errors}`);
  }

  return validated;
}
