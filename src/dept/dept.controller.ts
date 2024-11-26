import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { DeptService } from './dept.service';
import { CreateDeptDto } from './dto/create-dept.dto';
import { UpdateDeptDto } from './dto/update-dept.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { matchDeptPath } from '../common/shared/regex-utils';
@ApiTags('部门模块')
@Controller('dept')
export class DeptController {
  constructor(private readonly deptService: DeptService) {}
  @ApiOperation({
    summary: '部门创造',
  })
  @Post()
  async create(@Req() request, @Body() createDeptDto: CreateDeptDto) {
    return await this.deptService.create({
      ...createDeptDto,
      createBy: request['user']?.userId,
      deptTreePath: request['user']?.deptTreePath || '0',
    });
  }

  @Get()
  async findAll(
    @Req() request,
    @Query('keywords') keywords: string,
    @Query('status') status: string,
  ) {
    const deptTreePath = request['user']?.deptTreePath || '0';
    return await this.deptService.findSearch(keywords, status, deptTreePath);
  }
  @ApiOperation({
    summary: '获取部门下拉树形列表', // 接口描述信息
  })
  @Get('options')
  async getOptions(@Req() request) {
    const deptTreePath = request['user']?.deptTreePath || '0';
    return await this.deptService.findAllOptions(deptTreePath);
  }
  @ApiOperation({
    summary: '获取部门表单', // 接口描述信息
  })
  @Get(':id/form')
  async findOne(@Param('id') id: string) {
    return this.deptService.findOne(id);
  }
  @ApiOperation({
    summary: '部门编辑', // 接口描述信息
  })
  @Put(':id')
  updateMenu(@Param('id') id: string, @Body() menuData: any): any {
    return this.deptService.update(id, menuData);
  }
  @ApiOperation({
    summary: '部门更新', // 接口描述信息
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeptDto: UpdateDeptDto) {
    return this.deptService.update(id, updateDeptDto);
  }
  //  做个好的方法
  @ApiOperation({
    summary: '部门批量删除', // 假删
  })
  @Delete(':ids')
  async deleteDepartments(@Param('ids') ids: string) {
    const idArray = ids.split(',');

    for (const id of idArray) {
      const success = await this.deptService.deleted(id);
      if (!success) {
        throw new HttpException(
          `Failed to delete department with ID: ${id}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return { message: 'Departments deleted successfully' };
  }
}
