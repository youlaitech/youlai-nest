import { Module } from "@nestjs/common";
import { DeptService } from "./dept.service";
import { DeptController } from "./dept.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { deptsSchema } from "./dept.schema";
const DepstrTable = MongooseModule.forFeature([{ name: "Depts", schema: deptsSchema }]);
@Module({
  imports: [DepstrTable],
  controllers: [DeptController],
  providers: [DeptService],
  exports: [DeptService],
})
export class DeptModule {}
