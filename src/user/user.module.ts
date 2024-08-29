import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from './schemas/user.schema';
import { RolesModule } from '../roles/roles.module';
import { MenuModule } from '../menu/menu.module';
import { DeptModule } from '../dept/dept.module';

const UserTable = MongooseModule.forFeature([
  { name: 'Users', schema: userSchema },
]);
@Module({
  imports: [
    UserTable,
    forwardRef(() => MenuModule),
    forwardRef(() => RolesModule),
    forwardRef(() => DeptModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
