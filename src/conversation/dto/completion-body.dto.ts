import { ChatCompletionMessageParam } from "openai/resources/chat";
import { type } from "os";

export interface CompletionBody {
    messages: ChatCompletionMessageParam[];
    tempUserId?: string; // tempUserId is used for streaming three first messages
}

export interface GrocerySumBody {
    messages: ChatCompletionMessageParam[];
    cart: ICartItem[];
    lastAction: Action;

}

export interface ICartItem {
    name: string; quantity: string, unit: string;
}

export interface Action { action: string; list: ICartItem[]; }

export type ActionType = 'add to cart' | 'remove from cart' | 'saying hallo' | 'something else';