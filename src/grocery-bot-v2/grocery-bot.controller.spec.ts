import { Test, TestingModule } from '@nestjs/testing';
import { GroceryBotController } from './grocery-bot.controller';

describe('GroceryBotController', () => {
  let controller: GroceryBotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroceryBotController],
    }).compile();

    controller = module.get<GroceryBotController>(GroceryBotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
