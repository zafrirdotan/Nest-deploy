import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import {
  UserAction,
  GroceryRequestBody,
  ICartItem,
  ActionType,
  Action,
  GroceryResponseBody,
} from './dto/completion-body.dto';
import { responseDictionary } from './consts/response-dictionary';

import {
  Descriptions,
  FunctionEntityTypes as OAIParam,
  RequestActions,
} from './consts/request-dictionary';
import { getEmoji, mergeArrays, reduceArrays } from './utils/cart-utils';
import { containsHebrew } from 'src/utils/language-detection';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './entity/product.entity';

@Injectable()
export class GroceryBotService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
  ) {
    // this.getMockItemsFromFS().then((res) => {
    //   console.log('res', res);
    //   this.productModel.insertMany(res);
    // });
  }

  async editCartCompletion(
    completionBody: GroceryRequestBody,
  ): Promise<GroceryResponseBody> {
    const { message, cart, lastAction } = completionBody;
    let language = 'en';
    if (containsHebrew(message.content)) {
      language = 'he';
    }

    let massages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          "You're a grocery bot named 'Shopit GPT'. Only assist with grocery shopping—adding, removing, displaying cart items, checking product availability, and providing recipes with ingredient addition. Pass user's 'yes' or 'no' to functions following questions. Avoid unrelated tasks.",
      },
    ];

    if (lastAction && lastAction.actionType === ActionType.Generated) {
      massages.unshift({
        role: 'assistant',
        content: lastAction.message || '',
      });
    }

    if (lastAction && lastAction.actionType === ActionType.CartClearApproval) {
      massages.unshift({
        role: 'assistant',
        content: 'Are you sure you want to clear your cart?',
      });
    }

    massages.push(message);

    const response = await this.getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo-0613',
      messages: massages,
      temperature: 0.9,
      functions: [
        {
          name: RequestActions.clearCart,
          description: Descriptions.clearCart[language],
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [UserAction.clearCart, UserAction.clearCartApprove],
              },
            },
            required: ['action'],
          },
        },
        {
          name: RequestActions.addAndRemove,
          description: Descriptions.addAndRemove[language],
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [
                  UserAction.addToCart,
                  UserAction.addX,
                  UserAction.addXMore,
                  UserAction.removeX,
                  UserAction.removeFromCart,
                  UserAction.showCart,
                ],
              },
              list: {
                type: OAIParam.array,
                items: {
                  type: OAIParam.object,
                  properties: {
                    name: { type: OAIParam.string },
                    quantity: { type: OAIParam.number },
                    unit: { type: OAIParam.string },
                  },
                },
              },
            },
            required: ['action'],
          },
        },
        {
          name: RequestActions.getAvailableProducts,
          description: Descriptions.getAvailableProducts[language],
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: [UserAction.isProductAvailable, UserAction.getPrice],
              },
              productName: { type: OAIParam.string },
            },
            required: ['action'],
          },
        },
        // {
        //   name: 'getRecipe',
        //   description: 'user asks for a recipe',
        //   parameters: {
        //     type: 'object',
        //     properties: {
        //       action: {
        //         type: 'string',
        //         enum: ['do you have', 'recipe'],
        //       },
        //       recipeType: { type: 'string' },
        //     },
        //     required: ['action'],
        //   },
        // },
      ],
    });

    const responseMessage = response.choices[0].message;
    console.log('responseMessage', responseMessage);
    if (responseMessage.content) {
      return {
        role: 'system',
        message: responseMessage.content,
        cart,
        action: {
          actionType: ActionType.Generated,
          message: responseMessage.content,
        },
      };
    }

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionToCall = this.getFunctionToCall(functionName);

      if (functionToCall) {
        const functionArgs = JSON.parse(
          responseMessage.function_call.arguments,
        );
        const functionResponse = await functionToCall(
          functionArgs,
          cart,
          lastAction,
          language,
        );
        return functionResponse;
      }
    }

    // if there is no content and no function call
    return {
      role: 'system',
      message: 'Sorry, I could not understand you',
      cart,
      action: { actionType: ActionType.Generated },
    };
  }

  getFunctionToCall(functionName: string) {
    const availableFunctions = {
      clearCart: this.clearCart.bind(this),
      addAndRemove: this.addAndRemove.bind(this),
      getAvailableProducts: this.getAvailableProducts.bind(this),
    };
    return availableFunctions[functionName];
  }

  addAndRemove(
    args: {
      list: [{ name: string; quantity: number; unit: string }];
      action: UserAction;
    },
    cart: any[],
    lastAction: Action,
    language: string,
  ) {
    switch (args.action) {
      case UserAction.addToCart:
      case UserAction.addX:
        return this.addToCart(args, cart, language);
      case UserAction.addXMore:
        return this.addXMore(args, cart, lastAction, language);
      case UserAction.removeFromCart:
      case UserAction.removeX:
        return this.removeFromCart(args, cart, lastAction, language);
      case UserAction.showCart:
        return this.showCart(args, cart, lastAction, language);
      default:
        return {
          role: 'assistant',
          content: 'Sorry, I could not understand you',
        };
    }
  }

  async addToCart(
    args: {
      list: [{ name: string; quantity: number; unit: string }];
      action: UserAction;
    },
    cart: any[],
    language?: string,
  ) {
    const items = await this.getItemsAvailabilityAndAlternatives(args.list);

    const availableItems = items
      .filter((item: ICartItem) => item.isAvailable)
      .map((item) => {
        item.emoji = getEmoji(item.name);
        return item;
      });

    const unavailableItems = items
      .filter((item: ICartItem) => !item.isAvailable)
      .map((item) => {
        item.emoji = getEmoji(item.name);
        return item;
      });

    return {
      role: 'assistant',
      cart: mergeArrays(cart, availableItems),
      action: {
        actionType: ActionType.addToCart,
        items: availableItems.map((item) => item.name),
      },
      message: responseDictionary.addingItemsToCart[language](
        availableItems,
        unavailableItems,
      ),
    };
  }

  addXMore(args, cart: any[], lastAction: Action, language: string) {
    if (
      [ActionType.addX, ActionType.addToCart, ActionType.addXMore].includes(
        lastAction.actionType,
      ) &&
      (!args.list[0].name ||
        ['product', 'item', ''].includes(args.list[0].name))
    ) {
      const newArgs = {
        action: UserAction.addXMore,
        list: [
          {
            name: lastAction.items[0],
            quantity: args.list[0].quantity,
            unit: lastAction.items[0].unit || '',
          },
        ],
      };
      args = newArgs;
    }

    return this.addToCart(args, cart, language);
  }

  removeFromCart(args, cart: any[], lastAction: Action, language: string) {
    const newCart = reduceArrays(cart, args.list);
    if (newCart.length === cart.length) {
      return {
        role: 'assistant',
        message: 'Sorry, I could not find the items you asked to remove',
        cart: newCart,
        action: args.action,
        items: args.list,
      };
    }
    return {
      role: 'assistant',
      message: responseDictionary.removingItemsFromCart[language](args),
      cart: newCart,
      action: args.action,
      items: args.list,
    };
  }

  showCart(args, cart: any[], lastAction: Action, language: string) {
    return {
      role: 'assistant',
      message:
        responseDictionary.showCart[language](args) +
        ` ${cart
          .map(
            (item) =>
              `\n * ${item.quantity} ${item.name} ${item.emoji || ''} ${
                item.price
              }$`,
          )
          .join(', ')}`,
      action: { actionType: ActionType.showCart },
      cart,
    };
  }

  clearCart(args, cart: any[], lastAction: Action, language: string) {
    if (
      lastAction?.actionType === ActionType.CartClearApproval &&
      args.action === 'yes. I want to clear'
    ) {
      return {
        role: 'assistant',
        message: responseDictionary.cartCleared[language](),
        cart: [],
        action: { actionType: ActionType.clearCart },
      };
    } else {
      return this.askIfUserWantsToClearCart(language);
    }
  }

  askIfUserWantsToClearCart(language: string) {
    return {
      role: 'assistant',
      message: responseDictionary.clearCart[language](),
      action: { actionType: ActionType.CartClearApproval },
    };
  }

  async getAvailableProducts(
    args: any,
    cart: any[],
    lastAction: Action,
    language: string,
  ) {
    if (!args)
      return {
        role: 'assistant',
        message: 'Sorry, I could not understand you',
        action: args.action,
      };

    if (!args.productName) {
      return {
        role: 'assistant',
        message:
          'We have a verity of products. like vegetables, fruits, meat, and other products. You can ask me for a specific product and I will check if it is available.',
        action: args.action,
      };
    }

    if (args.productName) {
      const items = await this.findItemInDB(args.productName);
      const message = responseDictionary.isProductAvailable[language](
        args.productName,
        items,
      );

      return {
        role: 'system',
        message,
        cart,
        action: args.action,
        items: args.list,
      };
    }
  }

  async getItemsAvailabilityAndAlternatives(items) {
    if (!items) return [];
    items = items?.filter((item) => item.name !== 'item');

    const availableItemsMap = await this.findItemsInCatalog(
      items.map((item) => item.name),
    );

    return items.map((item) => {
      return {
        ...item,
        name: availableItemsMap[item.name][0]
          ? availableItemsMap[item.name][0]?.name
          : item.name,
        isAvailable: availableItemsMap[item.name].length > 0,
        alternatives: availableItemsMap[item.name].slice(1, 3),
        price: availableItemsMap[item.name][0]
          ? availableItemsMap[item.name][0]?.price
          : null,
        searchKeywords: availableItemsMap[item.name][0]?.searchKeywords,
      };
    });
  }

  getOpenAI(): OpenAI {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async findItemsInCatalog(itemNames: string[]) {
    const itemsMap = {};
    for (const name of itemNames) {
      itemsMap[name] = await this.findItemInDB(name);
    }

    return itemsMap;
  }

  async findItemInDB(searchName: string) {
    const aggregation = await this.productModel
      .aggregate([
        {
          $addFields: {
            // Condition 0: exact match, case-insensitive
            isExactMatch: {
              $cond: [
                {
                  $regexMatch: {
                    input: '$name',
                    regex: `\\b${searchName}\\b`,
                    options: 'i',
                  },
                },
                // Priority fields: 1 if condition is met, 0 otherwise
                1,
                0,
              ],
            },
            // Condition 1: Search name exists in the `subCategory` array
            isSubCategory: {
              $cond: [
                {
                  $regexMatch: {
                    input: '$subCategory',
                    regex: `searchName`,
                    options: 'i',
                  },
                },
                // Priority fields: 1 if condition is met, 0 otherwise
                1,
                0,
              ],
            },
            // Condition 2: Search key exists in the `searchKeys` array
            includedInSearchKey: {
              $cond: [{ $in: [searchName, '$searchKeywords'] }, 1, 0],
            },
          },
        },
        {
          $match: {
            // Ensure at least one priority field is 1
            $or: [
              { isExactMatch: 1 },
              { isSubCategory: 1 },
              { includedInSearchKey: 1 },
            ],
          },
        },
        {
          // Sort by priority fields: descending order (1 is higher priority than 0)
          $sort: {
            isExactMatch: -1,
            isSubCategory: -1,
            includedInSearchKey: -1,
          },
        },
        // {
        //   $project: {
        //     // Exclude 'searchKeywords' from the results
        //     // searchKeywords: 0,
        //     // priority1: 0,
        //     // priority2: 0,
        //     // priority3: 0,
        //     // Optional: Explicitly include fields if needed
        //     // name: 1,
        //     // otherField: 1,
        //   },
        // },
      ])
      .exec();

    return aggregation;
  }

  async getMockItemsFromFS(): Promise<any[]> {
    const fs = require('fs').promises;

    // Specify the path to the JSON file
    const filePath = 'src/grocery-bot-v2/mock-data/mock-db.json';

    try {
      // Read the file asynchronously
      const data = await fs.readFile(filePath, 'utf8');

      // Parse the JSON string to an object
      const jsonObject = JSON.parse(data);

      // console.log(jsonObject);
      return jsonObject;
    } catch (err) {
      console.error('Error reading the file:', err);
      return [];
    }
  }
}
