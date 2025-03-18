import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Users } from "./user.schema";
import { ApiException } from "../../common/http-exception/api.exception";
import { BusinessErrorCode } from "../../common/enums/business-error-code.enum";
import * as crypto from "crypto";
import encry from "../../utils/crypto";
import { RoleService } from "../role/role.service";
import { matchDeptPath } from "../../common/shared/regex-utils";
import { DeptService } from "../dept/dept.service";
import { RedisCacheService } from "../../cache/redis_cache.service";

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectModel("Users") private readonly userModel: Model<Users>,
    @Inject(forwardRef(() => RoleService))
    private readonly rolesService: RoleService,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
    private readonly cacheService: RedisCacheService
  ) {}

  // 用户缓存键前缀
  private readonly USER_CACHE_PREFIX = "user:";
  private readonly USER_LIST_CACHE_KEY = "user:list";
  private readonly CACHE_TTL = 3600; // 1小时

  /**
   * 分页查询用户列表
   *
   * @param pageNum
   * @param pageSize
   * @param deptId
   * @param keywords
   * @param status
   * @param startTime
   * @param endTime
   * @param deptTreePath
   * @returns
   */
  async getUserPage(
    pageNum: number,
    pageSize: number,
    deptId: string,
    keywords: string,
    status: number,
    startTime: string,
    endTime: string,
    deptTreePath: string
  ) {
    let query = {};
    query["isDeleted"] = 0;
    // 添加关键词查询条件
    if (keywords) {
      query = {
        $or: [
          { username: { $regex: new RegExp(keywords, "i") } },
          { nickname: { $regex: new RegExp(keywords, "i") } },
          { mobile: { $regex: new RegExp(keywords, "i") } },
        ],
      };
    }
    if (deptId) {
      query["deptId"] = deptId;
    }

    // 添加其他查询条件，如状态、时间范围等
    if (!isNaN(Number(status))) {
      query["status"] = Number(status);
    }
    if (startTime && endTime) {
      query["createTime"] = {
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
  }

  /**
   * 获取当前用户信息
   *
   * @param id 用户ID
   * @returns
   */
  async findMe(id: string): Promise<Users> {
    const user = await this.userModel.findOne({ _id: id, isDeleted: 0 });
    if (!user) {
      throw new ApiException("用户不存在", BusinessErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  /**
   *  创建用户
   *
   * @param createUserDto 创建用户数据
   * @returns
   */
  async create(createUserDto: CreateUserDto) {
    try {
      const { username, deptTreePath, deptId, password } = createUserDto;
      const query = { username, isDeleted: 0 };
      if (deptTreePath) {
        query["deptTreePath"] = deptTreePath;
      }
      const existUser = await this.userModel.findOne(query);
      if (existUser) throw new ApiException("用户已存在", BusinessErrorCode.USER_ALREADY_EXISTS);
      const salt = crypto.randomBytes(4).toString("base64");
      const UserWithDept = await this.deptService.findOne(deptId.toString());
      const UserDeptTreePath = `${UserWithDept.TreePath}/${UserWithDept.id}`;
      const newUser = await this.userModel.create({
        ...createUserDto,
        salt,
        UserDeptTreePath,
        password: encry(password, salt),
      });

      // 清除用户列表缓存
      await this.cacheService.del(this.USER_LIST_CACHE_KEY);

      return newUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新用户
   *
   * @param id 用户ID
   * @param updateUserDto 更新用户数据
   * @returns
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
        new: true,
      });

      if (!user) {
        throw new ApiException("用户不存在", BusinessErrorCode.USER_NOT_FOUND);
      }

      // 更新缓存
      await Promise.all([
        this.cacheService.del(this.USER_CACHE_PREFIX + id),
        this.cacheService.del(this.USER_LIST_CACHE_KEY),
      ]);

      return user;
    } catch (error) {
      this.logger.error("更新用户失败", { id, error });
      throw error;
    }
  }

  /**
   * 根据用户ID查询用户权限
   *
   * @param userId 用户ID
   * @returns
   */
  async findUser(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      const { roles } = user;
      const { permIds } = await this.rolesService.findMenus(roles);
      return permIds;
    } catch (error) {
      console.log(error);
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  /**
   *  根据用户名查找用户
   *
   * @param username  用户名
   * @returns
   */
  async findOne(username: string): Promise<Users> {
    try {
      const user = await this.userModel.findOne({ username, isDeleted: 0 }).exec();
      if (!user) throw new HttpException("用户名不存在", HttpStatus.BAD_REQUEST);
      return user;
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findFrom(_id: string): Promise<Users> {
    return await this.userModel.findById(_id, { __v: 0, permIds: 0, salt: 0 });
  }

  /**
   * 删除单个用户
   *
   * @param id 用户ID
   * @returns
   */
  async removeItem(id: string): Promise<boolean> {
    try {
      const result = await this.userModel.findByIdAndUpdate(id, { isDeleted: 1 }, { new: true });

      if (!result) {
        return false;
      }

      // 删除缓存
      await Promise.all([
        this.cacheService.del(this.USER_CACHE_PREFIX + id),
        this.cacheService.del(this.USER_LIST_CACHE_KEY),
      ]);

      return true;
    } catch (error) {
      this.logger.error("删除用户失败", { id, error });
      return false;
    }
  }
}
