import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GroceryBotModuleV2 } from './grocery-bot-v2/grocery-bot.module';
import { ConversationModule } from './conversation/conversation.module';

@Module({
  imports: [ConfigModule.forRoot(), GroceryBotModuleV2, ConversationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
