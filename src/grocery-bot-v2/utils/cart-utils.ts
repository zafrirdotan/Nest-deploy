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

export function removeFromArray(cart: ICartItem[], removedItems: ICartItem[]) {
  // remove from the cart items that are part of the cart items searchKeywords
  const removedNames = removedItems.map((item) => item.name);
  const newCart = cart.filter(
    (item) =>
      !removedNames.includes(item.name) &&
      !isAnyElementIncluded(item.searchKeywords, removedNames),

    // add as well the items that are not part of the searchKeywords
  );
  return newCart;
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

function isAnyElementIncluded(arr1, arr2) {
  // Check if any element in arr1 is included in arr2

  return arr1?.some((element) => arr2?.includes(element));
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
