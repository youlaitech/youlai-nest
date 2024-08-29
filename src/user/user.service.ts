import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Users } from './schemas/user.schema';
import { ApiException } from '../common/http-exception/api.exception';
import { ApiErrorCode } from '../common/enums/api-error-code.enum';
import * as crypto from 'crypto';
import encry from '../utils/crypto';
import { RolesService } from '../roles/roles.service';
import { matchDeptPath } from '../common/shared/regex-utils';
import { DeptService } from '../dept/dept.service';
@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectModel('Users') private readonly userModel: Model<Users>,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
  ) {}
  async create(createUserDto: CreateUserDto) {
    try {
      const { username, deptTreePath, deptId, password } = createUserDto;
      const query = { username, isDeleted: 0 };
      if (deptTreePath) {
        query['deptTreePath'] = deptTreePath; // 这个得是在账号自己本身得
      }
      const existUser = await this.userModel.findOne(query);
      if (existUser)
        throw new ApiException('用户已存在', ApiErrorCode.USER_EXIST);
      const salt = crypto.randomBytes(4).toString('base64');
      const UserWithDept = await this.deptService.findOne(deptId.toString());
      const UserDeptTreePath = `${UserWithDept.TreePath}/${UserWithDept.id}`;
      const newUser = await this.userModel.create({
        ...createUserDto,
        salt,
        UserDeptTreePath,
        password: encry(password, salt),
      });
      return await newUser.save();
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findUserWithDept(userId: string) {
    return this.userModel
      .findById(userId)
      .populate('deptId') // 填充 deptId 引用的部门数据
      .exec();
  }
  //  到导出类型后面写
  async findMe(id: string): Promise<any> {
    const user = await this.userModel
      .findById(id, {
        __v: 0,
        password: 0,
        permIds: 0,
        salt: 0,
        isDeleted: 0,
        updateTime: 0,
        createTime: 0,
        status: 0,
      })
      .lean();
    const { roleIds } = user;
    const { perms, roles } = await this.rolesService.findIds(roleIds);
    return {
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      roles,
      perms,
      userId: user._id,
    };
  }
  findAll() {
    return `This action returns all user`;
  }

  async findOne(username: string): Promise<Users> {
    try {
      const user = await this.userModel
        .findOne({ username, isDeleted: 0 })
        .exec();
      if (!user)
        throw new HttpException('用户名不存在', HttpStatus.BAD_REQUEST);
      return user;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findFrom(_id: string): Promise<Users> {
    return await this.userModel.findById(_id, { __v: 0, permIds: 0, salt: 0 });
  }
  async findUser(id: string) {
    try {
      const user = await this.userModel.findById(id, { roleIds: 1 });
      const { roleIds } = user;
      const { permIds } = await this.rolesService.findMenus(roleIds);
      return permIds;
    } catch (error) {
      console.log(error);
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        ApiErrorCode.DATABASE_ERROR,
      );
    }
  }
  async findSearch(
    pageNum: number,
    pageSize: number,
    deptId: string,
    keywords: string,
    status: number,
    startTime: string,
    endTime: string,
    deptTreePath: string,
  ) {
    try {
      let query = {};
      query['isDeleted'] = 0;
      // 添加关键词查询条件
      if (keywords) {
        query = {
          $or: [
            { username: { $regex: new RegExp(keywords, 'i') } },
            { nickname: { $regex: new RegExp(keywords, 'i') } },
            { mobile: { $regex: new RegExp(keywords, 'i') } },
          ],
        };
      }
      if (deptId) {
        query['deptId'] = deptId;
      }

      // 添加其他查询条件，如状态、时间范围等
      if (!isNaN(Number(status))) {
        query['status'] = Number(status);
      }
      if (startTime && endTime) {
        query['createTime'] = {
          $gte: new Date(startTime).getTime(),
          $lte: new Date(endTime).getTime(),
        };
      }
      // 执行查询并分页
      const results = await this.userModel
        .find({ ...matchDeptPath(deptTreePath), ...query })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .exec();

      const total = await this.userModel
        .countDocuments({ ...matchDeptPath(deptTreePath), ...query })
        .exec();
      return { list: results, total };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      return await this.userModel
        .findByIdAndUpdate(id, { ...updateUserDto }, { new: true })
        .exec();
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string): Promise<void> {
    // await this.userModel.findByIdAndDelete(id);
    await this.userModel.updateOne(
      {
        _id: id,
      },
      {
        isDel: true,
      },
    );
  }
  async removeItem(id: string) {
    return await this.userModel
      .updateOne(
        {
          _id: id,
        },
        {
          isDel: true,
        },
      )
      .exec();
  }
}
