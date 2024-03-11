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
import { mergeArrays, reduceArrays } from './utils/cart-utils';
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
    //   // console.log('res', res);
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
                  UserAction.isProductAvailable,
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
      ],
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.function_call) {
      const availableFunctions = {
        sayHallo: this.sayHallo.bind(this),
        yesNo: this.yesNo.bind(this),
        addAndRemove: this.addAndRemove.bind(this),
        addOrRemoveX: this.addOrRemoveX.bind(this),
      };

      const functionName = responseMessage.function_call.name;

      const functionToCall = availableFunctions[functionName];
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
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
    } else if (args.action === UserAction.removeFromCart) {
      updatedCart = reduceArrays(cart, args.list);
      message = responseDictionary.removingItemsFromCart[language](args);
    } else if (args.action === UserAction.isProductAvailable) {
      const items = await this.findItemInCatalog(args.list[0]?.name, cart);
      args.list[0].isAvailable = items.length > 0;
      message = responseDictionary.isProductAvailable[language](args);
    } else if (args.action === UserAction.showCart) {
      message = responseDictionary.showCart[language](args);
    } else if (args.action === UserAction.clearCart) {
      message = responseDictionary.clearCart[language](args);
      return {
        role: 'system',
        content: message,
        cart: updatedCart,
        action: UserAction.CartClearApproval,
        items: args.list,
      };
    } else {
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
    } else {
    }

    return {
      role: 'system',
      content: message,
      cart: updatedCart,
      action: args.action,
      items: args.list,
    };
  }

  async getItemsAvailabilityAndAlternatives(items) {
    items = items.filter((item) => item.name !== 'item');

    const availableItemsMap = await this.findItemsInCatalog(
      items.map((item) => item.name),
    );

    // console.log('availableItemsMap', availableItemsMap);

    // const keywords = Object.keys(availableItemsMap);

    // const similarKeywordArray = [];

    // keywords.forEach((keyword) => {
    //   availableItemsMap[keyword].forEach((item) => {
    //     similarKeywordArray.push(item.key);
    //   });
    // });
    // console.log('similarKeywordArray', similarKeywordArray);

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
      };
    });
  }

  getOpenAI(): OpenAI {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async findItemsInCatalog(itemNames: string[]) {
    const dbItems = await this.getMockItemsFromFS();

    const itemsMap = {};
    for (const name of itemNames) {
      itemsMap[name] = await this.findItemInCatalog(name, dbItems);
    }

    return itemsMap;
  }

  async findOneItemInCatalog(name: string) {
    const items = await this.getMockItemsFromFS();
    this.findItemInCatalog(name, items);
    return items;
  }

  async findItemInCatalog(searchName: string, dbItems: any[]) {
    // const itemByName = dbItems?.filter(({ name }) => {
    //   return name?.toLowerCase() === searchName?.toLowerCase();
    // });
    console.log('searchName', searchName);

    // const itemByName = await this.productModel
    //   .find({
    //     $or: [
    //       // Condition 1: Name starts with a specific prefix, case-insensitive
    //       {
    //         name: { $regex: `^${searchName}`, $options: 'i' },
    //       },
    //       // Condition 2: Search key exists in the `searchKeys` array
    //       {
    //         searchKeywords: { $in: [searchName] },
    //       },
    //       // Condition 3: Name includes a specific string, case-insensitive
    //       {
    //         name: { $regex: searchName, $options: 'i' },
    //       },
    //     ],
    //   })
    //   .exec();

    const testAggregation = await this.productModel
      .aggregate([
        {
          $addFields: {
            // Condition 1: Name starts with a specific prefix, case-insensitive
            priority1: {
              $cond: [
                {
                  $regexMatch: {
                    input: '$name',
                    regex: `^${searchName}`,
                    options: 'i',
                  },
                },
                // Priority fields: 1 if condition is met, 0 otherwise
                1,
                0,
              ],
            },
            // Condition 2: Search key exists in the `searchKeys` array

            priority2: {
              $cond: [{ $in: [searchName, '$searchKeywords'] }, 1, 0],
            },
            // Condition 3: Name includes a specific string, case-insensitive

            priority3: {
              $cond: [
                {
                  $regexMatch: {
                    input: '$name',
                    regex: searchName,
                    options: 'i',
                  },
                },
                1,
                0,
              ],
            },
          },
        },
        {
          $match: {
            // Ensure at least one priority field is 1
            $or: [{ priority1: 1 }, { priority2: 1 }, { priority3: 1 }],
          },
        },
        {
          // Sort by priority fields: descending order (1 is higher priority than 0)
          $sort: { priority1: -1, priority2: -1, priority3: -1 },
        },
      ])
      .exec();

    console.log('testAggregation', testAggregation);

    // const itemsSimilarToName = dbItems?.filter(({ itemName }) => {
    //   return itemName?.toLowerCase().includes(searchName?.toLowerCase());
    // });

    // const itemsStartsWithName = dbItems?.filter(({ itemName }) => {
    //   return itemName?.toLowerCase().startsWith(searchName?.toLowerCase());
    // });
    // const itemBySearchKey = dbItems?.filter(({ searchKeywords }) =>
    //   searchKeywords?.includes(searchName),
    // );

    return [
      ...testAggregation,
      // ...itemsStartsWithName,
      // ...itemBySearchKey,
      // ...itemsSimilarToName,
    ];
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
