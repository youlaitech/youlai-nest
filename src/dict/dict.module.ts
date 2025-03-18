import { Module } from "@nestjs/common";
import { DictService } from "./dict.service";
import { DictController } from "./dict.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { dictSchema } from "./dict.schema";
const DictTable = MongooseModule.forFeature([{ name: "Dicts", schema: dictSchema }]);
@Module({
  imports: [DictTable],
  controllers: [DictController],
  providers: [DictService],
})
export class DictModule {}
