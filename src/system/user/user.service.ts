import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { RoleService } from "../role/role.service";
import { DeptService } from "../dept/dept.service";
import { UserAuthCredentials } from "./interfaces/user-auth-credentials.interface";
import { CurrentUserDto } from "./dto/current-user.dto";
import { CurrentUserInfo } from "../../common/interfaces/current-user.interface";
import { DEFAULT_PASSWORD } from "src/common/constants";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { SysUser } from "./entities/sys-user.entity";
import { SysUserRole } from "./entities/sys-user-role.entity";

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
    private userRoleRepository: Repository<SysUserRole>
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
  async getAuthCredentialsByUsername(username: string): Promise<UserAuthCredentials> {
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
   */
  async findMe(currentUserInfo: CurrentUserInfo): Promise<CurrentUserDto> {
    const userId = currentUserInfo.userId;
    const user = await this.userRepository.findOne({
      where: { id: Number(userId), isDeleted: 0 },
      select: ["id", "username", "nickname", "mobile", "email", "avatar"],
    });

    if (!user) {
      throw new BusinessException("用户不存在");
    }

    const roles = currentUserInfo.roles;
    let perms = [];
    if (roles && roles.length > 0) {
      perms = await this.roleService.findPermsByRoleCodes(roles);
    }

    return {
      userId: user.id.toString(),
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
   */
  async create(createUserDto: CreateUserDto): Promise<SysUser> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
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
    const { username, deptId, roleIds } = updateUserDto;

    // 校验角色是否为空
    if (!roleIds?.length) {
      throw new BusinessException("请选择角色");
    }

    // 校验用户是否存在，排除自己后还存在相同的用户名
    const existingUser = await this.userRepository.findOne({
      where: { username, id: Number(userId) },
    });

    if (existingUser) {
      throw new BusinessException("用户已存在");
    }

    // 生成部门树路径
    let userDeptTreePath;
    if (deptId != null) {
      const dept = await this.deptService.getDeptForm(deptId);
      if (dept) {
        userDeptTreePath = `${dept.treePath}/${deptId}`;
      }
    }

    // 更新用户信息
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException("用户不存在");
    }

    Object.assign(user, {
      ...updateUserDto,
      deptTreePath: userDeptTreePath,
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
    return await this.userRepository.findOne({ where: { username } });
  }

  /**
   * 删除用户
   */
  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
