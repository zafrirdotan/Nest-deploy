import { ICartItem } from 'src/grocery-bot-v2/dto/completion-body.dto';

export function reduceArrays(cart: ICartItem[], removedItems: ICartItem[]) {
  if (!cart || cart.length === 0) {
    return [];
  }

  if (!removedItems || removedItems.length === 0) {
    return cart;
  }

  const newCart = cart
    .map((cartItem) => {
      const removedItem = removedItems.find(
        (removedItem) =>
          removedItem.name === cartItem.name ||
          cartItem.name.includes(removedItem.name) ||
          cartItem.searchKeywords.includes(removedItem.name),
      );
      if (removedItem) {
        return {
          ...cartItem,
          quantity: cartItem.quantity - removedItem.quantity,
        };
      }
      return cartItem;
    })
    .filter((item) => item.quantity > 0);

  return Array.from(newCart);
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

const fruitEmojis: { [key: string]: string } = {
  apple: '🍎',
  banana: '🍌',
  orange: '🍊',
  strawberry: '🍓',
  grapes: '🍇',
  watermelon: '🍉',
  lemon: '🍋',
  melon: '🍈',
  pineapple: '🍍',
  mango: '🥭',
  pear: '🍐',
  peach: '🍑',
  cherries: '🍒',
  kiwi: '🥝',
  avocado: '🥑',
  coconut: '🥥',
  tomato: '🍅',
  eggplant: '🍆',
  cucumber: '🥒',
  carrot: '🥕',
  corn: '🌽',
  hotPepper: '🌶️',
  bellPepper: '🫑',
  leafyGreen: '🥬',
  broccoli: '🥦',
  garlic: '🧄',
  onion: '🧅',
  mushroom: '🍄',
  peanuts: '🥜',
  chestnut: '🌰',
  bread: '🍞',
  croissant: '🥐',
  baguette: '🥖',
  pancakes: '🥞',
  waffle: '🧇',
  cheese: '🧀',
  egg: '🥚',
  friedEgg: '🍳',
  bacon: '🥓',
  cutOfMeat: '🥩',
  poultryLeg: '🍗',
  meatOnBone: '🍖',
  hotDog: '🌭',
  hamburger: '🍔',
  frenchFries: '🍟',
  pizza: '🍕',
  sandwich: '🥪',
  milk: '🥛',
  chocolate: '🍫',
  shampoo: '🧴',
  soap: '🧼',
  toothbrush: '🪥',
};

export function getEmoji(name: string) {
  if (!name) {
    return '';
  }
  const nameArray = name?.toLocaleLowerCase().split(' ');
  for (const subName of nameArray) {
    if (fruitEmojis[subName] || fruitEmojis[subName + 's']) {
      return fruitEmojis[subName];
    }
  }
  return '';
}
