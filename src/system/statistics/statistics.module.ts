import { Module } from "@nestjs/common";
import { StatisticsController } from "./statistics.controller";
import { LogModule } from "../log/log.module";

@Module({
  imports: [LogModule],
  controllers: [StatisticsController],
})
export class StatisticsModule {}
