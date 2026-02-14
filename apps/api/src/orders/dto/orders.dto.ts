import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsInt()
  @Min(1)
  boxesNeeded!: number;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientName!: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in_production', 'shipped'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in_production', 'shipped'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AddOrderItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsInt()
  @Min(1)
  boxesNeeded!: number;
}

export class UpdateOrderItemDto {
  @IsInt()
  @Min(1)
  boxesNeeded!: number;
}
