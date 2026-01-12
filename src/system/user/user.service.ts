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
import { Repository, Like, In } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/shared/redis/redis.service";
import { SysUser } from "./entities/sys-user.entity";
import { SysUserRole } from "./entities/sys-user-role.entity";
import * as bcrypt from "bcrypt";
import { UserFormDto } from "./dto/user-form.dto";
import type { PasswordChangeDto } from "./dto/password-change.dto";
import type { MobileUpdateDto } from "./dto/mobile-update.dto";
import type { EmailUpdateDto } from "./dto/email-update.dto";
import { ErrorCode } from "src/common/enums/error-code.enum";
import * as XLSX from "xlsx";

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
    private readonly redisCacheService: RedisService
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
    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const queryBuilder = this.userRepository.createQueryBuilder("user");
    // 统一使用逻辑删除标识过滤
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
      .skip((pageNumSafe - 1) * pageSizeSafe)
      .take(pageSizeSafe)
      .getManyAndCount();
    // 部门名称单独回填（避免分页查询里做复杂 join，便于后续扩展字段）
    const deptIds = Array.from(new Set(list.map((u) => u.deptId).filter(Boolean)));
    const depts = await this.deptService.findByIds(deptIds);
    const deptMap = new Map<number, string>();
    depts.forEach((d) => deptMap.set(d.id, d.name));

    const data = list.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      gender: u.gender,
      mobile: u.mobile,
      status: u.status,
      email: u.email || "",
      deptId: u.deptId,
      deptName: u.deptId ? deptMap.get(u.deptId) || null : null,
      createTime: u.createTime
        ? `${u.createTime.getFullYear()}-${String(u.createTime.getMonth() + 1).padStart(2, "0")}-${String(
            u.createTime.getDate()
          ).padStart(2, "0")} ${String(u.createTime.getHours()).padStart(2, "0")}:${String(
            u.createTime.getMinutes()
          ).padStart(2, "0")}:${String(u.createTime.getSeconds()).padStart(2, "0")}`
        : null,
    }));

    return {
      data,
      page: {
        pageNum: pageNumSafe,
        pageSize: pageSizeSafe,
        total,
      },
    };
  }

  /**
   * 列出用于导出的用户数据（不分页）
   */
  async listExportUsers(
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

    const list = await queryBuilder.orderBy("user.createTime", "DESC").getMany();

    const deptIds = Array.from(new Set(list.map((u) => u.deptId).filter(Boolean)));
    const depts = await this.deptService.findByIds(deptIds);
    const deptMap = new Map<number, string>();
    depts.forEach((d) => deptMap.set(d.id, d.name));

    return list.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      gender: u.gender,
      mobile: u.mobile,
      status: u.status,
      email: u.email || "",
      deptId: u.deptId,
      deptName: u.deptId ? deptMap.get(u.deptId) || null : null,
      createTime: u.createTime
        ? `${u.createTime.getFullYear()}-${String(u.createTime.getMonth() + 1).padStart(2, "0")}-${String(
            u.createTime.getDate()
          ).padStart(2, "0")} ${String(u.createTime.getHours()).padStart(2, "0")}:${String(
            u.createTime.getMinutes()
          ).padStart(2, "0")}:${String(u.createTime.getSeconds()).padStart(2, "0")}`
        : null,
    }));
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
   * 更新当前用户个人信息（个人中心）
   */
  async updateProfile(
    currentUserInfo: CurrentUserInfo,
    data: Partial<CurrentUserDto>
  ): Promise<boolean> {
    const userId = Number(currentUserInfo.userId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException("用户不存在");
    }

    const updateData: Partial<SysUser> = {
      nickname: data.nickname,
      mobile: data.mobile,
      email: data.email,
      avatar: data.avatar,
      updateTime: new Date(),
    };

    // remove undefined keys
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

    const result = await this.userRepository.update(userId, updateData);
    return result.affected > 0;
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

  async updateUserStatus(userId: number, status: number): Promise<boolean> {
    const result = await this.userRepository.update(
      { id: Number(userId), isDeleted: 0 },
      { status: Number(status) }
    );
    return (result.affected ?? 0) > 0;
  }

  async resetUserPassword(userId: number, password: string): Promise<boolean> {
    if (!password?.trim()) {
      throw new BusinessException("密码不能为空");
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await this.userRepository.update(
      { id: Number(userId), isDeleted: 0 },
      { password: hashed }
    );

    const ok = (result.affected ?? 0) > 0;
    if (ok) {
      await this.invalidateUserSessions(Number(userId));
    }
    return ok;
  }

  async changeCurrentUserPassword(userId: number, data: PasswordChangeDto): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: Number(userId), isDeleted: 0 },
      select: ["id", "password"],
    });

    if (!user) {
      throw new BusinessException("用户不存在");
    }

    const { oldPassword, newPassword, confirmPassword } = data;
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      throw new BusinessException("原密码错误");
    }

    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BusinessException("新密码不能与原密码相同");
    }

    if (newPassword !== confirmPassword) {
      throw new BusinessException("新密码和确认密码不一致");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await this.userRepository.update(user.id, { password: hashed });
    const ok = (result.affected ?? 0) > 0;
    if (ok) {
      await this.invalidateUserSessions(user.id);
    }
    return ok;
  }

  async sendMobileCode(mobile: string): Promise<boolean> {
    if (!mobile?.trim()) {
      throw new BusinessException("手机号不能为空");
    }
    const code = "1234";
    const redisKey = `captcha:mobile:${mobile.trim()}`;
    await this.redisCacheService.set(redisKey, code, 60 * 5);
    return true;
  }

  async bindOrChangeMobile(userId: number, data: MobileUpdateDto): Promise<boolean> {
    const mobile = data.mobile?.trim();
    const code = data.code?.trim();
    const redisKey = `captcha:mobile:${mobile}`;
    const cached = await this.redisCacheService.get<string>(redisKey);

    if (!cached) {
      throw new BusinessException("验证码已过期");
    }
    if (cached !== code) {
      throw new BusinessException("验证码错误");
    }

    await this.redisCacheService.del(redisKey);
    const result = await this.userRepository.update(
      { id: Number(userId), isDeleted: 0 },
      { mobile }
    );
    return (result.affected ?? 0) > 0;
  }

  async sendEmailCode(email: string): Promise<void> {
    if (!email?.trim()) {
      throw new BusinessException("邮箱不能为空");
    }
    const code = "1234";
    const redisKey = `captcha:email:${email.trim()}`;
    await this.redisCacheService.set(redisKey, code, 60 * 5);
  }

  async bindOrChangeEmail(userId: number, data: EmailUpdateDto): Promise<boolean> {
    const email = data.email?.trim();
    const code = data.code?.trim();
    const redisKey = `captcha:email:${email}`;
    const cached = await this.redisCacheService.get<string>(redisKey);

    if (!cached) {
      throw new BusinessException("验证码已过期");
    }
    if (cached !== code) {
      throw new BusinessException("验证码错误");
    }

    await this.redisCacheService.del(redisKey);
    const result = await this.userRepository.update(
      { id: Number(userId), isDeleted: 0 },
      { email }
    );
    return (result.affected ?? 0) > 0;
  }

  async listUserOptions() {
    const users = await this.userRepository.find({
      where: { status: 1, isDeleted: 0 },
      select: ["id", "nickname", "username"],
      order: { id: "ASC" },
    });

    return users.map((u) => ({
      label: u.nickname?.trim() || u.username,
      value: u.id.toString(),
    }));
  }

  async importUsersFromBuffer(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames?.[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) {
      throw new BusinessException("导入文件为空");
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    const excelResult = {
      code: ErrorCode.SUCCESS.code,
      validCount: 0,
      invalidCount: 0,
      messageList: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const line = i + 2;

      const username = String(row["用户名"] ?? "").trim();
      const nickname = String(row["昵称"] ?? "").trim();
      const genderLabel = String(row["性别"] ?? "").trim();
      const mobile = String(row["手机号码"] ?? "").trim();
      const email = String(row["邮箱"] ?? "").trim();
      const roleCodesRaw = String(row["角色"] ?? "").trim();
      const deptCode = String(row["部门"] ?? "").trim();

      if (!username || !nickname) {
        excelResult.invalidCount++;
        excelResult.messageList.push(`第${line}行：用户名或昵称不能为空`);
        continue;
      }

      const exist = await this.userRepository.findOne({
        where: { username, isDeleted: 0 },
        select: ["id"],
      });
      if (exist) {
        excelResult.invalidCount++;
        excelResult.messageList.push(`第${line}行：用户名已存在`);
        continue;
      }

      const roleCodes = roleCodesRaw
        ? roleCodesRaw
            .split(/[,，]/)
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

      const roleIds = await this.roleService.findRoleIdsByCodes(roleCodes);
      if (!roleIds.length) {
        excelResult.invalidCount++;
        excelResult.messageList.push(`第${line}行：角色不存在或为空`);
        continue;
      }

      let deptId: number | undefined;
      if (deptCode) {
        const dept = await this.deptService.findByCode(deptCode);
        if (!dept) {
          excelResult.invalidCount++;
          excelResult.messageList.push(`第${line}行：部门不存在`);
          continue;
        }
        deptId = dept.id;
      }

      const gender = (() => {
        if (!genderLabel) return 0;
        if (genderLabel === "男" || genderLabel === "1") return 1;
        if (genderLabel === "女" || genderLabel === "2") return 2;
        return 0;
      })();

      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const user = this.userRepository.create({
        username,
        nickname,
        gender,
        mobile: mobile || null,
        email: email || null,
        deptId: deptId as any,
        status: 1,
        password: hashedPassword,
        isDeleted: 0,
        createTime: new Date(),
      });

      const saved = await this.userRepository.save(user);
      await this.userRoleRepository.save(roleIds.map((rid) => ({ userId: saved.id, roleId: rid })));
      excelResult.validCount++;
    }

    return excelResult;
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

    // 检查用户名是否已存在（排除当前用户）
    if (username) {
      const existingUser = await this.userRepository.findOne({
        where: { username, isDeleted: 0 },
        select: ["id"],
      });
      if (existingUser && existingUser.id !== Number(userId)) {
        throw new BusinessException("用户名已存在");
      }
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

  async findByMobile(mobile: string): Promise<SysUser> {
    if (!mobile) return null;
    return await this.userRepository.findOne({
      where: { mobile, isDeleted: 0 },
      relations: ["roles"],
    });
  }

  async findByOpenid(openid: string): Promise<SysUser> {
    if (!openid) return null;
    return await this.userRepository.findOne({
      where: { openid, isDeleted: 0 },
      relations: ["roles"],
    });
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
