import { ChatCompletionMessageParam } from 'openai/resources/chat';
export enum UserAction {
  addToCart = 'add to cart',
  removeFromCart = 'remove from cart',
  addX = 'add x',
  removeX = 'remove x',
  addXMore = 'add x more',
  clearCart = 'clear cart',
  isProductAvailable = 'user asks is product available?',
  whatKindOfProduct = 'user asks what kind of product is available?',
  howAreYou = 'user asking how are you',
  hallo = 'user saying hallo',
  yes = 'yes',
  no = 'no',
  showCart = 'show cart',
  CartClearApproval = 'cart clear approval',
}

export enum ActionType {
  addToCart = 'addToCart',
  removeFromCart = 'removeFromCart',
  addX = 'addX',
  removeX = 'removeX',
  addXMore = 'addXMore',
  clearCart = 'clearCart',
  isProductAvailable = 'isProductAvailable',
  whatKindOfProduct = 'whatKindOfProduct',
  howAreYou = 'howAreYou',
  hallo = 'hallo',
  yes = 'yes',
  no = 'no',
  showCart = 'showCart',
  CartClearApproval = 'CartClearApproval',
  Generated = 'Generated',
}

export interface CompletionBody {
  messages: ChatCompletionMessageParam[];
  tempUserId?: string; // tempUserId is used for streaming three first messages
}

export interface GroceryRequestBody {
  message: ChatCompletionMessageParam;
  cart: ICartItem[];
  lastAction: Action;
}

export interface ICartItem {
  name: string;
  quantity: number;
  unit: string;
  isAvailable: boolean;
  searchKeywords?: string[];
  price?: number;
  productId?: number;
  barcode?: string;
  category?: string;
  emoji?: string;
}

export interface GroceryResponseBody {
  role: 'system';
  message: string;
  cart: ICartItem[];
  action: Action;
}

export interface Action {
  actionType: ActionType;
  items?: ICartItem[];
  message?: string;
}
