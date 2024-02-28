export const Descriptions: Record<
  RequestActions,
  {
    he: string;
    en: string;
  }
> = {
  sayHallo: {
    en: 'if the user is saying hallo',
    he: 'שהמשתמש אומר שלום',
  },
  yesNo: {
    en: 'return yes or no depending on the user answer',
    he: "החזר 'כן' או 'לא' בהתאם לתשובת המשתמש",
  },
  addAndRemove: {
    en: 'add or remove from cart and gat the items that was added or removed from the original cart',
    he: 'הוסף לעגלה וקבל את הפריטים שנוספו או הוסרו מהעגלה המקורית',
  },
  addOrRemoveX: {
    en: 'add or remove x more',
    he: 'הוסף או הסר x נוספים',
  },
};

export enum RequestActions {
  sayHallo = 'sayHallo',
  yesNo = 'yesNo',
  addAndRemove = 'addAndRemove',
  addOrRemoveX = 'addOrRemoveX',
}

export enum FunctionEntityTypes {
  object = 'object',
  string = 'string',
  number = 'number',
  array = 'array',
  boolean = 'boolean',
}
