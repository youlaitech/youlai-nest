import { Module } from "@nestjs/common";
import { UserModule } from "./user/user.module";
import { RoleModule } from "./role/role.module";
import { DeptModule } from "./dept/dept.module";
import { DictModule } from "./dict/dict.module";
import { DictDataModule } from "./dict-data/dict-data.module";

@Module({
  imports: [UserModule, RoleModule, DeptModule, DictModule, DictDataModule],
  exports: [UserModule, RoleModule, DeptModule, DictModule, DictDataModule],
})
export class SystemModule {}
