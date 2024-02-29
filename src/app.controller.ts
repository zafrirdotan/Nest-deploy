import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { GroceryBotService } from './grocery-bot-v2/grocery-bot.service';
import { GrocerySumBody } from './grocery-bot-v2/dto/completion-body.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly groceryBotService: GroceryBotService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  getCompletionWithFunctions(@Body() completionBody: GrocerySumBody) {
    console.log('completionBody hi', completionBody);

    return this.groceryBotService.editCartCompletion(completionBody);
  }
}
