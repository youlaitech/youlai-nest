import { Module } from "@nestjs/common";
import { DictService } from "./dict.service";
import { DictController } from "./dict.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { dictSchema } from "./dict.schema";
import { dictItemaSchema } from "./dict.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Dict", schema: dictSchema }]),
    MongooseModule.forFeature([{ name: "DictItem", schema: dictItemaSchema }]),
  ],
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
