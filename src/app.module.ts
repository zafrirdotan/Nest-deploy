import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GroceryBotModuleV2 } from './grocery-bot-v2/grocery-bot.module';
import { GroceryBotService } from './grocery-bot-v2/grocery-bot.service';

@Module({
  imports: [ConfigModule.forRoot(), GroceryBotModuleV2],
  controllers: [AppController],
  providers: [AppService, GroceryBotService],
})
export class AppModule {}
