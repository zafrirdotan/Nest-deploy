import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import {
  UserActionStrings,
  ICartItem,
  UserAction,
  AssistantAction,
  IAvailableItems,
  GroceryBotCompletion,
  AssistantMessageParams,
} from './dto/completion-body.dto';
import { responseDictionary } from './consts/response-dictionary';

import {
  UserActionArgs,
  FunctionEntityTypes as OAIParam,
  PredictItemEntity,
} from './consts/request-dictionary';
import { addToCart, reduceFromCart, removeProduct } from './utils/cart-utils';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './entity/product.entity';

@Injectable()
export class GroceryBotService {
  defaultMessage: AssistantMessageParams = {
    role: 'assistant',
    content: 'Sorry, I could not understand you',
    actionType: AssistantAction.notUnderstood,
  };

  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
  ) {
    // this.getMockItemsFromFS().then((res) => {
    //   this.productModel.insertMany(res);
    // });
  }

  async groceryBotCompletion(
    completionBody: GroceryBotCompletion,
  ): Promise<AssistantMessageParams> {
    const { messages } = completionBody;
    if (!messages?.length) {
      throw new Error('No messages provided');
    }

    const lastMassages = messages.slice(-6);

    let language = 'en';
    // if (containsHebrew(message.content)) {
    //   language = 'he';
    // }
    const currentMessage = messages[messages.length - 1];
    const lastMassage = messages[messages.length - 2];
    console.log('completionBody.cart:', completionBody.cart);

    console.log('currentMessage', currentMessage);

    const completionMessages: ChatCompletionMessageParam[] = lastMassages.map(
      (message) => {
        if (message.role === 'user') {
          return {
            role: 'user',
            content: message.content || '',
          };
        } else {
          return {
            role: 'assistant',
            content: message.content || '',
          };
        }
      },
    );

    completionMessages.push({
      role: 'system',
      content:
        "You're a grocery bot named 'Shopit GPT'. Assist with grocery shopping—adding, removing, displaying cart items, checking product availability, and provide recipes or cooking instructions if requested. Avoid unrelated tasks.",
    });

    const response = await this.getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: completionMessages,
      temperature: 0.9,
      functions: [
        {
          name: 'add',
          description: 'Add items to the cart',
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [
                  UserActionStrings.addToCart,
                  UserActionStrings.addMore,
                  UserActionStrings.addAnotherX,
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
            required: ['action', 'list'],
          },
        },
        {
          name: 'remove',
          description: 'Remove items from the cart',
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [
                  UserActionStrings.removeX,
                  UserActionStrings.removeFromCart,
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
                    removeAll: { type: OAIParam.boolean },
                  },
                },
              },
            },
            required: ['action', 'list'],
          },
        },
        {
          name: 'showCart',
          description: 'Show the cart',
        },
        {
          name: 'clearCart',
          description: 'Clear the cart',
          parameters: {
            type: OAIParam.object,
            properties: {
              action: {
                type: OAIParam.string,
                enum: [
                  UserActionStrings.clearCart,
                  UserActionStrings.clearCartApprove,
                ],
              },
            },
            required: ['action'],
          },
        },
        {
          name: 'getAvailableProducts',
          description: UserActionStrings.getAvailableProducts,
          parameters: {
            type: OAIParam.object,
            properties: {
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
            required: ['list'],
          },
        },
        {
          name: 'getPrice',
          description: 'Get the price of the items',
          parameters: {
            type: OAIParam.object,
            properties: {
              list: {
                type: OAIParam.array,
                items: {
                  type: OAIParam.object,
                  properties: {
                    name: { type: OAIParam.string },
                  },
                },
              },
            },
            required: ['list'],
          },
        },
      ],
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.content) {
      console.log('generated message', responseMessage.content);

      return {
        role: 'assistant',
        content: responseMessage.content,
        actionType: AssistantAction.generated,
      };
    }

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;

      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      const functionResponse = await this.responseFunction.bind(this)(
        functionName,
        functionArgs,
        completionBody.cart,
        lastMassage,
        language,
      );
      return functionResponse;
    }

    // if there is no content and no function call
    return this.defaultMessage;
  }

  async responseFunction(
    functionName: string,
    functionArgs: UserActionArgs,
    cart: any[],
    lastMassage: AssistantMessageParams,
    language: string,
  ) {
    console.log('lastMassage', lastMassage);
    console.log('functionName', functionName);
    console.log('functionArgs', functionArgs);

    switch (functionName) {
      case 'add':
        return this.handleAddToCart(functionArgs, lastMassage, cart, language);
      case 'remove':
        return this.removeFromCart(functionArgs, cart, language);
      case 'showCart':
        return this.showCart(functionArgs, cart, language);
      case 'clearCart':
        return this.clearCart(functionArgs, lastMassage, language);
      case 'getAvailableProducts':
        return this.handleGetAvailableProducts(functionArgs);
      case 'getPrice':
        return this.handleGetAvailableProducts(functionArgs);

      default:
        return this.defaultMessage;
    }
  }

  async handleAddToCart(
    functionArgs: UserActionArgs,
    lastMassage: AssistantMessageParams,
    cart: ICartItem[],
    language?: string,
  ) {
    if (!functionArgs?.action || !functionArgs.list) {
      console.log(
        'error - functionArgs are empty or missing action',
        'functionArgs:',
        functionArgs,
      );
      return this.defaultMessage;
    }
    const { action } = functionArgs;

    const requestedItems = functionArgs?.list;
    const searchTerms = requestedItems?.map((item) => item.name);

    const lastAssistantAction = lastMassage?.actionType;

    if (
      [UserActionStrings.addMore, UserActionStrings.addAnotherX].includes(
        action,
      )
    ) {
      // direct add to cart
      return this.addToCart(cart, requestedItems, cart);
    } else if (lastAssistantAction === AssistantAction.showAvailableProducts) {
      // add to cart
      const assistantMessage = this.addToCart(
        lastMassage.availableItems.flatMap((item) => item.items),
        requestedItems,
        cart,
      );
      // if the item are not available in the available options then check the inventory
      if (assistantMessage.actionType === AssistantAction.notFoundInCart) {
        return this.checkItemsAvailability(searchTerms);
      } else {
        return assistantMessage;
      }
    } else {
      // if the user action is not addMore or addAnotherX
      // then check the inventory
      return this.checkItemsAvailability(searchTerms);
    }
  }

  addToCart(
    availableItems: ICartItem[],
    requestedItems: PredictItemEntity[],
    cart: ICartItem[],
  ) {
    const itemsToAdd = this.getRequestedItems(availableItems, requestedItems);
    if (!itemsToAdd?.length) {
      return {
        role: 'assistant',
        content: `Sorry, I could not find ${requestedItems[0].name} in your cart.
        \n Do you want me to check if ${requestedItems[0].name} is available?`,
        actionType: AssistantAction.notFoundInCart,
      };
    }

    const newCart = addToCart(cart, itemsToAdd);
    return {
      role: 'assistant',
      content:
        itemsToAdd.length === 1
          ? `I added ${itemsToAdd[0].name} to your cart`
          : `I added the following items to your cart ${itemsToAdd.map(
              (item) => `\n- ${item.name}`,
            )}`,
      actionType: AssistantAction.addedToCart,
      cart: newCart,
      addedItems: itemsToAdd,
    };
  }

  handleGetAvailableProducts(functionArgs: UserActionArgs) {
    const searchTerms = functionArgs.list?.map((item) => item.name);

    return this.checkItemsAvailability(searchTerms);
  }

  async checkItemsAvailability(searchTerms: string[]) {
    if (!searchTerms?.length) {
      return this.defaultMessage;
    }

    const availableItems = await this.findAvailableItemsInDB(searchTerms);

    const unavailableItems = searchTerms?.filter(
      (term) => !availableItems.find((item) => item.searchTerm === term),
    );

    if (!availableItems.length) {
      return {
        role: 'assistant',
        content: `Sorry, I didn't find any items for ${searchTerms.map(
          (searchTerms) => `\n- ${searchTerms}`,
        )}`,
        actionType: AssistantAction.notFoundInInventory,
      };
    }

    if (searchTerms.length === 1) {
      if (availableItems[0].items.length === 1) {
        return {
          role: 'assistant',
          content: `I found ${availableItems[0].items[0].name} for ${availableItems[0].items[0].price}$ 
         \n do you want to add it to your cart?`,
          actionType: AssistantAction.showAvailableProducts,
          availableItems,
          unavailableItems,
        };
      } else {
        const content = `I found a couple of items in this category ${
          availableItems[0].searchTerm
        } ${availableItems[0].items.map((item) => {
          return `\n- ${item.name} for ${item.price}$
         `;
        })} \n do you want to add one of them to the cart?`;

        return {
          role: 'assistant',
          content,
          availableItems,
          unavailableItems,
          actionType: AssistantAction.showAvailableProducts,
        };
      }
    } else {
      const message = `I found the following items: 
      \n ${availableItems.map((category) => {
        return `\n\n For ${category.searchTerm} I Found ${category.items.map(
          (item) => {
            return ` \n- ${item.name} for ${item.price}$`;
          },
        )}`;
      })}  \n do you want to add one of them to the cart?`;

      return {
        role: 'assistant',
        content: message,
        actionType: AssistantAction.showAvailableProducts,
        availableItems,
        unavailableItems,
      };
    }
  }

  addXMore(
    functionArgs: UserActionArgs,
    lastMassage: AssistantMessageParams,
    cart: any[],
    language: string,
  ) {
    if (!functionArgs) {
      console.log('error - functionArgs are empty');
      return this.defaultMessage;
    }
    const { list, action } = functionArgs;

    if (!list?.length) {
      console.log('error - functionArgs.list is empty');

      return this.defaultMessage;
    }

    if (!action) {
      console.log('error - functionArgs.action is empty');
      return this.defaultMessage;
    }

    const itemIndex = cart.findIndex((item) =>
      item.name?.toLowerCase().includes(list[0].name?.toLocaleLowerCase()),
    );

    cart[itemIndex].quantity += +list[0].quantity; // problem

    return {
      role: 'assistant',
      content: `I added ${functionArgs?.list[0].quantity} ${functionArgs.list[0].name} to your cart`,
      action: lastMassage,
      cart,
    };
  }

  removeFromCart(args: UserActionArgs, cart: any[], language: string) {
    const { reducedItems, newCart } = reduceFromCart(cart, args.list);

    if (!reducedItems?.length) {
      return {
        role: 'assistant',
        content: 'Sorry, I could not find the items you asked to remove',
        action: AssistantAction.notFoundInCart,
      };
    }
    return {
      role: 'assistant',
      content: `I removed the following items from your cart ${reducedItems.map(
        (item) => `\n- ${item.name} ${item.quantity}`,
      )}
      \n Do you need anything else?`,
      cart: newCart,
      action: args.action,
      items: args.list,
    };
  }

  removeProduct(args: UserActionArgs, cart: any[], language: string) {
    const newCart = removeProduct(cart, args.list[0].name);
    if (newCart.length === cart.length) {
      return {
        role: 'assistant',
        content: `Sorry, I could not find ${args.list[0].name} in your cart`,
      };
    }

    return {
      role: 'assistant',
      content: `I removed ${args.list[0].name} from your cart`,
      cart: newCart,
    };
  }

  showCart(args, cart: any[], language: string) {
    return {
      role: 'assistant',
      content:
        responseDictionary.showCart[language](args) +
        ` ${cart
          .map(
            (item) =>
              `\n * ${item.quantity} ${item.name} ${item.emoji || ''} ${
                item.price
              }$`,
          )
          .join(', ')}`,
      action: { actionType: UserAction.showCart },
      cart,
    };
  }

  clearCart(args, lastAction: AssistantMessageParams, language: string) {
    if (lastAction?.actionType === AssistantAction.cartClearApproval) {
      return {
        role: 'assistant',
        content: responseDictionary.cartCleared[language](),
        cart: [],
        actionType: AssistantAction.clearedCart,
      };
    } else {
      return this.askIfUserWantsToClearCart(language);
    }
  }

  askIfUserWantsToClearCart(language: string) {
    return {
      role: 'assistant',
      content: responseDictionary.clearCart[language](),
      actionType: AssistantAction.cartClearApproval,
    };
  }

  async getAvailableProducts(args: any) {}

  getOpenAI(): OpenAI {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  getRequestedItems(
    availableItems: ICartItem[],
    requestedProducts: PredictItemEntity[],
  ) {
    console.log('availableItems 5', availableItems);
    console.log('requestedProducts 5', requestedProducts);

    if (!availableItems?.length || !requestedProducts.length) {
      return [];
    }
    const availableItemsDeepCopy = JSON.parse(JSON.stringify(availableItems));

    const itemsToAdd = requestedProducts.map((requestedItem) => {
      const item = availableItemsDeepCopy.find((item) => {
        const isNameEqual = item.name
          .toLowerCase()
          .includes(requestedItem.name.toLowerCase());
        if (isNameEqual) {
          return true;
        } else {
          const isSearchKeywordsEqual = item.searchKeywords
            .map((keyword) => keyword.toLowerCase())
            .includes(requestedItem.name.toLowerCase());
          if (isSearchKeywordsEqual) {
            return true;
          }
          return false;
        }
      });

      if (!item) {
        return;
      }

      item.quantity = requestedItem.quantity;

      return item;
    });
    return itemsToAdd.filter((item) => item);
  }

  async findAvailableItemsInDB(
    searchTerms: string[],
  ): Promise<Array<IAvailableItems>> {
    if (!searchTerms?.length) {
      return [];
    }
    const searchTerm = searchTerms?.join('|');

    const aggregation = await this.productModel
      .aggregate([
        {
          $match: {
            $or: [
              this.startsWithCond('name', searchTerm),
              this.exactMatchCond('subCategory', searchTerm),
              this.exactMatchCond('searchKeywords', searchTerm),
              this.exactMatchCond('category', searchTerm),
            ],
          },
        },
        {
          $addFields: {
            matchReason: {
              $switch: {
                branches: [
                  {
                    case: this.startsWithCase('name', searchTerm),
                    then: 'name',
                  },
                  {
                    case: this.exactMatchCase('subCategory', searchTerm),
                    then: 'subCategory',
                  },
                  {
                    case: this.exactMatchCaseArray(
                      'searchKeywords',
                      searchTerm,
                    ),
                    then: 'searchKeywords',
                  },
                  {
                    case: this.exactMatchCase('category', searchTerm),
                    then: 'category',
                  },
                ],
              },
            },
            searchTerm: {
              $switch: {
                branches: [
                  ...searchTerms.map((term) => {
                    return [
                      {
                        case: this.startsWithCase('name', term),
                        then: term,
                      },
                      {
                        case: this.exactMatchCase('subCategory', term),
                        then: term,
                      },
                      {
                        case: this.exactMatchCaseArray('searchKeywords', term),
                        then: term,
                      },
                      {
                        case: this.exactMatchCase('category', term),
                        then: term,
                      },
                    ];
                  }),
                ].flat(),
                default: 'none',
              },
            },
          },
        },

        {
          $group: {
            _id: '$searchTerm', // Group by the "searchTerm" field
            count: { $count: {} },
            items: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            _id: 0, // Exclude the _id field from the output
            searchTerm: '$_id', // Rename _id to itemName
            count: 1, // Include the count field in the output
            items: 1, // Include the items array in the output
          },
        },
      ])

      .exec();

    return aggregation;
  }

  startsWithCond(field: string, searchTerm: string) {
    return {
      [field]: {
        $regex: `^(${searchTerm})`,
        $options: 'i', // Case-insensitive match
      },
    };
  }

  exactMatchCond(field: string, searchTerm: string) {
    return {
      [field]: {
        $regex: `^(${searchTerm})$`,
        $options: 'i', // Case-insensitive match
      },
    };
  }

  startsWithCase(field: string, searchTerm: string) {
    return {
      $regexMatch: {
        input: `$${field}`,
        regex: new RegExp(`^(${searchTerm})`, 'i'),
      },
    };
  }

  exactMatchCase(field: string, searchTerm: string) {
    return {
      $regexMatch: {
        input: `$${field}`,
        regex: new RegExp(`^(${searchTerm})$`, 'i'),
      },
    };
  }

  exactMatchCaseArray(field: string, searchTerm: string) {
    return {
      $anyElementTrue: {
        $map: {
          input: `$${field}`,
          as: 'keyword',
          in: {
            $regexMatch: {
              input: '$$keyword',
              regex: new RegExp('^' + searchTerm + '$', 'i'), // Notice the '$' inside the RegExp to match the exact term at the end of the string
            },
          },
        },
      },
    };
  }

  startsWithRegex = (searchTerm: string) => `^(${searchTerm})`;

  exactMatchRegex = (searchTerm: string) => `^(${searchTerm})$`;

  async getMockItemsFromFS(): Promise<any[]> {
    const fs = require('fs').promises;

    // Specify the path to the JSON file
    const filePath = 'src/grocery-bot-v2/mock-data/mock-db.json';

    try {
      // Read the file asynchronously
      const data = await fs.readFile(filePath, 'utf8');

      // Parse the JSON string to an object
      const jsonObject = JSON.parse(data);

      return jsonObject;
    } catch (err) {
      console.error('Error reading the file:', err);
      return [];
    }
  }
}
