import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigController } from "./config.controller";
import { ConfigService } from "./config.service";
import { SysConfig } from "./entities/sys-config.entity";
import { RedisSharedModule } from "../../common/redis/redis.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysConfig]), RedisSharedModule],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
