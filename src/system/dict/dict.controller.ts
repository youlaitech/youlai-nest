import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  SetMetadata,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsCreateBy, IsUpdateBy, Permissions } from "../../common/decorators/public.decorator";
import { DictService } from "./dict.service";
import { DictFormDto } from "./dto/create-dict.dto";
import { UpdateDictDto } from "./dto/update-dict.dto";
import { CreateDictItemDto } from "./dto/create-dict-item.dto";
import { UpdateDictItemDto } from "./dto/update-dict-item.dto";
import { DictQueryDto } from "./dto/dict-query.dto";
import { DictItemQueryDto } from "./dto/dict-item-query.dto";

@ApiTags("06.字典接口")
@Controller("dicts")
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @ApiOperation({ summary: "字典分页列表" })
  @Get()
  @SetMetadata("resource", "sys_dict")
  async getDictPage(@Query() query: DictQueryDto) {
    return await this.dictService.getDictPage(query.pageNum, query.pageSize, query.keywords);
  }

  @ApiOperation({ summary: "字典下拉选项" })
  @Get("options")
  async getDictOptions() {
    return await this.dictService.getDictOptions();
  }

  @ApiOperation({ summary: "新增字典" })
  @IsCreateBy()
  @Post()
  @Permissions("sys:dict:create")
  async createDict(@Body() dictFormDto: DictFormDto) {
    return await this.dictService.createDict(dictFormDto);
  }

  @ApiOperation({ summary: "字典表单" })
  @Get(":id/form")
  @Permissions("sys:dict:update")
  async getDictForm(@Param("id") id: string) {
    return await this.dictService.getDictForm(id);
  }

  @ApiOperation({ summary: "更新字典" })
  @IsUpdateBy()
  @Put(":id")
  @Permissions("sys:dict:update")
  async updateDict(@Param("id") id: string, @Body() updateDictDto: UpdateDictDto) {
    return await this.dictService.updateDict(id, updateDictDto);
  }

  @ApiOperation({ summary: "删除字典" })
  @IsUpdateBy()
  @Delete(":ids")
  @Permissions("sys:dict:delete")
  async deleteDict(@Param("ids") ids: string) {
    const idArray = ids
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    for (const id of idArray) {
      const success = await this.dictService.deleteDict(id, 1);
      if (!success) {
        throw new HttpException(`删除字典失败: ${id}`, HttpStatus.BAD_REQUEST);
      }
    }
    return true;
  }

  @ApiOperation({ summary: "字典项分页列表" })
  @Get(":dictCode/items")
  @Permissions("sys:dict:update")
  async getDictItemPage(@Param("dictCode") dictCode: string, @Query() query: DictItemQueryDto) {
    return await this.dictService.getDictItemPage(
      query.pageNum,
      query.pageSize,
      dictCode,
      query.keywords
    );
  }

  @ApiOperation({ summary: "获取列表" })
  @Get(":dictCode/items/options")
  async getDictItems(@Param("dictCode") dictCode: string) {
    return await this.dictService.getDictItems(dictCode);
  }

  @ApiOperation({ summary: "新增字典项" })
  @IsCreateBy()
  @Post(":dictCode/items")
  @Permissions("sys:dict-item:create")
  async createDictItem(
    @Param("dictCode") dictCode: string,
    @Body() createDictItemDto: CreateDictItemDto
  ) {
    createDictItemDto.dictCode = dictCode;
    return await this.dictService.createDictItem(createDictItemDto);
  }

  @ApiOperation({ summary: "字典项表单数据" })
  @Get(":dictCode/items/:itemId/form")
  @Permissions("sys:dict:update")
  async getDictItemForm(@Param("itemId") itemId: string) {
    return await this.dictService.getDictItemForm(itemId);
  }

  @ApiOperation({ summary: "更新字典项" })
  @IsUpdateBy()
  @Put(":dictCode/items/:itemId")
  @Permissions("sys:dict-item:update")
  async updateDictItem(
    @Param("itemId") itemId: string,
    @Body() updateDictItemDto: UpdateDictItemDto
  ) {
    return await this.dictService.updateDictItem(itemId, updateDictItemDto);
  }

  @ApiOperation({ summary: "删除字典项" })
  @IsUpdateBy()
  @Delete(":dictCode/items/:itemIds")
  @Permissions("sys:dict-item:delete")
  async deleteDictItems(@Param("itemIds") itemIds: string) {
    const idArray = itemIds
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    for (const id of idArray) {
      await this.dictService.deleteDictItems(id);
    }
    return true;
  }
}
