import { Module, OnModuleInit } from "@nestjs/common";
import { GenService } from "./gen.service";
import { GenController } from "./gen.controller";

@Module({
  controllers: [GenController],
  providers: [GenService],
})
export class GenModule implements OnModuleInit {
  constructor(private readonly genService: GenService) {}

  async onModuleInit() {
    await this.genService.loadAllCollections();
  }
}
