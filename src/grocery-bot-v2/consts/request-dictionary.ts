import { UserActionStrings } from '../dto/completion-body.dto';

export const Descriptions: Record<
  RequestActions,
  {
    he: string;
    en: string;
  }
> = {
  addAndRemove: {
    en: 'add or remove from cart and gat the items that was added or removed from the original cart',
    he: 'הוסף לעגלה וקבל את הפריטים שנוספו או הוסרו מהעגלה המקורית',
  },
  addOrRemoveX: {
    en: 'add or remove x more',
    he: 'הוסף או הסר x נוספים',
  },
  clearCart: {
    en: 'user wants to clear the cart or approve clearing the cart',
    he: 'משתמש רוצה לנקות את העגלה או לאשר ניקוי עגלה',
  },
  getAvailableProducts: {
    en: 'user asks what kind of product is available',
    he: 'משתמש שואל איזה מוצרים זמינים',
  },
};

export enum RequestActions {
  addAndRemove = 'addAndRemove',
  addOrRemoveX = 'addOrRemoveX',
  clearCart = 'clearCart',
  getAvailableProducts = 'getAvailableProducts',
}

export enum FunctionEntityTypes {
  object = 'object',
  string = 'string',
  number = 'number',
  array = 'array',
  boolean = 'boolean',
}

export interface UserActionArgs {
  list: PredictItemEntity[];
  action: UserActionStrings;
}

export type PredictItemEntity = {
  name: string;
  quantity: number;
  unit: string;
  removeAll: boolean;
};
