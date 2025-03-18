import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  HttpException,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { DictService } from "./dict.service";
import { DictFormDto } from "./dto/create-dict.dto";
import { UpdateDictDto } from "./dto/update-dict.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsCreateBy, IsUpdateBy } from "../../common/public/public.decorator";

@ApiTags("06.字典接口")
@Controller("dict")
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @ApiOperation({ summary: "字典分页列表" })
  @Get("page")
  async getDictPage(
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Query("name") keywords: string
  ) {
    return await this.dictService.findSearch(pageNum, pageSize, keywords);
  }

  @ApiOperation({ summary: "获取字典列表" })
  @Get("list")
  async getDictList() {
    return await this.dictService.findDictList();
  }

  @ApiOperation({ summary: "新增字典" })
  @IsCreateBy()
  @Post()
  create(@Req() request, @Body() dictForm: DictFormDto) {
    return this.dictService.create({
      ...dictForm,
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "字典表单" })
  @Get(":id/form")
  findOne(@Param("id") id: string) {
    return this.dictService.findOne(id);
  }

  @ApiOperation({ summary: "修改字典" })
  @Put(":id")
  async update(@Param("id") id: string, @Body() updateDictDto: UpdateDictDto) {
    return await this.dictService.update(id, updateDictDto);
  }

  @ApiOperation({ summary: "删除字典" })
  @IsUpdateBy()
  @Delete(":ids")
  async deleteDict(@Body() body, @Param("ids") ids: string) {
    const idArray = ids.split(",");

    for (const id of idArray) {
      const success = await this.dictService.remove(id, body.updateBy, body.updateTime);
      if (!success) {
        throw new HttpException(
          `Failed to delete department with ID: ${id}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
    return "操作成功";
  }
}
