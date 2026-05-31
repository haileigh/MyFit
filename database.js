import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEMS_KEY     = 'myfit_items';
const OUTFITS_KEY   = 'myfit_outfits';
const SETTINGS_KEY  = 'myfit_settings';
const WISHLIST_KEY  = 'myfit_wishlist';
let nextId = 1000;

function makeId() { return nextId++; }

const DEFAULT_SETTINGS = {
  currency: '$', cpwGoal: null, hiddenSeasons: [],
  customFields: [
    { key: 'custom_1', label: '' },
    { key: 'custom_2', label: '' },
    { key: 'custom_3', label: '' },
  ],
};

export async function getSettings() {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function initDB() {
  const existing = await AsyncStorage.getItem(ITEMS_KEY);
  if (!existing) await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(getSampleData()));
  const items = await getAllItems();
  if (items.length > 0) {
    const maxId = Math.max(...items.map(i => i.id));
    nextId = maxId + 1;
  }
}

export async function getAllItems() {
  const data = await AsyncStorage.getItem(ITEMS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function getItemById(id) {
  const items = await getAllItems();
  return items.find(i => i.id === id) || null;
}

export async function insertItem(item) {
  const items = await getAllItems();
  const newItem = { ...item, id: makeId(), times_worn: 0, last_worn: null, in_laundry: false, created_at: new Date().toISOString() };
  items.unshift(newItem);
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  return newItem.id;
}

export async function updateItem(id, fields) {
  const items = await getAllItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...fields, id, updated_at: new Date().toISOString() };
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }
}

export async function deleteItem(id) {
  const items = await getAllItems();
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items.filter(i => i.id !== id)));
}

export async function logWear(id) {
  const items = await getAllItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx].times_worn = (items[idx].times_worn || 0) + 1;
    items[idx].last_worn = new Date().toISOString();
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }
}

export async function getAllOutfits() {
  const data = await AsyncStorage.getItem(OUTFITS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function insertOutfit(name, itemIds) {
  const outfits = await getAllOutfits();
  const newOutfit = { id: makeId(), name: name || 'My Outfit', item_ids: JSON.stringify(itemIds), times_worn: 0, last_worn: null, created_at: new Date().toISOString() };
  outfits.unshift(newOutfit);
  await AsyncStorage.setItem(OUTFITS_KEY, JSON.stringify(outfits));
  return newOutfit.id;
}

export async function logOutfitWear(id) {
  const outfits = await getAllOutfits();
  const idx = outfits.findIndex(o => o.id === id);
  if (idx !== -1) {
    outfits[idx].times_worn = (outfits[idx].times_worn || 0) + 1;
    outfits[idx].last_worn = new Date().toISOString();
    await AsyncStorage.setItem(OUTFITS_KEY, JSON.stringify(outfits));
    const itemIds = JSON.parse(outfits[idx].item_ids);
    for (const itemId of itemIds) { await logWear(itemId); }
  }
}

// ── Wishlist ───────────────────────────────────────────────────
export async function getWishlist() {
  const data = await AsyncStorage.getItem(WISHLIST_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addWishlistItem(item) {
  const items = await getWishlist();
  const newItem = { ...item, id: makeId(), desired_price: item.desired_price ? parseFloat(item.desired_price) : null, actual_price: null, created_at: new Date().toISOString() };
  items.unshift(newItem);
  await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  return newItem.id;
}

export async function updateWishlistItem(id, fields) {
  const items = await getWishlist();
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...fields, id };
    await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  }
}

export async function deleteWishlistItem(id) {
  const items = await getWishlist();
  await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(items.filter(i => i.id !== id)));
}

// ── Stats ──────────────────────────────────────────────────────
export async function getStats() {
  const items = await getAllItems();
  const total = items.length;
  const totalWorn = items.reduce((sum, i) => sum + (i.times_worn || 0), 0);
  const neverWorn = items.filter(i => !i.times_worn).length;
  const inLaundry = items.filter(i => i.in_laundry).length;
  const mostWorn = [...items].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0))[0] || null;
  const catMap = {}, seasonMap = {};
  items.forEach(i => {
    if (i.category) catMap[i.category] = (catMap[i.category] || 0) + 1;
    if (i.color_season) seasonMap[i.color_season] = (seasonMap[i.color_season] || 0) + 1;
  });
  const byCategory = Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  const bySeason = Object.entries(seasonMap).map(([color_season, count]) => ({ color_season, count })).sort((a, b) => b.count - a.count);
  const unworn = items.filter(i => !i.times_worn).slice(0, 10);
  return { total, totalWorn, neverWorn, inLaundry, mostWorn, byCategory, bySeason, unworn, allItems: items };
}

function getSampleData() {
  return [
    { id: 1, brand: 'Toteme', name: 'Double-breasted coat', description: 'Structured wool-blend coat', color: 'Camel', color_season: 'Deep Winter', category: 'Outerwear', original_price: 580, times_worn: 7, last_worn: null, in_laundry: false, image_uri: null, note1: 'Dry clean only.', note2: '', note3: '', custom_1: 'Work', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
    { id: 2, brand: 'Agolde', name: '90s pinch waist jeans', description: 'High-rise relaxed jeans', color: 'Indigo', color_season: 'Deep Winter', category: 'Bottoms', original_price: 228, times_worn: 18, last_worn: null, in_laundry: false, image_uri: null, note1: 'Size down one.', note2: '', note3: '', custom_1: 'Casual', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
    { id: 3, brand: 'Arket', name: 'Merino midi dress', description: 'Ribbed knit dress', color: 'Burgundy', color_season: 'Deep Winter', category: 'Dresses', original_price: 179, times_worn: 5, last_worn: null, in_laundry: false, image_uri: null, note1: 'Hand wash cold.', note2: '', note3: '', custom_1: '', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
    { id: 4, brand: 'New Balance', name: '990v5 sneakers', description: 'Classic running sneaker', color: 'Grey', color_season: 'Soft Summer', category: 'Shoes', original_price: 185, times_worn: 22, last_worn: null, in_laundry: false, image_uri: null, note1: 'Go up half a size.', note2: '', note3: '', custom_1: '', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
    { id: 5, brand: 'Acne Studios', name: 'Logo wool scarf', description: 'Oversized fringed scarf', color: 'Ivory', color_season: 'Soft Summer', category: 'Accessories', original_price: 320, times_worn: 9, last_worn: null, in_laundry: false, image_uri: null, note1: 'Bought in Stockholm.', note2: '', note3: '', custom_1: 'Travel', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
    { id: 6, brand: 'Polène', name: 'Numéro un mini', description: 'Structured leather bag', color: 'Taupe', color_season: 'True Autumn', category: 'Bags', original_price: 295, times_worn: 14, last_worn: null, in_laundry: false, image_uri: null, note1: 'Very durable.', note2: '', note3: '', custom_1: '', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
    { id: 7, brand: 'Madewell', name: 'The Zahara loafer', description: 'Block-heel leather loafer', color: 'Black', color_season: 'Deep Winter', category: 'Shoes', original_price: 148, times_worn: 11, last_worn: null, in_laundry: false, image_uri: null, note1: 'Resoleable.', note2: '', note3: '', custom_1: '', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
    { id: 8, brand: 'COS', name: 'Chunky ribbed sweater', description: 'Relaxed oversized knit', color: 'Oatmeal', color_season: 'Soft Summer', category: 'Tops', original_price: 99, times_worn: 6, last_worn: null, in_laundry: false, image_uri: null, note1: 'Dry flat.', note2: '', note3: '', custom_1: '', custom_2: '', custom_3: '', created_at: new Date().toISOString() },
  ];
}
