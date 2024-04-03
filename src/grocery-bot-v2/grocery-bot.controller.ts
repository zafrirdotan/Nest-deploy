import { Body, Controller, Post } from '@nestjs/common';

import { GroceryBotService } from './grocery-bot.service';
import { GroceryBotCompletion } from './dto/completion-body.dto';

@Controller('api/grocery-bot-v2')
export class GroceryBotController {
  constructor(private readonly groceryBotService: GroceryBotService) {}

  @Post()
  groceryBotCompletion(@Body() completionBody: GroceryBotCompletion) {
    return this.groceryBotService.groceryBotCompletion(completionBody);
  }
}
