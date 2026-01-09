import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class BaseQueryDto {
  @ApiProperty({ description: "页码", required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? 1 : Number(value)
  )
  @IsInt()
  @Min(1)
  pageNum?: number = 1;

  @ApiProperty({
    description: "每页记录数",
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? 10 : Number(value)
  )
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiProperty({ description: "排序字段", required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ description: "排序方式（ASC/DESC）", required: false })
  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  order?: string;
}
