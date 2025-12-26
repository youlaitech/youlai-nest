import { forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { RoleService } from "../role/role.service";
import { DeptService } from "../dept/dept.service";
import { UserAuthInfo } from "./interfaces/user-auth-info.interface";
import { CurrentUserDto } from "./dto/current-user.dto";
import { CurrentUserInfo } from "../../common/interfaces/current-user.interface";
import { DEFAULT_PASSWORD } from "src/common/constants";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "src/shared/cache/redis_cache.service";
import { SysUser } from "./entities/sys-user.entity";
import { SysUserRole } from "./entities/sys-user-role.entity";
import * as bcrypt from "bcrypt";
import { UserFormDto } from "./dto/user-form.dto";

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
    @InjectRepository(SysUser)
    private userRepository: Repository<SysUser>,
    @InjectRepository(SysUserRole)
    private userRoleRepository: Repository<SysUserRole>,
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  /**
   * 用户分页列表
   */
  async getUserPage(
    pageNum: number,
    pageSize: number,
    deptId?: number,
    keywords?: string,
    status?: number,
    startTime?: string,
    endTime?: string
  ) {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    queryBuilder.where("user.isDeleted = :isDeleted", { isDeleted: 0 });

    if (keywords) {
      queryBuilder.andWhere(
        "(user.username LIKE :keywords OR user.nickname LIKE :keywords OR user.mobile LIKE :keywords)",
        { keywords: `%${keywords}%` }
      );
    }

    if (deptId) {
      queryBuilder.andWhere("user.deptId = :deptId", { deptId });
    }

    if (status !== undefined && status !== null) {
      queryBuilder.andWhere("user.status = :status", { status });
    }

    if (startTime && endTime) {
      queryBuilder.andWhere("user.createTime BETWEEN :startTime AND :endTime", {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });
    }

    const [list, total] = await queryBuilder
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total };
  }

  /**
   * 获取用户认证凭证信息
   */
  async getAuthCredentialsByUsername(username: string): Promise<UserAuthInfo> {
    const user = await this.userRepository.findOne({
      where: { username, isDeleted: 0 },
      relations: ["roles"],
    });

    if (!user) {
      return null;
    }

    const roleIds = user.roles.map((role) => role.id);
    const roles = await this.roleService.findRolesByIds(roleIds);
    const roleCodes = roles.map((r) => r.code);
    const dataScope = Math.min(...roles.map((r) => r.dataScope));

    return {
      id: user.id.toString(),
      username: user.username,
      password: user.password,
      status: user.status,
      deptId: user.deptId?.toString() || "",
      roles: roleCodes,
      dataScope,
    };
  }

  /**
   * 获取当前用户信息
   */
  async findMe(currentUserInfo: CurrentUserInfo): Promise<CurrentUserDto> {
    try {
      const userId = currentUserInfo.userId;

      // 1. 获取用户基本信息
      const user = await this.userRepository.findOne({
        where: { id: Number(userId), isDeleted: 0 },
        select: ["id", "username", "nickname", "mobile", "email", "avatar"],
      });

      if (!user) {
        throw new BusinessException("用户不存在");
      }

      // 2. 获取用户角色
      const userRoles = await this.userRoleRepository.find({
        where: { userId: Number(userId) },
      });

      console.log(userRoles, "userRoles");
      if (!userRoles?.length) {
        return {
          userId: user.id.toString(),
          username: user.username,
          nickname: user.nickname,
          mobile: user.mobile,
          email: user.email,
          avatar: user.avatar,
          roles: [],
          perms: [],
        };
      }

      // 3. 获取角色信息
      const roles = await this.roleService.findRolesByIds(userRoles.map((ur) => ur.roleId));
      console.log(roles, "roles");
      const roleCodes = roles.map((role) => role.code);
      console.log(roleCodes, "roleCodes");
      // 4. 获取权限列表
      let perms: string[] = [];
      if (roleCodes.includes("ROOT")) {
        // 超级管理员获取所有权限
        perms = await this.roleService.findAllPerms();
      } else {
        // 其他用户获取角色对应的权限
        perms = await this.roleService.findPermsByRoleCodes(roleCodes);
      }

      return {
        userId: user.id.toString(),
        username: user.username,
        nickname: user.nickname,
        mobile: user.mobile,
        email: user.email,
        avatar: user.avatar,
        roles: roleCodes,
        perms: perms,
      };
    } catch (error) {
      console.log(error, "error");
    }
  }

  /**
   * 新增用户
   */
  async create(createUserDto: CreateUserDto): Promise<SysUser> {
    const { username, password = DEFAULT_PASSWORD } = createUserDto;

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username, isDeleted: 0 },
    });
    if (existingUser) {
      throw new BusinessException("用户名已存在");
    }

    // 使用 bcrypt 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // 新增用户场景仅负责创建用户记录，不涉及会话失效逻辑
    return await this.userRepository.save(user);
  }

  /**
   * 失效指定用户的所有会话（对齐 Java 的 invalidateUserSessions）
   * - JWT 模式：递增用户安全版本号 auth:user:security_version:{userId}
   * - redis-token 模式：删除该用户的 access/refresh 映射
   */
  private async invalidateUserSessions(userId: number): Promise<void> {
    if (!userId) return;

    const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";

    // 1. JWT 模式：提升安全版本号，旧 JWT 全部失效
    const versionKey = `auth:user:security_version:${userId}`;
    const currentVersion = await this.redisCacheService.get<number>(versionKey);
    const nextVersion = (currentVersion ?? 0) + 1;
    await this.redisCacheService.set(versionKey, nextVersion);

    // 2. redis-token 模式：清理 access/refresh 映射
    if (sessionType === "redis-token") {
      const accessKey = `auth:user:access:${userId}`;
      const refreshKey = `auth:user:refresh:${userId}`;

      const accessToken = await this.redisCacheService.get<string>(accessKey);
      const refreshToken = await this.redisCacheService.get<string>(refreshKey);

      if (accessToken) {
        await this.redisCacheService.del(`auth:token:access:${accessToken}`);
      }
      if (refreshToken) {
        await this.redisCacheService.del(`auth:token:refresh:${refreshToken}`);
      }

      await this.redisCacheService.del(accessKey);
      await this.redisCacheService.del(refreshKey);
    }
  }

  /**
   * 获取用户表单数据
   */
  async getUserForm(userId: number): Promise<SysUser> {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ["roles"],
    });
  }

  /**
   * 更新用户
   */
  async update(userId: number, updateUserDto: UpdateUserDto) {
    const { username, deptId, roleIds, password, status } = updateUserDto;

    // 校验角色是否为空
    if (!roleIds?.length) {
      throw new BusinessException("请选择角色");
    }

    // 校验用户是否存在，排除自己后还存在相同的用户名
    const existingUser = await this.userRepository.findOne({
      where: { username, id: Number(userId), isDeleted: 0 },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new BusinessException("用户名已存在");
    }

    // 更新用户信息
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException("用户不存在");
    }

    // 如果提供了新密码，则加密新密码
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    Object.assign(user, {
      ...updateUserDto,
      password: hashedPassword || user.password, // 如果没有新密码，保留原密码
    });

    // 更新用户-角色关联
    await this.userRoleRepository.delete({ userId });
    const userRoles = roleIds.map((roleId) => ({
      userId,
      roleId,
    }));
    await this.userRoleRepository.save(userRoles);

    return await this.userRepository.save(user);
  }

  /**
   * 获取用户菜单ID列表
   */
  async getUserMenuIds(userId: number): Promise<number[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["roles"],
    });

    if (!user || !user.roles || user.roles.length === 0) {
      return [];
    }

    const roleIds = user.roles.map((role) => role.id);
    return await this.roleService.getMenuIdsByRoleIds(roleIds);
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<boolean> {
    const result = await this.userRepository.update(id, { isDeleted: 1 });
    return result.affected > 0;
  }

  /**
   * 查询所有用户
   */
  async findAll(): Promise<SysUser[]> {
    return await this.userRepository.find();
  }

  /**
   * 根据ID查询用户
   */
  async findOne(id: number): Promise<SysUser> {
    return await this.userRepository.findOne({ where: { id } });
  }

  /**
   * 根据用户名查询用户
   */
  async findByUsername(username: string): Promise<SysUser> {
    console.log(username, "根据用户名查询用户");
    return await this.userRepository.findOne({ where: { username } });
  }

  /**
   * 删除用户
   */
  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  async getUserFormData(id: number): Promise<UserFormDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`未找到 ID 为 ${id} 的用户`);
    }

    // 获取用户角色
    const userRoles = await this.userRoleRepository.find({
      where: { userId: id },
    });

    // 转换为表单所需的格式
    return {
      id: user.id.toString(),
      username: user.username,
      nickname: user.nickname,
      mobile: user.mobile,
      gender: user.gender,
      avatar: user.avatar,
      email: user.email || "",
      status: user.status,
      deptId: user.deptId?.toString(),
      roleIds: userRoles?.map((role) => role.roleId.toString()) || [],
      openId: user.openid,
    };
  }
}
