import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

/**
 * 字典项更新参数
 */
export class UpdateDictItemDto {
  @ApiProperty({ description: "字典编码" })
  @IsString()
  @IsOptional()
  dictCode?: string;

  @ApiProperty({ description: "字典项标签" })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ description: "字典项值" })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiProperty({ description: "排序" })
  @IsNumber()
  @IsOptional()
  sort?: number;

  @ApiProperty({ description: "状态(1-正常 0-停用)" })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiProperty({ description: "标签类型" })
  @IsString()
  @IsOptional()
  tagType?: string;

  @ApiProperty({ description: "备注" })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiProperty({ description: "更新人ID" })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  updateBy?: string;
}
