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
  Put,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../common/http-exception/api.exception';
import { BusinessErrorCode } from '../common/enums/business-error-code.enum';

@ApiTags('角色模块')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({
    summary: '角色新增', // 接口描述信息
  })
  @Post()
  create(@Req() request, @Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create({
      ...createRoleDto,
      createBy: request['user']?.userId,
      deptTreePath: request['user']?.deptTreePath || '0',
    });
  }
  @ApiOperation({
    summary: '角色查询', // 接口描述信息
  })
  @Get('page')
  async getRolesByPage(
    @Req() request,
    @Query('pageNum') pageNum: number,
    @Query('pageSize') pageSize: number,
    @Query('keywords') keywords: string,
  ) {
    const deptTreePath = request['user']?.deptTreePath || '0';
    return await this.rolesService.findSearch(
      pageNum,
      pageSize,
      keywords,
      deptTreePath,
    );
  }
  @ApiOperation({
    summary: '角色表单', // 接口描述信息
  })
  @Get(':id/form')
  async findForm(@Param('id') id: string) {
    return await this.rolesService.findOne(id);
  }
  @ApiOperation({
    summary: '获取角色下拉列表', // 接口描述信息
  })
  @Get('options')
  async GetOptions(@Req() request) {
    const ascription = request['user']?.ascription;
    //  没有归属

    const _id = ascription
      ? [request['user']?.userId]
      : ['', request['user']?.userId];
    return await this.rolesService.findOptions(_id);
  }
  @ApiOperation({
    summary: '角色修改', // 接口描述信息
  })
  @Put(':id')
  async updateRole(
    @Param('id') id: string,
    @Body() menuData: any,
  ): Promise<any> {
    menuData.updateTime = Date.now().toString();
    return await this.update(id, menuData);
  }
  @ApiOperation({
    summary: '角色批量删除', // 接口描述信息
  })
  @Delete(':ids')
  async deleteDepartments(@Param('ids') ids: string) {
    try {
      const idArray = ids.split(',');

      for (const id of idArray) {
        const success = await this.rolesService.remove(id);
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
    summary: '获取角色权限', // 接口描述信息
  })
  @Get(':id/menuIds')
  async findMenuIds(@Param('id') id: string) {
    const data = await this.rolesService.findOne(id);
    return data.menus;
  }
  @ApiOperation({
    summary: '角色权限分配', // 接口描述信息
  })
  @Put(':id/menus')
  async updateMenus(
    @Param('id') id: string,
    @Body() menuData: any,
  ): Promise<any> {
    return await this.rolesService.updateMenus(id, menuData);
  }
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return await this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
