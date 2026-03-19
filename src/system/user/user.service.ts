import { forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { RoleService } from "../role/role.service";
import { DeptService } from "../dept/dept.service";
import { RolePermService } from "../role/role-perm.service";
import { UserAuthInfo } from "./interfaces/user-auth-info.interface";
import { CurrentUserDto } from "./dto/current-user.dto";
import { CurrentUserInfo } from "../../common/interfaces/current-user.interface";
import { DEFAULT_PASSWORD, ROOT_ROLE_CODE } from "src/common/constants";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/core/redis/redis.service";
import { SysUser } from "./entities/sys-user.entity";
import { SysUserRole } from "./entities/sys-user-role.entity";
import * as bcrypt from "bcrypt";
import { UserFormDto } from "./dto/user-form.dto";
import type { PasswordChangeDto } from "./dto/password-change.dto";
import type { MobileUpdateDto } from "./dto/mobile-update.dto";
import type { EmailUpdateDto } from "./dto/email-update.dto";
import type { UserProfileDto } from "./dto/user-profile.dto";
import { ErrorCode } from "src/common/enums/error-code.enum";
import * as XLSX from "xlsx";
import { RoleDataScope } from "../../common/models/role-data-scope.model";
import { RequestContext } from "src/core/context/request-context";

/**
 * 用户服务
 */
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
    @Inject(forwardRef(() => DeptService))
    private readonly deptService: DeptService,
    @Inject(forwardRef(() => RolePermService))
    private readonly rolePermService: RolePermService,
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
    deptId?: string,
    keywords?: string,
    status?: number,
    createTime?: string[]
  ) {
    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const queryBuilder = this.userRepository.createQueryBuilder("user");
    // 统一使用逻辑删除标识过滤
    queryBuilder.where("user.isDeleted = :isDeleted", { isDeleted: 0 });
    // root 用户（ROOT 角色）不在用户列表中展示
    queryBuilder.andWhere(
      `NOT EXISTS (
        SELECT 1
        FROM sys_user_role sur
          INNER JOIN sys_role r ON sur.role_id = r.id
        WHERE sur.user_id = user.id
          AND r.code = :rootCode
      )`,
      { rootCode: ROOT_ROLE_CODE }
    );

    if (keywords) {
      queryBuilder.andWhere(
        "(user.username LIKE :keywords OR user.nickname LIKE :keywords OR user.mobile LIKE :keywords)",
        { keywords: `%${keywords}%` }
      );
    }

    if (deptId !== undefined && deptId !== null && deptId !== "" && deptId !== "0") {
      queryBuilder.andWhere("user.deptId = :deptId", { deptId: deptId.toString() });
    }

    if (status !== undefined && status !== null) {
      queryBuilder.andWhere("user.status = :status", { status });
    }

    // 日期筛选：createTime 数组 [startTime, endTime]
    if (createTime && createTime.length >= 1) {
      const startTime = createTime[0];
      if (startTime) {
        queryBuilder.andWhere("user.createTime >= :startTime", {
          startTime: new Date(startTime),
        });
      }
    }
    if (createTime && createTime.length >= 2) {
      const endTime = createTime[1];
      if (endTime) {
        const endDate = new Date(endTime);
        endDate.setHours(23, 59, 59, 999);
        queryBuilder.andWhere("user.createTime <= :endTime", {
          endTime: endDate,
        });
      }
    }

    // 按创建时间倒序排列，最新用户在前面
    queryBuilder.orderBy("user.createTime", "DESC");

    const [list, total] = await queryBuilder
      .skip((pageNumSafe - 1) * pageSizeSafe)
      .take(pageSizeSafe)
      .getManyAndCount();

    // 角色名称单独回填
    const userIds = list.map((u) => u.id).filter(Boolean);
    const roleRows = userIds.length
      ? await this.userRoleRepository
          .createQueryBuilder("ur")
          .innerJoin("sys_role", "r", "ur.role_id = r.id")
          .select("ur.user_id", "userId")
          .addSelect("r.name", "roleName")
          .where("ur.user_id IN (:...userIds)", { userIds })
          .andWhere("r.is_deleted = :isDeleted", { isDeleted: 0 })
          .getRawMany<{ userId: string; roleName: string }>()
      : [];

    const userRoleNamesMap = new Map<string, string[]>();
    for (const row of roleRows) {
      const uid = row.userId?.toString();
      if (!uid) continue;
      if (!userRoleNamesMap.has(uid)) userRoleNamesMap.set(uid, []);
      if (row.roleName) userRoleNamesMap.get(uid)!.push(row.roleName);
    }

    // 部门名称单独回填
    const deptIds = Array.from(new Set(list.map((u) => u.deptId).filter(Boolean))) as string[];

    const prevConfig = RequestContext.getDataPermissionConfig();
    RequestContext.setDataPermissionConfig(null);
    const depts = await this.deptService.findByIds(deptIds);
    RequestContext.setDataPermissionConfig(prevConfig);
    const deptMap = new Map<string, string>();
    depts.forEach((d) => deptMap.set(d.id, d.name));

    const data = list.map((u) => {
      const deptIdStr = u.deptId?.toString() ?? null;
      const roleNames = (userRoleNamesMap.get(u.id?.toString()) || []).join(",");
      return {
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        gender: u.gender,
        mobile: u.mobile,
        status: u.status,
        email: u.email || "",
        deptId: deptIdStr,
        deptName: deptIdStr ? deptMap.get(deptIdStr) || null : null,
        roleNames,
        createTime: u.createTime
          ? `${u.createTime.getFullYear()}-${String(u.createTime.getMonth() + 1).padStart(2, "0")}-${String(
              u.createTime.getDate()
            ).padStart(2, "0")} ${String(u.createTime.getHours()).padStart(2, "0")}:${String(
              u.createTime.getMinutes()
            ).padStart(2, "0")}:${String(u.createTime.getSeconds()).padStart(2, "0")}`
          : null,
      };
    });

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
    deptId?: string,
    keywords?: string,
    status?: number,
    createTime?: string[]
  ) {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    queryBuilder.where("user.isDeleted = :isDeleted", { isDeleted: 0 });
    // root 用户（ROOT 角色）不在导出列表中展示
    queryBuilder.andWhere(
      `NOT EXISTS (
        SELECT 1
        FROM sys_user_role sur
          INNER JOIN sys_role r ON sur.role_id = r.id
        WHERE sur.user_id = user.id
          AND r.code = :rootCode
      )`,
      { rootCode: ROOT_ROLE_CODE }
    );

    if (keywords) {
      queryBuilder.andWhere(
        "(user.username LIKE :keywords OR user.nickname LIKE :keywords OR user.mobile LIKE :keywords)",
        { keywords: `%${keywords}%` }
      );
    }

    if (deptId !== undefined && deptId !== null && deptId !== "" && deptId !== "0") {
      queryBuilder.andWhere("user.deptId = :deptId", { deptId: deptId.toString() });
    }

    if (status !== undefined && status !== null) {
      queryBuilder.andWhere("user.status = :status", { status });
    }

    // 日期筛选：createTime 数组 [startTime, endTime]
    if (createTime && createTime.length >= 1) {
      const startTime = createTime[0];
      if (startTime) {
        queryBuilder.andWhere("user.createTime >= :startTime", {
          startTime: new Date(startTime),
        });
      }
    }
    if (createTime && createTime.length >= 2) {
      const endTime = createTime[1];
      if (endTime) {
        const endDate = new Date(endTime);
        endDate.setHours(23, 59, 59, 999);
        queryBuilder.andWhere("user.createTime <= :endTime", {
          endTime: endDate,
        });
      }
    }

    const list = await queryBuilder.orderBy("user.createTime", "DESC").getMany();

    // 角色名称单独回填
    const userIds = list.map((u) => u.id).filter(Boolean);
    const roleRows = userIds.length
      ? await this.userRoleRepository
          .createQueryBuilder("ur")
          .innerJoin("sys_role", "r", "ur.role_id = r.id")
          .select("ur.user_id", "userId")
          .addSelect("r.name", "roleName")
          .where("ur.user_id IN (:...userIds)", { userIds })
          .andWhere("r.is_deleted = :isDeleted", { isDeleted: 0 })
          .getRawMany<{ userId: string; roleName: string }>()
      : [];

    const userRoleNamesMap = new Map<string, string[]>();
    for (const row of roleRows) {
      const uid = row.userId?.toString();
      if (!uid) continue;
      if (!userRoleNamesMap.has(uid)) userRoleNamesMap.set(uid, []);
      if (row.roleName) userRoleNamesMap.get(uid)!.push(row.roleName);
    }

    const deptIds = Array.from(new Set(list.map((u) => u.deptId).filter(Boolean))) as string[];
    const depts = await this.deptService.findByIds(deptIds);
    const deptMap = new Map<string, string>();
    depts.forEach((d) => deptMap.set(d.id, d.name));

    return list.map((u) => {
      const deptIdStr = u.deptId?.toString() ?? null;
      const roleNames = (userRoleNamesMap.get(u.id?.toString()) || []).join(",");
      return {
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        gender: u.gender,
        mobile: u.mobile,
        status: u.status,
        email: u.email || "",
        deptId: deptIdStr,
        deptName: deptIdStr ? deptMap.get(deptIdStr) || null : null,
        roleNames,
        createTime: u.createTime
          ? `${u.createTime.getFullYear()}-${String(u.createTime.getMonth() + 1).padStart(2, "0")}-${String(
              u.createTime.getDate()
            ).padStart(2, "0")} ${String(u.createTime.getHours()).padStart(2, "0")}:${String(
              u.createTime.getMinutes()
            ).padStart(2, "0")}:${String(u.createTime.getSeconds()).padStart(2, "0")}`
          : null,
      };
    });
  }

  /**
   * 获取用户认证凭证信息
   *
   * 用于登录认证阶段，返回用户的基本信息和权限相关数据
   * 权限标识（perms）不在此处获取，而是在权限校验时从角色权限缓存动态读取
   */
  async getAuthCredentialsByUsername(username: string): Promise<UserAuthInfo | null> {
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

    // 获取多角色数据权限列表
    const dataScopes = await this.roleService.getRoleDataScopes(roleCodes);

    // 获取部门树路径
    let deptTreePath = "";
    if (user.deptId) {
      const depts = await this.deptService.findByIds([user.deptId]);
      deptTreePath = depts?.[0]?.treePath || "";
    }

    return {
      id: user.id.toString(),
      username: user.username,
      nickname: user.nickname,
      password: user.password,
      status: user.status,
      deptId: user.deptId?.toString() || "",
      deptTreePath,
      roles: roleCodes,
      dataScopes,
    };
  }

  /**
   * 根据手机号获取用户认证信息（短信登录）
   */
  async findByMobile(mobile: string): Promise<{
    id: string;
    username: string;
    status: number;
    deptId: string;
    deptTreePath: string;
    roles: string[];
    dataScopes: RoleDataScope[];
  } | null> {
    const mobileSafe = mobile?.trim();
    if (!mobileSafe) return null;

    const user = await this.userRepository.findOne({
      where: { mobile: mobileSafe, isDeleted: 0 },
      relations: ["roles"],
    });
    if (!user) return null;

    const roleIds = (user.roles || []).map((role) => role.id);
    const roles = await this.roleService.findRolesByIds(roleIds);
    const roleCodes = roles.map((r) => r.code);

    // 获取多角色数据权限列表
    const dataScopes = await this.roleService.getRoleDataScopes(roleCodes);

    // 获取部门树路径
    let deptTreePath = "";
    if (user.deptId) {
      const depts = await this.deptService.findByIds([user.deptId]);
      deptTreePath = depts?.[0]?.treePath || "";
    }

    return {
      id: user.id.toString(),
      username: user.username,
      status: user.status,
      deptId: user.deptId?.toString() || "",
      deptTreePath,
      roles: roleCodes,
      dataScopes,
    };
  }

  /**
   * 获取当前用户信息
   */
  async findMe(currentUserInfo: CurrentUserInfo): Promise<CurrentUserDto> {
    const userId = currentUserInfo?.userId;
    if (!userId) {
      throw new BusinessException(ErrorCode.ACCESS_TOKEN_INVALID);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
      select: [
        "id",
        "username",
        "nickname",
        "mobile",
        "email",
        "avatar",
        "gender",
        "deptId",
        "createTime",
      ],
    });

    if (!user) {
      throw new BusinessException("用户不存在");
    }

    const userRoles = await this.userRoleRepository.find({
      where: { userId: userId.toString() },
    });

    const roleIds = userRoles?.map((ur) => ur.roleId) || [];
    const roles = roleIds.length ? await this.roleService.findRolesByIds(roleIds) : [];
    const roleCodes = roles.map((r) => r.code);
    const roleNames = roles.map((r) => r.name).join(",");

    let perms: string[] = [];
    if (roleCodes.length) {
      if (roleCodes.includes(ROOT_ROLE_CODE)) {
        perms = await this.rolePermService.getAllPerms();
      } else {
        perms = await this.rolePermService.getPermsByRoleCodes(roleCodes);
      }
    }

    let deptName: string | undefined;
    if (user.deptId) {
      const dept = await this.deptService.findByIds([user.deptId]);
      deptName = dept?.[0]?.name;
    }

    return {
      userId: user.id.toString(),
      username: user.username,
      nickname: user.nickname,
      mobile: user.mobile,
      email: user.email,
      avatar: user.avatar,
      gender: user.gender,
      deptId: user.deptId?.toString(),
      deptName,
      roleNames,
      createTime: user.createTime
        ? `${user.createTime.getFullYear()}-${String(user.createTime.getMonth() + 1).padStart(2, "0")}-${String(
            user.createTime.getDate()
          ).padStart(2, "0")} ${String(user.createTime.getHours()).padStart(2, "0")}:${String(
            user.createTime.getMinutes()
          ).padStart(2, "0")}:${String(user.createTime.getSeconds()).padStart(2, "0")}`
        : undefined,
      roles: roleCodes,
      perms,
    };
  }

  /**
   * 更新当前用户个人信息（个人中心）
   */
  async updateProfile(currentUserInfo: CurrentUserInfo, data: UserProfileDto): Promise<boolean> {
    const userId = currentUserInfo.userId?.toString();
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException("用户不存在");
    }

    const updateData: Partial<SysUser> = {
      nickname: data.nickname,
      avatar: data.avatar,
      gender: data.gender,
    };

    // remove undefined keys
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

    if (Object.keys(updateData).length === 0) {
      throw new BusinessException("未变更数据");
    }

    updateData.updateTime = new Date();

    const result = await this.userRepository.update(userId, updateData as any);
    return result.affected > 0;
  }

  /**
   * 新增用户
   */
  async create(createUserDto: CreateUserDto): Promise<SysUser> {
    const { username, password = DEFAULT_PASSWORD, roleIds } = createUserDto;

    // 检查用户名是否已存在（排除已删除用户）
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
      deptId: createUserDto.deptId?.toString() ?? null,
      createBy: createUserDto.createBy?.toString() ?? null,
      updateBy: createUserDto.updateBy?.toString() ?? null,
      password: hashedPassword,
    });

    // 保存用户
    const savedUser = await this.userRepository.save(user);

    // 保存用户角色关联
    if (roleIds && roleIds.length > 0) {
      const relations = this.userRoleRepository.create(
        roleIds.map((roleId) => ({
          userId: savedUser.id,
          roleId: roleId.toString(),
        }))
      );
      await this.userRoleRepository.save(relations);
    }

    return savedUser;
  }

  async updateUserStatus(userId: string, status: number): Promise<boolean> {
    const result = await this.userRepository.update(
      { id: userId.toString(), isDeleted: 0 },
      { status: Number(status) }
    );
    return (result.affected ?? 0) > 0;
  }

  async resetUserPassword(userId: string, password: string): Promise<boolean> {
    if (!password?.trim()) {
      throw new BusinessException("密码不能为空");
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await this.userRepository.update(
      { id: userId.toString(), isDeleted: 0 },
      { password: hashed }
    );

    const ok = (result.affected ?? 0) > 0;
    if (ok) {
      await this.invalidateUserSessions(userId.toString());
    }
    return ok;
  }

  async changeCurrentUserPassword(userId: string, data: PasswordChangeDto): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
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

  async bindOrChangeMobile(userId: string, data: MobileUpdateDto): Promise<boolean> {
    const mobile = data.mobile?.trim();
    const code = data.code?.trim();
    const password = data.password;

    const user = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
      select: ["id", "password", "mobile"],
    });
    if (!user) {
      throw new BusinessException("用户不存在");
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new BusinessException("当前密码错误");
    }

    const exist = await this.userRepository.findOne({
      where: { mobile, isDeleted: 0, id: Not(userId.toString()) },
      select: ["id"],
    });
    if (exist) {
      throw new BusinessException("手机号已被其他账号绑定");
    }

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
      { id: userId.toString(), isDeleted: 0 },
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

  async bindOrChangeEmail(userId: string, data: EmailUpdateDto): Promise<boolean> {
    const email = data.email?.trim();
    const code = data.code?.trim();
    const password = data.password;

    const user = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
      select: ["id", "password", "email"],
    });
    if (!user) {
      throw new BusinessException("用户不存在");
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new BusinessException("当前密码错误");
    }

    const exist = await this.userRepository.findOne({
      where: { email, isDeleted: 0, id: Not(userId.toString()) },
      select: ["id"],
    });
    if (exist) {
      throw new BusinessException("邮箱已被其他账号绑定");
    }

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
      { id: userId.toString(), isDeleted: 0 },
      { email }
    );
    return (result.affected ?? 0) > 0;
  }

  async unbindMobile(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
      select: ["id", "password", "mobile"],
    });
    if (!user) {
      throw new BusinessException("用户不存在");
    }
    if (!user.mobile?.trim()) {
      throw new BusinessException("当前账号未绑定手机号");
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new BusinessException("当前密码错误");
    }

    user.mobile = null;
    await this.userRepository.save(user);

    const persisted = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
      select: ["mobile"],
    });
    return !persisted?.mobile;
  }

  async unbindEmail(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
      select: ["id", "password", "email"],
    });
    if (!user) {
      throw new BusinessException("用户不存在");
    }
    if (!user.email?.trim()) {
      throw new BusinessException("当前账号未绑定邮箱");
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new BusinessException("当前密码错误");
    }

    user.email = null;
    await this.userRepository.save(user);

    const persisted = await this.userRepository.findOne({
      where: { id: userId.toString(), isDeleted: 0 },
      select: ["email"],
    });
    return !persisted?.email;
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

      const roleIds = await this.roleService.findRoleIdsByCodesOrNames(roleCodes);
      if (!roleIds.length) {
        excelResult.invalidCount++;
        excelResult.messageList.push(`第${line}行：角色不存在或为空`);
        continue;
      }

      let deptId: string | undefined;
      if (deptCode) {
        const dept = await this.deptService.findByCodeOrName(deptCode);
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
        deptId: deptId ?? null,
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
   * 失效指定用户的所有会话
   * - JWT 模式：递增用户 Token 版本号 auth:user:token_version:{userId}
   * - redis-token 模式：删除该用户的 access/refresh 映射
   */
  private async invalidateUserSessions(userId: string): Promise<void> {
    const userIdStr = userId?.toString();
    if (!userIdStr) return;

    const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";

    // JWT 模式：递增 Token 版本号，旧 JWT 全部失效
    const versionKey = `auth:user:token_version:${userIdStr}`;
    const currentVersion = await this.redisCacheService.get<number>(versionKey);
    const nextVersion = (currentVersion ?? 0) + 1;
    await this.redisCacheService.set(versionKey, nextVersion);

    await this.redisCacheService.del(`auth:user:jwt_session:${userIdStr}`);

    // redis-token 模式：清理 access/refresh 映射
    if (sessionType === "redis-token") {
      const accessKey = `auth:user:access:${userIdStr}`;
      const refreshKey = `auth:user:refresh:${userIdStr}`;

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
  async getUserForm(userId: string): Promise<SysUser> {
    return await this.userRepository.findOne({
      where: { id: userId.toString() },
      relations: ["roles"],
    });
  }

  /**
   * 更新用户
   */
  async update(userId: string, updateUserDto: UpdateUserDto) {
    const userIdStr = userId.toString();
    const { username, deptId, roleIds, password } = updateUserDto;

    if (!roleIds?.length) {
      throw new BusinessException("角色不能为空");
    }

    // 检查用户名是否已存在（排除当前用户）
    if (username) {
      const existingUser = await this.userRepository.findOne({
        where: { username, isDeleted: 0 },
        select: ["id"],
      });
      if (existingUser && existingUser.id !== userIdStr) {
        throw new BusinessException("用户名已存在");
      }
    }

    // 更新用户信息
    const user = await this.userRepository.findOne({ where: { id: userIdStr } });
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
      deptId: deptId?.toString() ?? null,
      updateBy: (updateUserDto as any).updateBy?.toString() ?? null,
      password: hashedPassword || user.password, // 如果没有新密码，保留原密码
    });

    const currentUserRoles = await this.userRoleRepository.find({ where: { userId: userIdStr } });
    const currentRoleIds = (currentUserRoles || [])
      .map((ur) => ur.roleId?.toString())
      .filter(Boolean);

    const nextRoleIds = (roleIds || []).map((r) => r?.toString()).filter(Boolean);

    const rolesChanged =
      currentRoleIds.length !== nextRoleIds.length ||
      currentRoleIds.some((r) => !nextRoleIds.includes(r)) ||
      nextRoleIds.some((r) => !currentRoleIds.includes(r));

    if (rolesChanged) {
      await this.userRoleRepository.delete({ userId: userIdStr });
      const userRoles = this.userRoleRepository.create(
        nextRoleIds.map((roleId) => ({
          userId: userIdStr,
          roleId,
        }))
      );
      await this.userRoleRepository.save(userRoles);
    }

    if (rolesChanged) {
      await this.invalidateUserSessions(userIdStr);
    }

    return await this.userRepository.save(user);
  }

  /**
   * 获取用户菜单ID列表
   */
  async getUserMenuIds(userId: string): Promise<string[]> {
    const userIdStr = userId?.toString();
    if (!userIdStr) return [];

    const userRoles = await this.userRoleRepository.find({ where: { userId: userIdStr } });
    const roleIds = (userRoles || []).map((ur) => ur.roleId);
    if (!roleIds.length) return [];

    return await this.roleService.getMenuIdsByRoleIds(roleIds);
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<boolean> {
    const idStr = id?.toString();
    if (!idStr) {
      throw new BusinessException("用户ID不能为空");
    }

    const user = await this.userRepository.findOne({ where: { id: idStr, isDeleted: 0 } });
    if (!user) {
      return true;
    }

    // 系统管理员禁止删除
    const userRoles = await this.userRoleRepository.find({ where: { userId: idStr } });
    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length > 0) {
      const roles = await this.roleService.findRolesByIds(roleIds);
      if (roles.some((r) => r.code === ROOT_ROLE_CODE)) {
        throw new BusinessException("系统管理员禁止删除");
      }
    }

    // 开启事务处理
    return await this.userRepository.manager.transaction(async (manager) => {
      await manager.delete(SysUserRole, { userId: idStr });

      const result = await manager.update(
        SysUser,
        { id: idStr, isDeleted: 0 },
        { isDeleted: 1, updateTime: new Date() as any }
      );

      await this.invalidateUserSessions(idStr);

      return (result.affected ?? 0) > 0;
    });
  }

  /**
   * 获取用户表单数据
   */
  async getUserFormData(id: string): Promise<UserFormDto> {
    const idStr = id?.toString();
    if (!idStr) {
      throw new BusinessException("用户ID不能为空");
    }

    const user = await this.userRepository.findOne({
      where: { id: idStr, isDeleted: 0 },
      relations: ["roles"],
    });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return {
      id: user.id.toString(),
      username: user.username,
      nickname: user.nickname,
      mobile: user.mobile,
      gender: user.gender,
      avatar: user.avatar,
      email: user.email || "",
      status: user.status,
      deptId: user.deptId?.toString() ?? "",
      roleIds: (user.roles || []).map((r) => r.id.toString()),
    };
  }
}
