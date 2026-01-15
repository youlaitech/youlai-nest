import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiAssistantController } from "./ai-assistant.controller";
import { AiAssistantService } from "./ai-assistant.service";
import { AiAssistantRecord } from "./entities/ai-assistant-record.entity";
import { OpenAiClientService } from "./openai/openai-client.service";
import { UserToolsService } from "./tools/user-tools.service";
import { SysUser } from "src/system/user/entities/sys-user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AiAssistantRecord, SysUser])],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, OpenAiClientService, UserToolsService],
})
export class AiModule {}
