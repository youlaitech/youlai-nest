import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class TablePageQueryDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  pageNum: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  pageSize: number;

  @IsOptional()
  @IsString()
  keywords?: string;
}
