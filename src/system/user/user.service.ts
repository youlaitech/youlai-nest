import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserSchema } from "./user.schema";
import { BusinessException } from "../../common/exceptions/business.exception";
import * as crypto from "crypto";
import encry from "../../utils/crypto";
import { RoleService } from "../role/role.service";
import { matchDeptPath } from "../../common/shared/regex-utils";
import { DeptService } from "../dept/dept.service";
import { RedisCacheService } from "../../cache/redis_cache.service";
import { ResultCode } from "src/common/enums/result-code.enum";
import { BaseSchema } from "src/common/schemas/base.schema";
import { UserAuthInfo } from "./interfaces/user-auth-info.interface";

@Injectable()
export class UserService {
  constructor(
    @InjectModel("User") private readonly userModel: Model<User>,
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
    private readonly cacheService: RedisCacheService
  ) {}

  // 用户缓存键前缀
  private readonly USER_CACHE_PREFIX = "user:";
  private readonly USER_LIST_CACHE_KEY = "user:list";

  /**
   * 用户分页列表
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
  async findMe(id: string): Promise<User> {
    const user = await this.userModel.findOne({ _id: id, isDeleted: 0 });
    if (!user) {
      throw new BusinessException("用户不存在");
    }
    return user;
  }

  /**
   * 新增用户
   *
   * @param createUserDto 用户数据
   * @returns
   */
  async create(createUserDto: CreateUserDto) {
    const { username, deptId, password } = createUserDto;

    const existUser = await this.userModel.findOne({ username, isDeleted: 0 });
    if (existUser) {
      throw new BusinessException("用户已存在");
    }
    const salt = crypto.randomBytes(4).toString("base64");
    const UserWithDept = await this.deptService.findOne(deptId.toString());
    const UserDeptTreePath = `${UserWithDept.TreePath}/${UserWithDept.id}`;

    const roleIds = createUserDto.roleIds;

    if (!roleIds || roleIds.length === 0) {
      throw new BusinessException("角色不能为空");
    }

    const newUser = await this.userModel.create({
      ...createUserDto,
      roles: createUserDto.roleIds,
      salt: salt,
      UserDeptTreePath: UserDeptTreePath,
      password: encry(password, salt),
    });

    // 清除用户列表缓存
    await this.cacheService.del(this.USER_LIST_CACHE_KEY);
    return newUser;
  }

  /**
   * 获取用户表单数据
   *
   * @param _id 用户ID
   * @returns
   */
  async getUserForm(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId, { __v: 0, permIds: 0, salt: 0 });
    if (!user) {
      throw new BusinessException("用户不存在");
    }
    console.log("getUserForm", user);
    return user;
  }

  /**
   * 更新用户
   *
   * @param id 用户ID
   * @param updateUserDto 更新用户数据
   * @returns
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });

    if (!user) {
      throw new BusinessException("用户不存在");
    }

    // 更新缓存
    await Promise.all([
      this.cacheService.del(this.USER_CACHE_PREFIX + id),
      this.cacheService.del(this.USER_LIST_CACHE_KEY),
    ]);

    return user;
  }

  /**
   * 获取用户菜单ID列表
   *
   * @param userId 用户ID
   * @returns
   */
  async getUserMenuIds(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.roleIds || user.roleIds.length === 0) {
      return [];
    }

    const roleIds = user.roleIds;
    const menuIds = await this.roleService.getMenuIdsByRoleIds(roleIds);
    console.log("menuIds", menuIds);
    return menuIds;
  }

  /**
   * 根据用户名查找用户
   *
   * @param username  用户名
   * @returns
   */
  async findAuthUserByUsername(username: string): Promise<UserAuthInfo> {
    const user = await this.userModel.findOne({ username, isDeleted: 0 }).exec();
    if (!user) {
      throw new BusinessException(ResultCode.USER_NOT_FOUND);
    }

    // 如果 roleIds 存在则转换为角色代码，否则设置为空数组
    const roles =
      user.roleIds && user.roleIds.length > 0
        ? await this.roleService.findCodesByIds(user.roleIds)
        : [];

    return {
      id: user.id,
      username: user.username,
      password: user.password,
      salt: user.salt,
      status: user.status,
      roles,
    };
  }

  /**
   * 删除用户
   *
   * @param id 用户ID
   * @returns
   */
  async deleteUser(id: string): Promise<boolean> {
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
  }
}
