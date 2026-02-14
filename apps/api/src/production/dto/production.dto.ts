import { IsString, IsInt, Min, MinLength } from 'class-validator';

export class RecordProductionDto {
  @IsString()
  @MinLength(1)
  orderId!: string;

  @IsString()
  @MinLength(1)
  elementId!: string;

  @IsInt()
  @Min(1)
  amountProduced!: number;
}

export class ApplyInventoryDto {
  @IsString()
  @MinLength(1)
  orderId!: string;
}
