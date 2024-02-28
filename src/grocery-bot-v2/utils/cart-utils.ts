import { ICartItem } from 'src/grocery-bot-v2/dto/completion-body.dto';

export function reduceArrays(cart: ICartItem[], removedItems: ICartItem[]) {
  const nameToItem = new Map();

  cart.forEach((item) => {
    nameToItem.set(item.name?.toLowerCase(), { ...item });
  });

  removedItems.forEach((item) => {
    if (nameToItem.has(item.name?.toLowerCase())) {
      const existingItem = nameToItem.get(item.name?.toLowerCase());
      existingItem.quantity =
        (existingItem.quantity || 0) - (item.quantity || 0);
      if (existingItem.quantity <= 0) {
        nameToItem.delete(item.name?.toLowerCase());
      } else {
        nameToItem.set(item.name?.toLowerCase(), existingItem);
      }
    }
  });

  return Array.from(nameToItem.values());
}

export function mergeArrays(cart: ICartItem[], addedItems: ICartItem[]) {
  const mergedArray = [...cart, ...addedItems];
  const nameToItem = new Map();

  mergedArray.forEach((item) => {
    if (!nameToItem.has(item.name)) {
      nameToItem.set(item.name, { ...item });
    } else {
      const existingItem = nameToItem.get(item.name);
      existingItem.quantity =
        (existingItem.quantity || 0) + (item.quantity || 0);
      nameToItem.set(item.name, existingItem);
    }
  });

  return Array.from(nameToItem.values());
}
