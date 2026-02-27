import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";
import { Transform } from "class-transformer";

/**
 * 字典更新参数
 */
export class UpdateDictDto {
  @ApiProperty({ description: "字典编码" })
  @IsString()
  @IsOptional()
  dictCode?: string;

  @ApiProperty({ description: "字典名称" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: "状态(0:正常;1:禁用)" })
  @IsNumber()
  @IsOptional()
  status?: number;

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
