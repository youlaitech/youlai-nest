import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("11.产品接口")
@Controller("products")
export class ProductController {}
