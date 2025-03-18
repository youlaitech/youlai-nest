import { Module } from "@nestjs/common";
import { DictDataService } from "./dict-data.service";
import { DictDataController } from "./dict-data.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { dictDataSchema } from "./dict-data.schema";
const DictDataTable = MongooseModule.forFeature([{ name: "DictData", schema: dictDataSchema }]);
@Module({
  imports: [DictDataTable],
  controllers: [DictDataController],
  providers: [DictDataService],
})
export class DictModule {}
