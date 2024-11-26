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
  @Get()
  findAll() {
    return this.userService.findAll();
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
    summary: '用户批量删除', // 接口描述信息
  })
  @Delete(':ids')
  async deleteDictItems(@Param('ids') ids: string) {
    try {
      const idArray = ids.split(',');

      for (const id of idArray) {
        const success = await this.userService.removeItem(id);
        if (!success) {
          throw new HttpException(
            `Failed to delete department with ID: ${id}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return '操作成功';
    } catch (error) {
      // 处理错误逻辑
      throw new ApiException(error, BusinessErrorCode.DB_QUERY_ERROR);
      // throw new Error('操作失败');
    }
  }
  @ApiOperation({
    summary: '用户删除', // 接口描述信息
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
