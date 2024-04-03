export enum UserActionStrings {
  addToCart = 'add to cart',
  removeFromCart = 'remove from cart',
  addX = 'add x',
  removeX = 'remove x',
  addMore = 'add more',
  addAnotherX = 'add another x',
  addToCartApproval = 'yes. add to cart',
  theXOne = 'the x one',
  isProductAvailable = 'user asks is product available?',
  whatKindOfProduct = 'user asks what kind of product is available?',
  howAreYou = 'user asking how are you',
  showCart = 'show cart',
  CartClearApproval = 'cart clear approval',
  getPrice = 'what is the price of an item',
  getAvailableProducts = 'get available products',
  clearCart = 'user wants to clear the cart',
  clearCartApprove = 'yes. I want to clear',
  removeAll = 'remove all',
}

export enum UserAction {
  addToCart = 'addToCart',
  removeFromCart = 'removeFromCart',
  addX = 'addX',
  removeX = 'removeX',
  addXMore = 'addXMore',
  clearCart = 'clearCart',
  isProductAvailable = 'isProductAvailable',
  whatKindOfProduct = 'whatKindOfProduct',
  showCart = 'showCart',
}

export enum AssistantAction {
  addedToCart = 'addedToCart',
  removedFromCart = 'removedFromCart',
  addedX = 'addedX',
  removedX = 'removedX',
  addedXMore = 'addedXMore',
  clearedCart = 'clearedCart',
  showedCart = 'showedCart',
  showAvailableProducts = 'showAvailableProducts',
  generated = 'generated',
  notUnderstood = 'notUnderstood',
  cartClearApproval = 'cartClearApproval',
  notFoundInInventory = 'notFoundInInventory',
  notFoundInCart = 'notFoundInCart',
}

export interface GroceryBotCompletion {
  messages: Array<GroceryBotCompletionParam>;
  cart?: ICartItem[];
}

export type GroceryBotCompletionParam =
  | UserMessageParams
  | AssistantMessageParams;

export interface UserMessageParams {
  role: 'user';
  content: string;
  cart?: ICartItem[];
  actionType?: UserAction;
}
export interface AssistantMessageParams {
  role: 'assistant';
  content: string;
  actionType: AssistantAction;
  shortContentMessage?: string;
  cart?: ICartItem[];
  availableItems?: IAvailableItems[];
  unavailableItems?: ICartItem[];
  addedItems?: ICartItem[];
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

export interface IAvailableItems {
  searchTerm: string;
  count: number;
  items: ICartItem[];
}

export interface Action {
  availableItems?: { searchTerm: string; items: ICartItem[]; count: number };
  actionType: UserAction | AssistantAction;
  items?: ICartItem[];
  message?: string;
}
