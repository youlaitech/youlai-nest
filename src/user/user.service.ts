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
import { BusinessErrorCode } from '../common/enums/business-error-code.enum';
import * as crypto from 'crypto';
import encry from '../utils/crypto';
import { RolesService } from '../roles/roles.service';
import { matchDeptPath } from '../common/shared/regex-utils';
import { DeptService } from '../dept/dept.service';
import { Redis_cacheService } from '../cache/redis_cache.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectModel('Users') private readonly userModel: Model<Users>,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
    private readonly cacheService: Redis_cacheService,
  ) {}

  // 用户缓存键前缀
  private readonly USER_CACHE_PREFIX = 'user:';
  private readonly USER_LIST_CACHE_KEY = 'user:list';
  private readonly CACHE_TTL = 3600; // 1小时

  async create(createUserDto: CreateUserDto) {
    try {
      const { username, deptTreePath, deptId, password } = createUserDto;
      const query = { username, isDeleted: 0 };
      if (deptTreePath) {
        query['deptTreePath'] = deptTreePath;
      }
      const existUser = await this.userModel.findOne(query);
      if (existUser)
        throw new ApiException(
          '用户已存在',
          BusinessErrorCode.USER_ALREADY_EXISTS,
        );
      const salt = crypto.randomBytes(4).toString('base64');
      const UserWithDept = await this.deptService.findOne(deptId.toString());
      const UserDeptTreePath = `${UserWithDept.TreePath}/${UserWithDept.id}`;
      const newUser = await this.userModel.create({
        ...createUserDto,
        salt,
        UserDeptTreePath,
        password: encry(password, salt),
      });

      // 清除用户列表缓存
      await this.cacheService.delCache(this.USER_LIST_CACHE_KEY);
      
      return newUser;
    } catch (error) {
      this.logger.error('创建用户失败', error);
      throw error;
    }
  }

  async findMe(id: string): Promise<Users> {
    try {
      // 使用缓存服务获取用户信息
      return await this.cacheService.getCache(
        this.USER_CACHE_PREFIX + id,
        async () => {
          const user = await this.userModel.findOne({ _id: id, isDeleted: 0 });
          if (!user) {
            throw new ApiException(
              '用户不存在',
              BusinessErrorCode.USER_NOT_FOUND,
            );
          }
          return user;
        },
        { ttl: this.CACHE_TTL }
      );
    } catch (error) {
      this.logger.error('获取用户信息失败', { id, error });
      throw error;
    }
  }

  async findAll(query: {
    pageNum?: number;
    pageSize?: number;
    username?: string;
    nickname?: string;
    status?: number;
  }) {
    try {
      // 使用缓存服务获取用户列表
      const cacheKey = `${this.USER_LIST_CACHE_KEY}:${JSON.stringify(query)}`;
      return await this.cacheService.getCache(
        cacheKey,
        async () => {
          const { pageNum = 1, pageSize = 10, username, nickname, status } = query;
          const skip = (pageNum - 1) * pageSize;
          const filter: any = { isDeleted: 0 };

          if (username) filter.username = new RegExp(username, 'i');
          if (nickname) filter.nickname = new RegExp(nickname, 'i');
          if (status !== undefined) filter.status = status;

          const [total, list] = await Promise.all([
            this.userModel.countDocuments(filter),
            this.userModel
              .find(filter)
              .skip(skip)
              .limit(pageSize)
              .select('-password -salt')
              .lean(),
          ]);

          return {
            list,
            total,
            pageNum: Number(pageNum),
            pageSize: Number(pageSize),
          };
        },
        { ttl: this.CACHE_TTL }
      );
    } catch (error) {
      this.logger.error('获取用户列表失败', error);
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
        new: true,
      });

      if (!user) {
        throw new ApiException(
          '用户不存在',
          BusinessErrorCode.USER_NOT_FOUND,
        );
      }

      // 更新缓存
      await Promise.all([
        this.cacheService.delCache(this.USER_CACHE_PREFIX + id),
        this.cacheService.delCache(this.USER_LIST_CACHE_KEY),
      ]);

      return user;
    } catch (error) {
      this.logger.error('更新用户失败', { id, error });
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const user = await this.userModel.findByIdAndUpdate(
        id,
        { isDeleted: 1 },
        { new: true },
      );

      if (!user) {
        throw new ApiException(
          '用户不存在',
          BusinessErrorCode.USER_NOT_FOUND,
        );
      }

      // 删除缓存
      await Promise.all([
        this.cacheService.delCache(this.USER_CACHE_PREFIX + id),
        this.cacheService.delCache(this.USER_LIST_CACHE_KEY),
      ]);

      return user;
    } catch (error) {
      this.logger.error('删除用户失败', { id, error });
      throw error;
    }
  }

  // 批量获取用户信息
  async findByIds(ids: string[]): Promise<Users[]> {
    try {
      // 使用缓存服务批量获取用户信息
      const cacheKeys = ids.map(id => this.USER_CACHE_PREFIX + id);
      const cachedUsers = await this.cacheService.mget(cacheKeys);
      
      // 找出缓存未命中的用户ID
      const missedIds = ids.filter((id, index) => !cachedUsers[index]);
      
      if (missedIds.length > 0) {
        // 从数据库获取缓存未命中的用户
        const users = await this.userModel
          .find({ _id: { $in: missedIds }, isDeleted: 0 })
          .select('-password -salt')
          .lean();
        
        // 更新缓存
        const cacheData = {};
        users.forEach(user => {
          cacheData[this.USER_CACHE_PREFIX + user._id] = user;
        });
        await this.cacheService.mset(cacheData, { ttl: this.CACHE_TTL });
        
        // 合并结果
        return ids.map(id => {
          const cachedUser = cachedUsers[ids.indexOf(id)];
          if (cachedUser) return JSON.parse(cachedUser);
          return users.find(u => u._id.toString() === id);
        });
      }
      
      return cachedUsers.map(user => user ? JSON.parse(user) : null);
    } catch (error) {
      this.logger.error('批量获取用户信息失败', { ids, error });
      throw error;
    }
  }

  async findUserWithDept(userId: string) {
    return this.userModel
      .findById(userId)
      .populate('deptId') // 填充 deptId 引用的部门数据
      .exec();
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
        BusinessErrorCode.DB_QUERY_ERROR,
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

  // 删除单个用户项
  async removeItem(id: string): Promise<boolean> {
    try {
      const result = await this.userModel.findByIdAndUpdate(
        id,
        { isDeleted: 1 },
        { new: true }
      );

      if (!result) {
        return false;
      }

      // 删除缓存
      await Promise.all([
        this.cacheService.delCache(this.USER_CACHE_PREFIX + id),
        this.cacheService.delCache(this.USER_LIST_CACHE_KEY),
      ]);

      return true;
    } catch (error) {
      this.logger.error('删除用户失败', { id, error });
      return false;
    }
  }
}
