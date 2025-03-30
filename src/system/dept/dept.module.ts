import { Module } from "@nestjs/common";
import { DeptService } from "./dept.service";
import { DeptController } from "./dept.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { deptSchema } from "./dept.schema";
@Module({
  imports: [MongooseModule.forFeature([{ name: "Dept", schema: deptSchema }])],
  controllers: [DeptController],
  providers: [DeptService],
  exports: [DeptService],
})
export class DeptModule {}
