import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import {
  UserAction,
  LastAction,
  GrocerySumBody,
  ICartItem,
} from './dto/completion-body.dto';
import { responseDictionary } from './consts/response-dictionary';

import {
  Descriptions,
  FunctionEntityTypes as OAIParam,
  RequestActions,
} from './consts/request-dictionary';
import {
  getEmoji,
  mergeArrays,
  reduceArrays,
  removeFromArray,
} from './utils/cart-utils';
import { containsHebrew } from 'src/utils/language-detection';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './entity/product.entity';

@Injectable()
export class GroceryBotService {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
  ) {
    // const product = new this.productModel({
    //   name: 'banana',
    //   price: 5,
    //   searchKeywords: ['banana'],
    //   //     id?: number;
    //   // name: string;
    //   // brand: string;
    //   // quantity: string;
    //   // price: string;
    //   // productId: number;
    //   // barcode: string;
    //   // category: string;
    //   brand: 'brand',
    //   quantity: 4,
    //   productId: 1,
    //   barcode: 'barcode',
    //   category: 'category',
    // });
    // product.save();
    // this.productModel.find().then((res) => {
    //   console.log('res', res);
    // });
    // this.getMockItemsFromFS().then((res) => {
    //   console.log('res', res);
    //   this.productModel.insertMany(res);
    // });
  }

  async test() {
    const ItemsAvailabilityAndAlternatives =
      await this.getItemsAvailabilityAndAlternatives([
        { name: 'banana' },
        { name: 'apple' },
        { name: 'milk' },
        { name: 'green apple' },
      ]);
    // console.log(
    //   'ItemsAvailabilityAndAlternatives:',
    //   ItemsAvailabilityAndAlternatives,
    // );
  }

  async editCartCompletion(completionBody: GrocerySumBody) {
    const { message, cart, lastAction } = completionBody;
    let language = 'en';
    if (containsHebrew(message.content)) {
      language = 'he';
    }

    let massages: ChatCompletionMessageParam[] = [message];

    if (
      [
        UserAction.addToCart,
        UserAction.removeFromCart,
        UserAction.addX,
        UserAction.removeX,
      ].includes(lastAction?.action) &&
      lastAction?.action !== UserAction.clearCart
    ) {
      massages.unshift({
        role: 'system',
        content: `I added: ${lastAction?.list?.map(
          (item) => `${item.quantity} ${item.name} `,
        )}`,
      });
    }
    const response = await this.getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo-0613',
      messages: massages,
      temperature: 0.9,
      functions: [
        {
          name: RequestActions.sayHallo,
          description: Descriptions.sayHallo[language],
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [
                  UserAction.hallo.toString(),
                  UserAction.howAreYou.toString(),
                ],
              },
            },
            required: ['action'],
          },
        },
        {
          name: RequestActions.yesNo,
          description: Descriptions.yesNo[language],
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [UserAction.yes, UserAction.no],
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
                  UserAction.removeFromCart,
                  UserAction.showCart,
                  UserAction.clearCart,
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
          name: RequestActions.addOrRemoveX,
          description: Descriptions.addOrRemoveX[language],
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [UserAction.addX, UserAction.removeX],
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
          name: 'getAvailableProducts',
          description: 'user asks what kind of product is available',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: [
                  UserAction.whatKindOfProduct,
                  UserAction.isProductAvailable,
                ],
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
    if (responseMessage.content) {
      return responseMessage;
    }
    console.log('responseMessage', responseMessage);

    if (responseMessage.function_call) {
      const availableFunctions = {
        sayHallo: this.sayHallo.bind(this),
        yesNo: this.yesNo.bind(this),
        addAndRemove: this.addAndRemove.bind(this),
        addOrRemoveX: this.addOrRemoveX.bind(this),
        getRecipe: this.getRecipe.bind(this),
        getAvailableProducts: this.getAvailableProducts.bind(this),
      };

      const functionName = responseMessage.function_call.name;

      const functionToCall = availableFunctions[functionName];
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      console.log('functionArgs', functionArgs);

      const functionResponse = await functionToCall(
        functionArgs,
        cart,
        language,
        lastAction,
      );

      return functionResponse;
    }
  }

  sayHallo(args) {
    console.log('args', args);

    const { action } = args;
    if (action === UserAction.hallo) {
      return { role: 'system', content: 'Hallo' };
    } else if (action === UserAction.howAreYou) {
      return { role: 'system', content: 'I am fine, thank you' };
    }
  }

  async addAndRemove(args, cart?: any[], language?: string) {
    let message: string = '';
    let updatedCart: ICartItem[] = cart;

    if (args.action === UserAction.addToCart) {
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
      updatedCart = mergeArrays(cart, availableItems);

      message = responseDictionary.addingItemsToCart[language](
        availableItems,
        unavailableItems,
      );
    } else if (args.action === UserAction.removeFromCart) {
      updatedCart = removeFromArray(cart, args.list);

      message = responseDictionary.removingItemsFromCart[language](args);
    } else if (args.action === UserAction.isProductAvailable) {
      console.log('args', args);

      if (args && args.list && args.list[0] && args.list[0].name) {
        const items = await this.findItemInCatalog(args.list[0]?.name);

        message = responseDictionary.isProductAvailable[language](args, items);
      }
    } else if (args.action === UserAction.showCart) {
      message =
        responseDictionary.showCart[language](args) +
        ` ${cart
          .map(
            (item) =>
              `\n * ${item.quantity} ${item.name} ${item.emoji || ''} ${
                item.price
              }$`,
          )
          .join(', ')}`;
    } else if (args.action === UserAction.clearCart) {
      message = responseDictionary.clearCart[language](args);
      return {
        role: 'system',
        content: message,
        cart: updatedCart,
        action: UserAction.CartClearApproval,
        items: args.list,
      };
    }

    return {
      role: 'system',
      content: message,
      cart: updatedCart,
      action: args.action,
      items: args.list,
    };
  }

  yesNo(args, _cart: any[], language: string, lastAction?: LastAction) {
    if (args.action === UserAction.yes) {
      if (lastAction.action === UserAction.CartClearApproval) {
        return {
          role: 'system',
          content: 'Your cart is empty',
          cart: [],
          action: UserAction.clearCart,
        };
      }
    } else if (args.action === UserAction.no) {
      if (lastAction.action === UserAction.CartClearApproval) {
        return { role: 'system', content: "Ok, I didn't do anything" };
      }
    }
  }

  async addOrRemoveX(args, cart?: any[], language?: string) {
    console.log('args', args);

    let message: string = '';
    let updatedCart: ICartItem[] = cart;

    if (args.action === UserAction.addX) {
      const items = await this.getItemsAvailabilityAndAlternatives(args.list);
      const availableItems = items.filter(
        (item: ICartItem) => item.isAvailable,
      );
      const unavailableItems = items.filter(
        (item: ICartItem) => !item.isAvailable,
      );
      updatedCart = mergeArrays(cart, availableItems);
      message = responseDictionary.addingItemsToCart[language](
        availableItems,
        unavailableItems,
      );
    } else if (args.action === UserAction.removeX) {
      updatedCart = reduceArrays(cart, args.list);
      message = responseDictionary.removingItemsFromCart[language](args);
    }

    return {
      role: 'system',
      content: message,
      cart: updatedCart,
      action: args.action,
      items: args.list,
    };
  }

  async getAvailableProducts(args: any, cart?: any[], language?: string) {
    if (args && args.productName) {
      const items = await this.findItemInCatalog(args.productName);
      const content = responseDictionary.isProductAvailable[language](
        args.productName,
        items,
      );

      return {
        role: 'system',
        content,
        cart,
        action: args.action,
        items: args.list,
      };
    }
  }

  async getRecipe(args: any) {
    const answer = await this.getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo-0613',
      messages: [
        {
          role: 'user',
          content: 'Generate a recipe for ' + args.recipeType,
        },
      ],
      temperature: 0.9,
    });

    return {
      role: 'system',
      content: answer.choices[0].message.content,
      action: args.action,
      items: args.list,
    };
  }

  async getItemsAvailabilityAndAlternatives(items) {
    items = items.filter((item) => item.name !== 'item');

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
      itemsMap[name] = await this.findItemInCatalog(name);
    }

    return itemsMap;
  }

  async findOneItemInCatalog(name: string) {
    const items = await this.getMockItemsFromFS();
    this.findItemInCatalog(name);
    return items;
  }

  async findItemInCatalog(searchName: string) {
    const testAggregation = await this.productModel
      .aggregate([
        {
          $addFields: {
            // Condition 0: exact match, case-insensitive
            isExactMatch: {
              $cond: [
                {
                  $regexMatch: {
                    input: '$name',
                    regex: searchName,
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

    return testAggregation;
  }

  async findItemsInCatalogByName(itemNames: string[]) {
    const dbItems = await this.getMockItemsFromFS();

    const itemsMap = {};
    itemNames.forEach((name) => {
      itemsMap[name] = dbItems.filter(
        (item) => item?.name?.toLowerCase() === name?.toLowerCase(),
      );
    });
    return itemsMap;
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
