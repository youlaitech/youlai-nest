import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  SetMetadata,
  Req,
  Res,
  Patch,
  UploadedFile,
  UseInterceptors,
  Inject,
} from "@nestjs/common";
import type { Response } from "express";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BusinessException } from "../../common/exceptions/business.exception";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { CurrentUserInfo } from "src/common/interfaces/current-user.interface";
import { FileInterceptor } from "@nestjs/platform-express";
import { PasswordChangeDto } from "./dto/password-change.dto";
import { MobileUpdateDto } from "./dto/mobile-update.dto";
import { EmailUpdateDto } from "./dto/email-update.dto";
import { PasswordVerifyDto } from "./dto/password-verify.dto";
import { UserProfileDto } from "./dto/user-profile.dto";
import * as XLSX from "xlsx";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger as WinstonLogger } from "winston";

/**
 * 用户接口控制器
 */
@ApiTags("02.用户接口")
@Controller("users")
export class UserController {
  private readonly userService: UserService;
  private readonly logger: WinstonLogger;

  constructor(userService: UserService, @Inject(WINSTON_MODULE_PROVIDER) logger: WinstonLogger) {
    this.userService = userService;
    this.logger = logger;
  }

  /**
   * 用户分页列表
   */
  @ApiOperation({ summary: "用户分页列表" })
  @Get()
  @SetMetadata("resource", "sys_user")
  async getUserList(@Query() queryParams: UserQueryDto) {
    this.logger.info("获取用户分页列表", {
      context: "UserController",
      metadata: {
        pageNum: queryParams.pageNum,
        pageSize: queryParams.pageSize,
        keywords: queryParams.keywords,
      },
    });

    return await this.userService.getUserPage(
      queryParams.pageNum,
      queryParams.pageSize,
      queryParams.deptId,
      queryParams.keywords,
      queryParams.status,
      queryParams.startTime,
      queryParams.endTime
    );
  }

  @ApiOperation({ summary: "获取当前登录用户信息" })
  @Get("me")
  async getCurrentUser(@CurrentUser() currentUser: CurrentUserInfo) {
    return await this.userService.findMe(currentUser);
  }

  @ApiOperation({ summary: "获取个人中心用户信息" })
  @Get("profile")
  async getUserProfile(@CurrentUser() currentUser: CurrentUserInfo) {
    return await this.userService.findMe(currentUser);
  }

  @ApiOperation({ summary: "个人中心修改用户信息" })
  @Put("profile")
  async updateUserProfile(@Req() req, @Body() profileDto: UserProfileDto) {
    return await this.userService.updateProfile(req.user, profileDto);
  }

  @ApiOperation({ summary: "新增用户" })
  @Post()
  async create(@CurrentUser("userId") currentUserId: string, @Body() createUserDto: CreateUserDto) {
    return await this.userService.create({
      ...createUserDto,
      createBy: currentUserId,
    });
  }

  @ApiOperation({ summary: "获取用户表单数据" })
  @Get(":userId/form")
  async getUserForm(@Param("userId") userId: string) {
    const id = userId?.trim();
    if (!id || !/^\d+$/.test(id)) {
      throw new BusinessException("用户ID非法");
    }
    return await this.userService.getUserFormData(id);
  }

  @ApiOperation({ summary: "修改用户" })
  @Put(":id")
  async update(
    @CurrentUser("userId") currentUserId: string,
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const userId = id?.trim();
    if (!userId || !/^\d+$/.test(userId)) {
      throw new BusinessException("用户ID非法");
    }
    return await this.userService.update(userId, {
      ...updateUserDto,
      updateBy: currentUserId,
    });
  }

  @ApiOperation({ summary: "删除用户" })
  @Delete(":ids")
  async deleteUsers(@Param("ids") ids: string) {
    const idArray = ids
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const results = await Promise.all(
      idArray.map(async (id) => {
        const success = await this.userService.deleteUser(id);
        if (!success) {
          throw new BusinessException(`删除用户失败: ${id}`);
        }
        return success;
      })
    );

    return {
      success: true,
      message: `成功删除 ${results.filter(Boolean).length} 个用户`,
    };
  }

  @ApiOperation({ summary: "修改用户状态" })
  @Patch(":userId/status")
  async updateUserStatus(@Param("userId") userId: string, @Query("status") status: number) {
    const id = userId?.trim();
    if (!id || !/^\d+$/.test(id)) {
      throw new BusinessException("用户ID非法");
    }
    const success = await this.userService.updateUserStatus(id, status);
    return { success };
  }

  @ApiOperation({ summary: "用户导入模板下载" })
  @Get("template")
  @SetMetadata("skipResponseTransform", true)
  async downloadTemplate(@Res() res: Response) {
    const headers = ["用户名", "昵称", "性别", "手机号码", "邮箱", "角色", "部门"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "用户导入模板");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = "用户导入模板.xlsx";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(fileName)}`);
    res.send(buffer);
  }

  @ApiOperation({ summary: "导入用户" })
  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  async importUsers(@UploadedFile() file: any) {
    if (!file?.buffer) {
      throw new BusinessException("导入文件不能为空");
    }
    return await this.userService.importUsersFromBuffer(file.buffer);
  }

  @ApiOperation({ summary: "导出用户" })
  @Get("export")
  @SetMetadata("skipResponseTransform", true)
  async exportUsers(@Res() res: Response, @Query() queryParams: UserQueryDto) {
    const exportList = await this.userService.listExportUsers(
      queryParams.deptId,
      queryParams.keywords,
      queryParams.status,
      queryParams.startTime,
      queryParams.endTime
    );

    const headers = ["用户名", "用户昵称", "部门", "性别", "手机号码", "邮箱", "创建时间"];
    const rows = exportList.map((u) => [
      u.username ?? "",
      u.nickname ?? "",
      u.deptName ?? "",
      u.gender ?? "",
      u.mobile ?? "",
      u.email ?? "",
      u.createTime ?? "",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "用户列表");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const fileName = "用户列表.xlsx";
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  }

  @ApiOperation({ summary: "重置指定用户密码" })
  @Put(":userId/password/reset")
  async resetUserPassword(@Param("userId") userId: string, @Query("password") password: string) {
    const id = userId?.trim();
    if (!id || !/^\d+$/.test(id)) {
      throw new BusinessException("用户ID非法");
    }
    const success = await this.userService.resetUserPassword(id, password);
    return { success };
  }

  @ApiOperation({ summary: "当前用户修改密码" })
  @Put("password")
  async changeCurrentUserPassword(
    @CurrentUser("userId") currentUserId: string,
    @Body() data: PasswordChangeDto
  ) {
    return await this.userService.changeCurrentUserPassword(currentUserId, data);
  }

  @ApiOperation({ summary: "发送短信验证码（绑定或更换手机号）" })
  @Post("mobile/code")
  async sendMobileCode(@Query("mobile") mobile: string) {
    return await this.userService.sendMobileCode(mobile);
  }

  @ApiOperation({ summary: "绑定或更换手机号" })
  @Put("mobile")
  async bindOrChangeMobile(
    @CurrentUser("userId") currentUserId: string,
    @Body() data: MobileUpdateDto
  ) {
    return await this.userService.bindOrChangeMobile(currentUserId, data);
  }

  @ApiOperation({ summary: "解绑手机号" })
  @Delete("mobile")
  async unbindMobile(
    @CurrentUser("userId") currentUserId: string,
    @Body() data: PasswordVerifyDto
  ) {
    return await this.userService.unbindMobile(currentUserId, data.password);
  }

  @ApiOperation({ summary: "发送邮箱验证码（绑定或更换邮箱）" })
  @Post("email/code")
  async sendEmailCode(@Query("email") email: string) {
    await this.userService.sendEmailCode(email);
    return true;
  }

  @ApiOperation({ summary: "绑定或更换邮箱" })
  @Put("email")
  async bindOrChangeEmail(
    @CurrentUser("userId") currentUserId: string,
    @Body() data: EmailUpdateDto
  ) {
    return await this.userService.bindOrChangeEmail(currentUserId, data);
  }

  @ApiOperation({ summary: "解绑邮箱" })
  @Delete("email")
  async unbindEmail(@CurrentUser("userId") currentUserId: string, @Body() data: PasswordVerifyDto) {
    return await this.userService.unbindEmail(currentUserId, data.password);
  }

  @ApiOperation({ summary: "获取用户下拉选项" })
  @Get("options")
  async listUserOptions() {
    return await this.userService.listUserOptions();
  }
}
