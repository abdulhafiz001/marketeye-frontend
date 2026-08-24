import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const DEFAULT_ICON: IconName = 'basket-outline';

/** List of verified valid MaterialCommunityIcons names used in our app */
const KNOWN_ICONS = new Set<string>([
  'carrot',
  'barley',
  'rice',
  'corn',
  'seed',
  'sack',
  'food',
  'food-croissant',
  'food-apple',
  'food-drumstick',
  'food-steak',
  'fish',
  'fruit-watermelon',
  'fruit-grapes',
  'fruit-citrus',
  'cup',
  'cup-water',
  'coffee',
  'water',
  'bottle-soda',
  'glass-wine',
  'pot-steam',
  'oil',
  'bottle-tonic-outline',
  'bottle-tonic',
  'egg-easter',
  'cheese',
  'wall',
  'bread-slice',
  'snowflake',
  'basket-outline',
  'basket',
  'shopping-outline',
  'shopping',
  'shape-outline',
  'leaf',
  'chili-mild',
  'store',
  'spray-bottle',
  'baby-carriage',
  'tshirt-crew',
  'cellphone',
  'pill',
  'cow',
]);

/** Comprehensive Slug / Name / Raw keyword patterns → MaterialCommunityIcons name */
const KEYWORD_ICONS: Array<{ match: RegExp; icon: IconName }> = [
  // Vegetables & Peppers
  { match: /pepper|chili|ata|rodo|shombo|tatashe/i, icon: 'chili-mild' },
  { match: /vegetable|veggie|leafy|salad|tomato|onion|spinach|ugwu|ewedu|okra|cabbage|cucumber|carrot/i, icon: 'carrot' },
  { match: /leaf|herbs|scent/i, icon: 'leaf' },

  // Grains, Flours & Cereals
  { match: /rice|tuwo|ofada|foreign.?rice|local.?rice/i, icon: 'rice' },
  { match: /corn|maize|popcorn/i, icon: 'corn' },
  { match: /grain|cereal|barley|wheat|sorghum|millet|acha/i, icon: 'barley' },
  { match: /bean|olooyin|cowpea|soya/i, icon: 'seed' },
  { match: /garri|gari|cassava|flour|semovita|semo|wheat.?meal|elubo|amala/i, icon: 'sack' },

  // Tubers & Roots
  { match: /tuber|yam|potato|sweet.?potato|irish|cocoyam/i, icon: 'food-croissant' },
  { match: /plantain|dodo|bole/i, icon: 'food-apple' },

  // Protein, Meat, Poultry & Livestock
  { match: /chicken|poultry|fowl|broiler|layer/i, icon: 'food-drumstick' },
  { match: /meat|beef|cow|suya|goat|chevon|ram|mutton|pork|lamb|assorted|kpomo|cow.?leg/i, icon: 'food-steak' },
  { match: /turkey/i, icon: 'food-drumstick' },
  { match: /protein/i, icon: 'food-drumstick' },
  { match: /livestock|cattle|bull/i, icon: 'cow' },

  // Seafood & Fishery
  { match: /fish|titus|catfish|croaker|tilapia|sea|seafood|prawn|crab|crayfish|shrimp|smoked.?fish/i, icon: 'fish' },

  // Fruits
  { match: /watermelon|melon/i, icon: 'fruit-watermelon' },
  { match: /grape|berry/i, icon: 'fruit-grapes' },
  { match: /orange|citrus|lemon|lime/i, icon: 'fruit-citrus' },
  { match: /fruit|fruits|banana|mango|pineapple|apple|pawpaw|guava|avocado|pear/i, icon: 'fruit-watermelon' },

  // Beverages, Water & Drinks
  { match: /water|pure.?water|bottled.?water|table.?water/i, icon: 'water' },
  { match: /coffee|cappuccino|latte/i, icon: 'coffee' },
  { match: /tea|milo|bournvita|ovaltine|cocoa/i, icon: 'cup-water' },
  { match: /soda|soft.?drink|coke|fanta|pepsi|malt|carbonated/i, icon: 'bottle-soda' },
  { match: /wine|beer|alcohol|liquor|gin/i, icon: 'glass-wine' },
  { match: /beverage|beverages|drink|drinks|juice/i, icon: 'cup' },

  // Cooking Oils, Spices, Seasonings & Provisions
  { match: /palm.?oil|red.?oil/i, icon: 'oil' },
  { match: /vegetable.?oil|groundnut.?oil|soya.?oil|cooking.?oil/i, icon: 'bottle-tonic-outline' },
  { match: /cook|cooking|spice|seasoning|curry|thyme|ginger|garlic|maggi|knorr|cube|salt|sugar|essential|provision|grocery|groceries|condiment/i, icon: 'pot-steam' },

  // Dairy & Eggs
  { match: /egg|eggs|crate/i, icon: 'egg-easter' },
  { match: /dairy|milk|cheese|wasi|wagashi|yoghurt|yogurt|butter/i, icon: 'cheese' },

  // Bakery & Snacks
  { match: /snack|bread|bakery|biscuit|cookie|chin.?chin|cake|pastry|pie/i, icon: 'bread-slice' },

  // Frozen & Chilled
  { match: /frozen|ice|cold.?room/i, icon: 'snowflake' },

  // Building & Hardware
  { match: /build|cement|paint|block|hardware|timber|plumbing|iron|rod|zinc|sand/i, icon: 'wall' },

  // Household, Cleaning & Toiletries
  { match: /detergent|soap|toiletries|hygiene|cleaning|bleach|sponge|cosmetics|beauty|cream|perfume/i, icon: 'spray-bottle' },

  // Baby Products
  { match: /baby|infant|diaper|pampers|nan|cerelac/i, icon: 'baby-carriage' },

  // Fashion & Wear
  { match: /cloth|fabric|ankara|lace|shoe|slippers|bag|wear|fashion/i, icon: 'tshirt-crew' },

  // Tech & Electronics
  { match: /electric|gadget|phone|charger|bulb|appliance|cable/i, icon: 'cellphone' },

  // Health & Medicine
  { match: /health|drug|medicine|pharmacy|syrup/i, icon: 'pill' },
];

function fromKeywords(...strings: Array<string | null | undefined>): IconName | null {
  const hay = strings.filter(Boolean).join(' ').trim();
  if (!hay) return null;
  for (const row of KEYWORD_ICONS) {
    if (row.match.test(hay)) return row.icon;
  }
  return null;
}

/**
 * Resolve a MaterialCommunityIcons name for any commodity or category.
 * Handles known icons, maps invalid names (like 'beverages', 'cooking', 'fruits', 'protein') to valid MCI icons.
 */
export function resolveCategoryIcon(
  icon?: string | null,
  name?: string | null,
  slug?: string | null,
): IconName {
  const raw = (icon || '').trim().toLowerCase();

  // 1. If raw icon is directly verified in KNOWN_ICONS
  if (raw && !raw.includes('?') && KNOWN_ICONS.has(raw)) {
    return raw as IconName;
  }

  // 2. Try to map raw icon string itself (e.g. "beverages" -> "cup", "cooking" -> "pot-steam")
  const rawMapped = fromKeywords(raw);
  if (rawMapped) {
    return rawMapped;
  }

  // 3. Infer from name or slug keywords
  const nameMapped = fromKeywords(slug, name);
  if (nameMapped) {
    return nameMapped;
  }

  // 4. Default fallback
  return DEFAULT_ICON;
}
