import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  HttpException,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Users } from './schemas/user.schema';
import { ApiException } from '../common/http-exception/api.exception';
import { BusinessErrorCode } from '../common/enums/business-error-code.enum';

@ApiTags('用户模块')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: '创建用户', // 接口描述信息
  })
  @Post()
  async create(@Req() request, @Body() createUserDto: CreateUserDto) {
    return await this.userService.create({
      ...createUserDto,
      createBy: request['user']?.sub,
      deptTreePath: request['user']?.deptTreePath || '0',
      password: '123456', // 先写死
    });
  }
  @Get('me')
  async getMe(@Req() request): Promise<Users> {
    const id = request['user']?.userId || '';
    return await this.userService.findMe(id);
  }
  @ApiOperation({
    summary: '获取用户分页查询', // 接口描述信息
  })
  @Get('page')
  async getRolesByPage(
    @Req() request,
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('keywords') keywords: string,
    @Query('status') status: number,
    @Query('startTime') startTime: string,
    @Query('deptId') deptId: string,
    @Query('endTime') endTime: string,
  ) {
    const deptTreePath = request['user']?.deptTreePath || '0';
    return await this.userService.findSearch(
      page,
      size,
      deptId,
      keywords,
      status,
      startTime,
      endTime,
      deptTreePath,
    );
  }
  @ApiOperation({
    summary: '用户表单获取', // 接口描述信息
  })
  @Get(':id/form')
  findform(@Param('id') id: string) {
    return this.userService.findFrom(id);
  }
  @ApiOperation({
    summary: '修改用户', // 接口描述信息
  })
  @Put(':id')
  updateMenu(@Param('id') id: string, @Body() menuData: any): any {
    return this.update(id, menuData);
  }
  @ApiOperation({
    summary: '用户列表查询',
  })
  @Get()
  findAll(
    @Query('pageNum') pageNum: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('username') username?: string,
    @Query('nickname') nickname?: string,
    @Query('status') status?: number,
  ) {
    return this.userService.findAll({
      pageNum,
      pageSize,
      username,
      nickname,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @ApiOperation({
    summary: '批量删除用户',
  })
  @Delete(':ids')
  async deleteDictItems(@Param('ids') ids: string) {
    const idArray = ids.split(',');
    const results = await Promise.all(
      idArray.map(async (id) => {
        const success = await this.userService.removeItem(id);
        if (!success) {
          throw new ApiException(
            `删除用户失败: ${id}`,
            BusinessErrorCode.USER_DELETE_ERROR,
          );
        }
        return success;
      })
    );

    return {
      success: true,
      message: `成功删除 ${results.filter(Boolean).length} 个用户`,
    };
  }
  @ApiOperation({
    summary: '用户删除', // 接口描述信息
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
