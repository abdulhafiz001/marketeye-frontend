import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const DEFAULT_ICON: IconName = 'basket-outline';

/** Slug / name keywords → MaterialCommunityIcons name */
const KEYWORD_ICONS: Array<{ match: RegExp; icon: IconName }> = [
  { match: /vegetable|veggie|leafy|salad|tomato|pepper|onion/i, icon: 'carrot' },
  { match: /grain|cereal|rice|maize|corn|beans|garri|cassava|flour/i, icon: 'barley' },
  { match: /tuber|yam|potato|plantain/i, icon: 'food' },
  { match: /protein|meat|chicken|beef|goat|livestock/i, icon: 'food-drumstick' },
  { match: /fish|sea|seafood|prawn|crab/i, icon: 'fish' },
  { match: /fruit/i, icon: 'fruit-watermelon' },
  { match: /beverage|drink|water|juice|soda|soft.?drink/i, icon: 'cup' },
  { match: /cook|oil|spice|season|salt|sugar|essential|provision/i, icon: 'pot-steam' },
  { match: /dairy|milk|egg|cheese|yoghurt|yogurt/i, icon: 'cheese' },
  { match: /build|cement|paint|block|hardware|timber/i, icon: 'wall' },
  { match: /snack|bread|bakery/i, icon: 'bread-slice' },
  { match: /frozen|ice/i, icon: 'snowflake' },
];

const KNOWN_ICONS = new Set<string>([
  'carrot',
  'barley',
  'food',
  'food-drumstick',
  'fish',
  'fruit-watermelon',
  'fruit-grapes',
  'cup',
  'pot-steam',
  'cheese',
  'wall',
  'bread-slice',
  'snowflake',
  'basket-outline',
  'shape-outline',
  'leaf',
  'corn',
  'bottle-tonic',
  'food-apple',
  'chili-mild',
  'store',
  'shopping-outline',
]);

function fromKeywords(name?: string | null, slug?: string | null): IconName | null {
  const hay = `${slug || ''} ${name || ''}`.trim();
  if (!hay) return null;
  for (const row of KEYWORD_ICONS) {
    if (row.match.test(hay)) return row.icon;
  }
  return null;
}

/**
 * Resolve a MaterialCommunityIcons name for a category.
 * Prefer API icon when it is a known glyph; otherwise infer from name/slug.
 */
export function resolveCategoryIcon(
  icon?: string | null,
  name?: string | null,
  slug?: string | null,
): IconName {
  const raw = (icon || '').trim();
  if (raw && KNOWN_ICONS.has(raw)) {
    return raw as IconName;
  }
  // Allow any non-empty API value through (admin may set valid MCI names we didn't list)
  if (raw && /^[a-z0-9-]+$/i.test(raw)) {
    return raw as IconName;
  }
  return fromKeywords(name, slug) || DEFAULT_ICON;
}
