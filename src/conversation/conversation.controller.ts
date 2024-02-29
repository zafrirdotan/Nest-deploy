import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { ConversationService } from './conversation.service';
import { CompletionBody } from './dto/completion-body.dto';
// import { AuthGuard } from '@nestjs/passport';
// import { AuthService } from 'src/auth/auth.service';
// import { TempUser } from 'src/auth/entitys/temp-user.entity';

@Controller('api/conversation')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService, // private authService: AuthService,
  ) {}

  // @UseGuards(AuthGuard('jwt-allow-3-first'))
  @Post('streaming')
  async chatCompletionStreaming(
    @Res() res: Response,
    @Body() completionBody: CompletionBody,
    @Req() req: Request,
  ) {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');
    console.log('completionBody', completionBody);

    // if (
    //   req.user?.hasOwnProperty('type') &&
    //   (req.user as TempUser)?.type === 'temp_user'
    // ) {
    //   const tempUser = req.user as TempUser;
    //   if (tempUser?.type === 'temp_user') {
    //     const newTempToken = await this.authService.refreshTempUserToken(
    //       tempUser,
    //     );
    //     res.cookie('token', newTempToken, {
    //       httpOnly: true,
    //       expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    //     });
    //   }
    // }

    res.flushHeaders(); // flush the headers to establish SSE with client

    const stream = await this.conversationService.chatCompletionStreaming(
      completionBody.messages,
    );

    for await (const part of stream) {
      res.write(part.choices[0].delta.content || '');
    }
    res.end();
  }

  @Post('question-summery')
  async getCompletion(@Res() res: Response, @Body() data: { prompt: string }) {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE with client
  }
}
