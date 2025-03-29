import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Query,
  Put,
  Inject,
  UseGuards,
  UseInterceptors,
  SetMetadata,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { BusinessException } from "../../common/exceptions/business.exception";
import { DEFAULT_PASSWORD } from "src/common/constants";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { CurrentUserDto } from "./dto/current-user.dto";
import { DataScopeGuard } from "src/common/guards/data-scope.guard";
import { DataScopeInterceptor } from "src/common/interceptors/data-scope.interceptor";
import { CurrentUserInfo } from "src/common/interfaces/current-user.interface";

@ApiTags("02.用户接口")
@Controller("users")
@UseGuards(DataScopeGuard)
@UseInterceptors(DataScopeInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: "用户分页列表" })
  @Get("page")
  @SetMetadata("resource", "sys_user")
  async findUserPage(
    @Query("page") page: number,
    @Query("size") size: number,
    @Query("keywords") keywords: string,
    @Query("status") status: number,
    @Query("startTime") startTime: string,
    @Query("deptId") deptId: string,
    @Query("endTime") endTime: string
  ) {
    return await this.userService.findUserPage(
      page,
      size,
      deptId,
      keywords,
      status,
      startTime,
      endTime
    );
  }

  @ApiOperation({ summary: "获取当前用户信息" })
  @Get("me")
  async findMe(@CurrentUser() currentUser: CurrentUserInfo): Promise<CurrentUserDto> {
    return await this.userService.findMe(currentUser);
  }

  @ApiOperation({ summary: "新增用户" })
  @Post()
  async create(@CurrentUser("userId") currentUserId: string, @Body() createUserDto: CreateUserDto) {
    return await this.userService.create({
      ...createUserDto,
      password: DEFAULT_PASSWORD,
    });
  }

  @ApiOperation({ summary: "获取用户表单数据" })
  @Get(":id/form")
  getUserForm(@Param("id") id: string) {
    return this.userService.getUserForm(id);
  }

  @ApiOperation({ summary: "修改用户" })
  @Put(":id")
  updateMenu(
    @CurrentUser("userId") currentUserId: string,
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto
  ): any {
    return this.userService.update(id, {
      ...updateUserDto,
    });
  }

  @ApiOperation({ summary: "删除用户" })
  @Delete(":ids")
  async deleteUser(@Param("ids") ids: string) {
    const idArray = ids.split(",");
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
