import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma-db/prisma.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AuthModule } from './auth/auth.module';
import { ElementsModule } from './elements/elements.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { ProductionModule } from './production/production.module';
import { AssemblyModule } from './assembly/assembly.module';
import { StockModule } from './stock/stock.module';
import { RawMaterialsModule } from './raw-materials/raw-materials.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ElementsModule,
    InventoryModule,
    ProductsModule,
    OrdersModule,
    ManufacturingModule,
    ProductionModule,
    AssemblyModule,
    StockModule,
    RawMaterialsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
