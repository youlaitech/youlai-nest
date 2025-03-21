import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { DeptService } from "./dept.service";
import { CreateDeptDto } from "./dto/create-dept.dto";
import { UpdateDeptDto } from "./dto/update-dept.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("05.部门接口")
@Controller("dept")
export class DeptController {
  constructor(private readonly deptService: DeptService) {}

  @ApiOperation({ summary: "获取部门属性表格列表" })
  @Get()
  async findAll(
    @Req() request,
    @Query("keywords") keywords: string,
    @Query("status") status: string
  ) {
    const deptTreePath = request["user"]?.deptTreePath || "0";
    return await this.deptService.findAll(keywords, status, deptTreePath);
  }

  @ApiOperation({ summary: "获取部门下拉树形列表" })
  @Get("options")
  async getOptions(@Req() request) {
    const deptTreePath = request["user"]?.deptTreePath || "0";
    return await this.deptService.findAllOptions(deptTreePath);
  }

  @ApiOperation({ summary: "创建部门" })
  @Post()
  async create(@Req() request, @Body() createDeptDto: CreateDeptDto) {
    return await this.deptService.create({
      ...createDeptDto,
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "获取部门表单" })
  @Get(":id/form")
  async findOne(@Param("id") id: string) {
    return this.deptService.findOne(id);
  }

  @ApiOperation({ summary: "编辑部门" })
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDeptDto: UpdateDeptDto) {
    return this.deptService.update(id, updateDeptDto);
  }

  @ApiOperation({ summary: "删除部门" })
  @Delete(":ids")
  async deleteDepartments(@Param("ids") ids: string) {
    const idArray = ids.split(",");

    for (const id of idArray) {
      const success = await this.deptService.deleteDept(id);
      if (!success) {
        throw new HttpException(
          `Failed to delete department with ID: ${id}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
    return { message: "Departments deleted successfully" };
  }
}
