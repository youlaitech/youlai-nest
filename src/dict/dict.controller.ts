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
  HttpStatus, Req,
} from '@nestjs/common';
import { DictService } from './dict.service';
import { DictFormDto } from './dto/create-dict.dto';
import { UpdateDictDto } from './dto/update-dict.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
// import { UpdateRoleDto } from '../role/dto/update-role.dto';
import { ApiException } from '../common/http-exception/api.exception';
import { BusinessErrorCode } from '../common/enums/business-error-code.enum';
import { IsCreateBy, IsUpdateBy } from '../common/public/public.decorator';
@ApiTags('字典类型')
@Controller('dict')
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @ApiOperation({
    summary: '字典分页查询', // 接口描述信息
  })
  @Get('types/page')
  async getDictTypeByPage(
    @Query('pageNum') pageNum: number,
    @Query('pageSize') pageSize: number,
    @Query('keywords') keywords: string,
  ) {
    return await this.dictService.findTypeSearch(pageNum, pageSize, keywords);
  }
  @ApiOperation({
    summary: '字典新增', // 接口描述信息
  })
  @IsCreateBy()
  @Post()
  create(@Req() request,@Body() dictFormDto: DictFormDto) {

    return this.dictService.create({
      ...dictFormDto,
      createBy: request['user']?.userId,
      deptTreePath: request['user']?.deptTreePath || '0',
    });
  }
  @ApiOperation({
    summary: '字典项分页查询', // 接口描述信息
  })
  @Get('page')
  async getDictPage(
    @Query('pageNum') pageNum: number,
    @Query('pageSize') pageSize: number,
    @Query('name') keywords: string,
  ) {
    return await this.dictService.findSearch(pageNum, pageSize, keywords);
  }

  @ApiOperation({
    summary: '获取字典拉列表', // 接口描述信息
  })
  @Get(':typeCode/options')
  async GetOptions(@Param('typeCode') typeCode: string) {
    return await this.dictService.findOptions(typeCode);
  }
  @ApiOperation({
    summary: '字典修改', // 接口描述信息
  })
  @Put('types/:id')
  async updateDict(
    @Param('id') id: string,
    @Body() menuData: any,
  ): Promise<any> {
    menuData.updateTime = Date.now().toString();
    return await this.dictService.update(id, menuData);
  }
  @ApiOperation({
    summary: '字典表单',
  })
  @Get(':id/form')
  findOne(@Param('id') id: string) {
    return this.dictService.findOne(id);
  }
  @ApiOperation({
    summary: '字典项修改', // 接口描述信息
  })
  @Put(':id')
  @IsUpdateBy()
  @IsCreateBy()
  async updateDictItem(
    @Param('id') id: string,
    @Body() menuData: DictFormDto,
  ): Promise<any> {
    return await this.dictService.updateDict(id, menuData);
  }
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDictDto: UpdateDictDto) {
    return await this.dictService.update(id, updateDictDto);
  }

  @ApiOperation({
    summary: '获取字典列表', // 接口描述信息
  })
  @Get('list')
  async getDictList() {
    return await this.dictService.findDictList();
  }

  @ApiOperation({
    summary: '字典批量删除', // 接口描述信息
  })
  @IsUpdateBy()
  @Delete(':ids')
  async deleteDict(@Body() body, @Param('ids') ids: string) {
    try {
      console.log(body, ids);
      const idArray = ids.split(',');

      for (const id of idArray) {
        const success = await this.dictService.remove(
          id,
          body.updateBy,
          body.updateTime,
        );
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
}
