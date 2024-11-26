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
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../common/http-exception/api.exception';
import { BusinessErrorCode } from '../common/enums/business-error-code.enum';
import { Route, typeMapValue, typeMap } from './interface/menu.type';

@ApiTags('菜单权限模块')
@Controller('menus')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  async create(@Req() request, @Body() createMenuDto: CreateMenuDto) {
    return await this.menuService.create({
      ...createMenuDto,
      type: typeMapValue.get(createMenuDto.type),
      createBy: request['user']?.userId,
      deptTreePath: request['user']?.deptTreePath || '0',
    });
  }
  @ApiOperation({
    summary: '查询菜单列表', // 接口描述信息
  })
  @Get('routes')
  async findMenu(@Req() request): Promise<Route[]> {
    try {
      const id = request['user']?.userId || '';

      const permIds = await this.menuService.findRouteIDs(id);
      const data = await this.menuService.findRoutes(permIds);
      return data;
    } catch (error) {
      console.log(error);
      // 处理错误逻辑
      throw new ApiException(error, BusinessErrorCode.DB_QUERY_ERROR);
    }
  }
  @ApiOperation({
    summary: '查询菜单', // 接口描述信息
  })
  @Get()
  async findAll(@Query('keywords') keywords: string) {
    return await this.menuService.findSearch(keywords);
  }
  @ApiOperation({
    summary: '获取菜单下拉树形列表', // 接口描述信息
  })
  @Get('options')
  async GetOptions() {
    return await this.menuService.findOptions();
  }
  @ApiOperation({
    summary: '获取菜单表单数据', // 接口描述信息
  })
  @Get(':id/form')
  async findOne(@Param('id') id: string): Promise<any> {
    const form = await this.menuService.findOne(id);
    const data = { ...form, id: form._id, type: typeMap.get(form.type) };
    delete data._id;
    return data;
  }
  @ApiOperation({
    summary: '修改菜单', // 接口描述信息
  })
  @Put(':id')
  updateMenu(@Param('id') id: string, @Body() menuData: any): any {
    return this.update(id, menuData);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return await this.menuService.update(id, {
      ...updateMenuDto,
      type: typeMapValue.get(updateMenuDto.type),
    });
  }
  @ApiOperation({
    summary: '删除菜单', // 接口描述信息
  })
  @Delete(':id')
  remove(@Param('id') _id: string) {
    return this.menuService.remove(_id);
  }
}
