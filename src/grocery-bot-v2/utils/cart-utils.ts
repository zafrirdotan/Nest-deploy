import { ICartItem } from 'src/grocery-bot-v2/dto/completion-body.dto';
import { PredictItemEntity } from '../consts/request-dictionary';

export function reduceFromCart(
  cart: ICartItem[],
  itemsToRemove: PredictItemEntity[],
) {
  if (!cart?.length || !itemsToRemove?.length) {
    return {
      cart,
      reducedItems: [],
    };
  }

  const newCartDeepCopy = JSON.parse(JSON.stringify(cart));

  const reducedItems = [];
  itemsToRemove.forEach((item) => {
    const itemName = item.name.toLowerCase();
    const existingItem = newCartDeepCopy.find((cartItem) => {
      const cartItemName = cartItem.name?.toLowerCase();

      return (
        cartItemName === itemName ||
        cartItemName?.startsWith(itemName) ||
        cartItem.searchKeywords?.includes(itemName)
      );
    });

    if (existingItem) {
      let newQuantity;
      console.log('existingItem', existingItem);

      if (item.removeAll || !item.quantity) {
        newQuantity = 0;
      } else {
        newQuantity = existingItem.quantity - item.quantity;
      }

      if (newQuantity < 0) {
        newQuantity = 0;
      }
      console.log('newQuantity', newQuantity);

      reducedItems.push({
        name: existingItem.name,
        quantity: existingItem.quantity - newQuantity,
      });

      existingItem.quantity = newQuantity;
    }
  });

  return {
    newCart: newCartDeepCopy.filter((item) => item.quantity > 0),
    reducedItems,
  };
}

export function removeProduct(cart: ICartItem[], productName: string) {
  if (!cart || !productName) {
    return cart;
  }
  productName = productName.toLowerCase();

  return cart.filter(
    (item) =>
      !(
        item.name.toLocaleLowerCase() === productName ||
        item.name.toLocaleLowerCase().startsWith(productName) ||
        item.searchKeywords?.includes(productName)
      ),
  );
}

export function addToCart(cart: ICartItem[], itemsToAdd: ICartItem[]) {
  console.log('cart', cart);
  console.log('itemsToAdd', itemsToAdd);

  if (!itemsToAdd) {
    return cart;
  }

  if (!cart) {
    return itemsToAdd;
  }

  const cartMap = {};
  cart.forEach((item) => {
    cartMap[item.name] = item;
  });
  console.log('cartMap', cartMap);

  itemsToAdd.forEach((item) => {
    if (cartMap[item.name]) {
      console.log('cartMap[item.name]', cartMap[item.name]);
      console.log('item.quantity', item.quantity);
      if (item.quantity === undefined) {
        item.quantity = 1;
      }

      cartMap[item.name].quantity += item.quantity;
      console.log('cartMap[item.name].quantity', cartMap[item.name].quantity);
    } else {
      item.emoji = getEmoji(item.name);
      cartMap[item.name] = item;
    }
  });

  return Object.values(cartMap);
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
