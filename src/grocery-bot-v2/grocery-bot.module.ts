import { Module } from '@nestjs/common';
import { GroceryBotController } from './grocery-bot.controller';
import { GroceryBotService } from './grocery-bot.service';
import { ProductSchema } from './entity/product.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema, collection: 'products' },
    ]),
  ],
  controllers: [GroceryBotController],
  providers: [GroceryBotService],
})
export class GroceryBotModuleV2 {}
