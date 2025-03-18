import { Module } from "@nestjs/common";
import { DictDataService } from "./dict-data.service";
import { DictDataController } from "./dict-data.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { dictSchema } from "../dict/dict.schema";
import { dictDataSchema } from "./dict-data.schema";
import { DictModule } from "../dict/dict.module";

@Module({
  imports: [
    DictModule,
    MongooseModule.forFeature([{ name: "DictData", schema: dictDataSchema }]),
    MongooseModule.forFeature([{ name: "Dict", schema: dictSchema }]),
  ],
  controllers: [DictDataController],
  providers: [DictDataService],
  exports: [DictDataService],
})
export class DictDataModule {}
