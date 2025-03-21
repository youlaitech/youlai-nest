import { Module } from "@nestjs/common";
import { UserModule } from "./user/user.module";
import { RoleModule } from "./role/role.module";
import { DeptModule } from "./dept/dept.module";
import { DictModule } from "./dict/dict.module";

@Module({
  imports: [UserModule, RoleModule, DeptModule, DictModule],
  exports: [UserModule, RoleModule, DeptModule, DictModule],
})
export class SystemModule {}
