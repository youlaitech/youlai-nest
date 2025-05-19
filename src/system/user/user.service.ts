import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { FilterQuery, Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "./user.schema";
import { BusinessException } from "../../common/exceptions/business.exception";
import * as crypto from "crypto";
import encry from "../../common/utils/crypto";
import { RoleService } from "../role/role.service";
import { DeptService } from "../dept/dept.service";
import { UserAuthCredentials } from "./interfaces/user-auth-credentials.interface";
import { CurrentUserDto } from "./dto/current-user.dto";
import { CurrentUserInfo } from "../../common/interfaces/current-user.interface";
import { DEFAULT_PASSWORD } from "src/common/constants";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysUser } from "./entities/sys-user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectModel("User") private readonly userModel: Model<User>,
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
    @InjectRepository(SysUser)
    private userRepository: Repository<SysUser>
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
  async getUserPage(
    pageNum: number,
    pageSize: number,
    deptId: string,
    keywords: string,
    status: number,
    startTime: string,
    endTime: string,
    dataFilter?: FilterQuery<User>
  ) {
    // 基础查询条件
    const baseQuery: FilterQuery<User> = { isDeleted: 0 };

    // 关键词查询
    if (keywords) {
      baseQuery.$or = [
        { username: { $regex: keywords, $options: "i" } },
        { nickname: { $regex: keywords, $options: "i" } },
        { mobile: { $regex: keywords, $options: "i" } },
      ];
    }

    // 合并所有条件（基础条件 + 权限过滤 + 其他条件）
    const finalQuery: FilterQuery<User> = {
      $and: [
        baseQuery,
        dataFilter || {}, // 合并数据权限条件
        ...(deptId ? [{ deptId }] : []),
        ...(!isNaN(status) ? [{ status: Number(status) }] : []),
        ...(startTime && endTime
          ? [
              {
                createTime: {
                  $gte: new Date(startTime).getTime(),
                  $lte: new Date(endTime).getTime(),
                },
              },
            ]
          : []),
      ],
    };

    // 执行查询
    const [list, total] = await Promise.all([
      this.userModel
        .find(finalQuery)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.userModel.countDocuments(finalQuery),
    ]);

    return { list, total };
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
  async create(createUserDto: CreateUserDto): Promise<SysUser> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  /**
   * 获取用户表单数据
   *
   * @param userId 用户ID
   * @returns
   */
  async getUserForm(userId: string): Promise<User> {
    return await this.userModel.findById(userId).exec();
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
      const dept = await this.deptService.getDeptForm(deptId.toString());
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

  async findAll(): Promise<SysUser[]> {
    return await this.userRepository.find({
      where: { isDeleted: 0 },
    });
  }

  async findOne(id: number): Promise<SysUser> {
    return await this.userRepository.findOne({
      where: { id, isDeleted: 0 },
    });
  }

  async findByUsername(username: string): Promise<SysUser> {
    return await this.userRepository.findOne({
      where: { username, isDeleted: 0 },
    });
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.update(id, { isDeleted: 1 });
  }
}
