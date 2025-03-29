import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "./user.schema";
import { BusinessException } from "../../common/exceptions/business.exception";
import * as crypto from "crypto";
import encry from "../../utils/crypto";
import { RoleService } from "../role/role.service";
import { DeptService } from "../dept/dept.service";
import { RedisCacheService } from "../../cache/redis_cache.service";
import { UserAuthCredentials } from "./interfaces/user-auth-credentials.interface";
import { CurrentUserDto } from "./dto/current-user.dto";
import { CurrentUserInfo } from "../../common/interfaces/current-user.interface";

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
   * @returns
   */
  async findUserPage(
    pageNum: number,
    pageSize: number,
    deptId: string,
    keywords: string,
    status: number,
    startTime: string,
    endTime: string
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
      .find({ ...query })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const total = await this.userModel.countDocuments({ ...query }).exec();

    return { list: results, total };
  }

  /**
   *  获取用户认证凭证信息
   *
   * @param username   待验证的用户名
   * @returns 用户认证凭证对象，包含密码、权限等关键信息
   */
  async getAuthCredentialsByUsername(username: string): Promise<UserAuthCredentials> {
    const user = await this.userModel
      .findOne({ username, isDeleted: 0 })
      .select({
        _id: 1,
        username: 1,
        password: 1,
        salt: 1,
        status: 1,
        deptId: 1,
        deptTreePath: 1,
        roleIds: 1,
      })
      .lean()
      .exec();

    if (!user) {
      return null;
    }

    let roleCodes = [];
    let dataScope;
    if (user.roleIds?.length > 0) {
      const roles = await this.roleService.findRolesByIds(user.roleIds);

      if (roles.length > 0) {
        roleCodes = roles.map((r) => r.code);
        dataScope = Math.min(...roles.map((r) => r.dataScope));
      }
    }

    return {
      id: user._id.toString(),
      username: user.username,
      password: user.password,
      salt: user.salt,
      status: user.status,
      deptId: user.deptId?.toString() || "",
      deptTreePath: user.deptTreePath,
      roles: roleCodes,
      dataScope,
    };
  }

  /**
   * 获取当前用户信息
   *
   * @param id 用户ID
   * @returns
   */
  async findMe(currentUserInfo: CurrentUserInfo): Promise<CurrentUserDto> {
    const userId = currentUserInfo.userId;
    console.log("userId", userId);
    const user = await this.userModel
      .findOne({ _id: userId, isDeleted: false })
      .select("username nickname mobile email avatar")
      .lean()
      .exec();

    if (!user) {
      throw new BusinessException("用户不存在");
    }
    const roles = currentUserInfo.roles;
    let perms;
    if (roles && roles.length > 0) {
      perms = await this.roleService.findPermsByRoleCodes(roles);
    }

    return {
      userId,
      username: user.username,
      nickname: user.nickname,
      mobile: user.mobile,
      email: user.email,
      avatar: user.avatar,
      roles: roles,
      perms: perms,
    };
  }

  /**
   * 新增用户
   *
   * @param createUserDto 用户数据
   * @returns
   */
  async create(createUserDto: CreateUserDto) {
    const { username, deptId, password, roleIds } = createUserDto;

    if (roleIds?.length <= 0) {
      throw new BusinessException("请选择角色");
    }

    const existingUser = await this.userModel.findOne({ username, isDeleted: false });
    if (existingUser) {
      throw new BusinessException("用户已存在");
    }
    const salt = crypto.randomBytes(4).toString("base64");

    let userDeptTreePath;
    if (deptId != null) {
      const dept = await this.deptService.findOne(deptId.toString());
      if (!dept) {
        userDeptTreePath = `${dept.TreePath}/${deptId}`;
      }
    }

    return await this.userModel.create({
      ...createUserDto,
      roles: createUserDto.roleIds,
      salt: salt,
      deptTreePath: userDeptTreePath,
      password: encry(password, salt),
    });
  }

  /**
   * 获取用户表单数据
   *
   * @param userId 用户ID
   * @returns
   */
  async getUserForm(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BusinessException("用户不存在");
    }
    return user;
  }

  /**
   * 更新用户
   *
   * @param userId 用户ID
   * @param updateUserDto 更新用户数据
   * @returns
   */
  async update(userId: string, updateUserDto: UpdateUserDto) {
    const { username, deptId, roleIds } = updateUserDto;
    // 校验角色是否为空
    if (roleIds?.length <= 0) {
      throw new BusinessException("请选择角色");
    }

    // 校验用户是否存在 ,排除自己 后还存在相同的用户名
    const existingUser = await this.userModel.findOne({ username, _id: { $ne: userId } });
    if (existingUser) {
      throw new BusinessException("用户已存在");
    }

    // 生成部门树路径
    let userDeptTreePath;
    if (deptId != null) {
      const dept = await this.deptService.findOne(deptId.toString());
      if (!dept) {
        userDeptTreePath = `${dept.TreePath}/${deptId}`;
      }
    }

    // 更新用户信息
    updateUserDto.deptTreePath = userDeptTreePath;
    const user = await this.userModel.findByIdAndUpdate(userId, updateUserDto, {
      new: true,
    });
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

    return true;
  }
}
