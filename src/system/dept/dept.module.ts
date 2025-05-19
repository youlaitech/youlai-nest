import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeptService } from "./dept.service";
import { DeptController } from "./dept.controller";
import { SysDept } from "./entities/sys-dept.entity";
import { UserModule } from "../user/user.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysDept]), forwardRef(() => UserModule)],
  controllers: [DeptController],
  providers: [DeptService],
  exports: [DeptService],
})
export class DeptModule {}
