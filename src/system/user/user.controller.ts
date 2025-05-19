import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
  UseInterceptors,
  SetMetadata,
  Req,
  Logger,
  Inject,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BusinessException } from "../../common/exceptions/business.exception";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentUserDto } from "./dto/current-user.dto";
import { CurrentUserInfo } from "../../common/interfaces/current-user.interface";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger as WinstonLogger } from "winston";

@ApiTags("02.用户接口")
@Controller("users")
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger
  ) {}

  @ApiOperation({ summary: "用户分页列表" })
  @Get("page")
  @SetMetadata("resource", "sys_user")
  async getUserPage(
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Query("deptId") deptId?: number,
    @Query("keywords") keywords?: string,
    @Query("status") status?: number,
    @Query("startTime") startTime?: string,
    @Query("endTime") endTime?: string
  ) {
    this.logger.info("Fetching user list", {
      context: "UserController",
      metadata: { page: pageNum, pageSize: pageSize },
    });
    return await this.userService.getUserPage(
      pageNum,
      pageSize,
      deptId,
      keywords,
      status,
      startTime,
      endTime
    );
  }

  @ApiOperation({ summary: "获取当前登录用户信息" })
  @Get("me")
  async getCurrentUser(@Req() req) {
    return await this.userService.findMe(req.user);
  }

  @ApiOperation({ summary: "新增用户" })
  @Post()
  async create(@CurrentUser("userId") currentUserId: number, @Body() createUserDto: CreateUserDto) {
    return await this.userService.create({
      ...createUserDto,
      createBy: currentUserId,
    });
  }

  @ApiOperation({ summary: "获取用户表单数据" })
  @Get(":id/form")
  async getUserForm(@Param("id") id: number) {
    return await this.userService.getUserForm(id);
  }

  @ApiOperation({ summary: "修改用户" })
  @Put(":id")
  async update(
    @CurrentUser("userId") currentUserId: number,
    @Param("id") id: number,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return await this.userService.update(id, {
      ...updateUserDto,
      updateBy: currentUserId,
    });
  }

  @ApiOperation({ summary: "删除用户" })
  @Delete(":ids")
  async deleteUsers(@Param("ids") ids: string) {
    const idArray = ids.split(",").map((id) => Number(id));
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
}
