import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';

// import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ConversationController],
  providers: [ConversationService],
  imports: [],
  // imports: [AuthModule],
})
export class ConversationModule {}
