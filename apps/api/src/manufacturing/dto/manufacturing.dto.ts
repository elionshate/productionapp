import { IsString, IsOptional, IsInt, Min, MinLength, IsIn } from 'class-validator';

export class CreateManufacturingDto {
  @IsString()
  @MinLength(1)
  orderId!: string;

  @IsString()
  @MinLength(1)
  productId!: string;

  @IsInt()
  @Min(1)
  quantityToMake!: number;
}

export class UpdateManufacturingDto {
  @IsOptional()
  @IsString()
  @IsIn(['planned', 'in_progress', 'completed', 'cancelled'])
  status?: string;
}
