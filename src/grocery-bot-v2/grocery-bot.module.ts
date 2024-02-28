import { Module } from '@nestjs/common';
import { GroceryBotController } from './grocery-bot.controller';
import { GroceryBotService } from './grocery-bot.service';

@Module({
  controllers: [GroceryBotController],
  providers: [GroceryBotService],
})
export class GroceryBotModuleV2 {}
