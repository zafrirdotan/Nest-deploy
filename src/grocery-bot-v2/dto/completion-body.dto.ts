import { ChatCompletionMessageParam } from 'openai/resources/chat';
export enum UserAction {
  addToCart = 'add to cart',
  removeFromCart = 'remove from cart',
  addX = 'add x',
  removeX = 'remove x',
  clearCart = 'clear cart',
  isProductAvailable = 'user asks is product available?',
  howAreYou = 'user asking how are you',
  hallo = 'user saying hallo',
  yes = 'yes',
  no = 'no',
  showCart = 'show cart',
  CartClearApproval = 'cart clear approval',
}

export interface CompletionBody {
  messages: ChatCompletionMessageParam[];
  tempUserId?: string; // tempUserId is used for streaming three first messages
}

export interface GrocerySumBody {
  message: ChatCompletionMessageParam;
  cart: ICartItem[];
  lastAction: LastAction;
}

export interface ICartItem {
  name: string;
  quantity: number;
  unit: string;
  isAvailable: boolean;
  searchKeywords?: string[];
}

export interface LastAction {
  action: UserAction;
  list: ICartItem[];
}

export type ActionType =
  | 'add to cart'
  | 'remove from cart'
  | 'saying hallo'
  | 'something else';
