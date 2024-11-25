import { Module } from '@nestjs/common';
import { DictService } from './dict.service';
import { DictController } from './dict.controller';
import { DictDataController } from './dict-data.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { dictItemSchema, dictSchema } from './schemas/dict.schemas';
const DictsTable = MongooseModule.forFeature([
  { name: 'Dicts', schema: dictSchema },
]);
const DictItemsTable = MongooseModule.forFeature([
  { name: 'DictItems', schema: dictItemSchema },
]);
@Module({
  imports: [DictsTable, DictItemsTable],
  controllers: [DictController, DictDataController],
  providers: [DictService],
})
export class DictModule {}
