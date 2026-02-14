import { IsString, IsInt, Min, MinLength } from 'class-validator';

export class ApplyStockDto {
  @IsString()
  @MinLength(1)
  orderId!: string;

  @IsString()
  @MinLength(1)
  productId!: string;

  @IsInt()
  @Min(1)
  boxes!: number;
}
