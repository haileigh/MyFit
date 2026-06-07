import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Image, Dimensions, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAllItems, insertOutfit, logOutfitWear, likeOutfit } from './database';
import {
  COLORS, SPACING, RADIUS, SEASONS,
  CORE_CATEGORIES, OUTERWEAR_CATEGORIES, ACCESSORY_CATEGORIES, CORE_STACK_ORDER,
} from './theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD        = SPACING.xl;
const CARD_GAP     = 10;
const CARD_WIDTH   = Math.floor((SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2);
const CARD_HEIGHT  = Math.round(CARD_WIDTH * 1.35);
const OVERLAP      = Math.round(CARD_HEIGHT * 0.25);
const H_NUDGE      = 8;

// Accessory strip thumb size
const ACC_THUMB    = Math.floor((SCREEN_WIDTH - H_PAD * 2 - CARD_GAP * 3) / 4);

const MODES = ['Random', 'Coordinated', 'Start with item'];

const SEASON_FAMILIES = {
  winter: ['Deep Winter', 'True Winter', 'Bright Winter'],
  summer: ['Soft Summer', 'True Summer', 'Light Summer'],
  autumn: ['Deep Autumn', 'True Autumn', 'Soft Autumn'],
  spring: ['Light Spring', 'True Spring', 'Bright Spring'],
};

function getSeasonFamily(s) {
  for (const [f, seasons] of Object.entries(SEASON_FAMILIES)) {
    if (seasons.includes(s)) return f;
  }
  return null;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortByStackOrder(items) {
  return [...items].sort((a, b) => {
    const ia = CORE_STACK_ORDER.indexOf(a.category);
    const ib = CORE_STACK_ORDER.indexOf(b.category);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

// Split items into core and accessories
function splitItems(items) {
  const core = items.filter(i => CORE_CATEGORIES.has(i.category));
  const acc  = items.filter(i => ACCESSORY_CATEGORIES.has(i.category));
  return { core, acc };
}

// Build the core outfit (top/bottom/dress, optionally outerwear)
function buildCore(pool, mode, anchorId, includeOuterwear) {
  const pick = arr => arr.length ? shuffleArr(arr)[0] : null;

  const tops   = pool.filter(i => ['Tops', 'Long Sleeve', 'Short Sleeve'].includes(i.category));
  const dresses = pool.filter(i => i.category === 'Dresses');
  const bottoms = pool.filter(i => ['Bottoms', 'Pants', 'Skirts', 'Shorts', 'Skort'].includes(i.category));
  const outers  = pool.filter(i => OUTERWEAR_CATEGORIES.has(i.category));
  const allTops = [...tops, ...dresses];

  if (mode === 'Start with item' && anchorId) {
    const anchor = pool.find(i => i.id === anchorId);
    if (!anchor) return buildCore(pool, 'Random', null, includeOuterwear);
    const rest = shuffleArr(pool.filter(i => i.id !== anchorId && CORE_CATEGORIES.has(i.category))).slice(0, 2);
    const outer = includeOuterwear ? pick(outers) : null;
    return sortByStackOrder([outer, anchor, ...rest].filter(Boolean));
  }

  if (mode === 'Coordinated') {
    const families = pool.map(i => getSeasonFamily(i.color_season)).filter(Boolean);
    const dominant = families.length
      ? families.sort((a, b) => families.filter(f => f === b).length - families.filter(f => f === a).length)[0]
      : null;
    const cp = dominant ? shuffleArr(pool.filter(i => getSeasonFamily(i.color_season) === dominant)) : pool;
    const top    = pick(cp.filter(i => CORE_CATEGORIES.has(i.category) && !['Bottoms','Pants','Skirts','Shorts','Skort'].includes(i.category))) || pick(allTops);
    const bottom = top?.category !== 'Dresses' ? pick(cp.filter(i => ['Bottoms','Pants','Skirts','Shorts','Skort'].includes(i.category))) || pick(bottoms) : null;
    const outer  = includeOuterwear ? pick(outers) : null;
    return sortByStackOrder([outer, top, bottom].filter(Boolean));
  }

  // Random
  const top    = pick(allTops);
  const bottom = top?.category !== 'Dresses' ? pick(bottoms) : null;
  const outer  = includeOuterwear ? pick(outers) : null;
  return sortByStackOrder([outer, top, bottom].filter(Boolean));
}

// Build accessories independently
function buildAccessories(pool) {
  const accPool = shuffleArr(pool.filter(i => ACCESSORY_CATEGORIES.has(i.category)));
  return accPool.slice(0, 4);
}

function scoreOutfit(core, acc) {
  const all = [...core, ...acc];
  if (!all.length) return 'Add items to get started';
  const families = [...new Set(all.map(i => getSeasonFamily(i.color_season)).filter(Boolean))];
  if (families.length === 1) return 'Perfectly cohesive — all ' + families[0] + ' tones';
  if (families.length === 2) return 'Harmonious mix — complementary palettes';
  return 'Eclectic and bold — intentional contrast';
}

// ── ADAPTIVE COLLAGE ──────────────────────────────────────────────────────────
// 1 item  → full width, tall
// 2 items → side by side, no overlap
// 3 items → 2 on top, 1 centered below (or 1 on top, 2 below)
// 4 items → 2×2 with overlap + horizontal nudge
function OutfitCollage({ items, onItemPress }) {
  if (!items.length) return null;
  const count = Math.min(items.length, 4);

  if (count === 1) {
    const item   = items[0];
    const season = SEASONS[item.color_season];
    return (
      <View style={col.container}>
        <TouchableOpacity
          style={[col.card, { width: CARD_WIDTH * 2 + CARD_GAP, height: Math.round((CARD_WIDTH * 2 + CARD_GAP) * 1.2) }]}
          onPress={() => onItemPress(item)} activeOpacity={0.88}
        >
          {item.image_uri
            ? <Image source={{ uri: item.image_uri }} style={col.img} resizeMode="cover" />
            : <View style={col.placeholder}><Feather name="image" size={40} color={COLORS.ink3} /><Text style={col.placeholderText} numberOfLines={2}>{item.name}</Text></View>}
          {season && <View style={[col.seasonBadge, { backgroundColor: season.bg }]}><Text style={[col.seasonText, { color: season.text }]}>{season.short}</Text></View>}
          <View style={col.nameBadge}><Text style={col.nameText} numberOfLines={1}>{item.name}</Text></View>
        </TouchableOpacity>
      </View>
    );
  }

  if (count === 2) {
    return (
      <View style={col.container}>
        <View style={[col.row, { gap: CARD_GAP }]}>
          {items.slice(0, 2).map(item => {
            const season = SEASONS[item.color_season];
            return (
              <TouchableOpacity key={item.id} style={[col.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]} onPress={() => onItemPress(item)} activeOpacity={0.88}>
                {item.image_uri ? <Image source={{ uri: item.image_uri }} style={col.img} resizeMode="cover" /> : <View style={col.placeholder}><Feather name="image" size={28} color={COLORS.ink3} /><Text style={col.placeholderText} numberOfLines={2}>{item.name}</Text></View>}
                {season && <View style={[col.seasonBadge, { backgroundColor: season.bg }]}><Text style={[col.seasonText, { color: season.text }]}>{season.short}</Text></View>}
                <View style={col.nameBadge}><Text style={col.nameText} numberOfLines={1}>{item.name}</Text></View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (count === 3) {
    const [a, b, c] = items;
    const season = (i) => SEASONS[i.color_season];
    const Card = ({ item, width, height }) => (
      <TouchableOpacity style={[col.card, { width, height }]} onPress={() => onItemPress(item)} activeOpacity={0.88}>
        {item.image_uri ? <Image source={{ uri: item.image_uri }} style={col.img} resizeMode="cover" /> : <View style={col.placeholder}><Feather name="image" size={28} color={COLORS.ink3} /></View>}
        {season(item) && <View style={[col.seasonBadge, { backgroundColor: season(item).bg }]}><Text style={[col.seasonText, { color: season(item).text }]}>{season(item).short}</Text></View>}
        <View style={col.nameBadge}><Text style={col.nameText} numberOfLines={1}>{item.name}</Text></View>
      </TouchableOpacity>
    );
    return (
      <View style={col.container}>
        <View style={[col.row, { gap: CARD_GAP, marginBottom: CARD_GAP }]}>
          <Card item={a} width={CARD_WIDTH} height={CARD_HEIGHT} />
          <Card item={b} width={CARD_WIDTH} height={CARD_HEIGHT} />
        </View>
        <View style={col.row}>
          <Card item={c} width={CARD_WIDTH} height={Math.round(CARD_HEIGHT * 0.85)} />
        </View>
      </View>
    );
  }

  // 4 items — 2×2 with overlap and nudge
  const rows = [items.slice(0, 2), items.slice(2, 4)];
  return (
    <View style={col.container}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={[col.row, rowIdx > 0 && { marginTop: -OVERLAP }]}>
          {row.map((item, colIdx) => {
            const nudge      = colIdx === 0 ? -H_NUDGE : H_NUDGE;
            const finalNudge = rowIdx % 2 === 0 ? nudge : -nudge;
            const season     = SEASONS[item.color_season];
            return (
              <TouchableOpacity
                key={item.id}
                style={[col.card, { width: CARD_WIDTH, height: CARD_HEIGHT, marginHorizontal: finalNudge / 2, zIndex: rowIdx * 2 + colIdx }]}
                onPress={() => onItemPress(item)} activeOpacity={0.88}
              >
                {item.image_uri ? <Image source={{ uri: item.image_uri }} style={col.img} resizeMode="cover" /> : <View style={col.placeholder}><Feather name="image" size={28} color={COLORS.ink3} /><Text style={col.placeholderText} numberOfLines={2}>{item.name}</Text></View>}
                {season && <View style={[col.seasonBadge, { backgroundColor: season.bg }]}><Text style={[col.seasonText, { color: season.text }]}>{season.short}</Text></View>}
                <View style={col.nameBadge}><Text style={col.nameText} numberOfLines={1}>{item.name}</Text></View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const col = StyleSheet.create({
  container:       { alignItems: 'center', marginBottom: SPACING.lg },
  row:             { flexDirection: 'row', gap: CARD_GAP, justifyContent: 'center' },
  card:            { borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: '#F0EDE8', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  img:             { width: '100%', height: '100%' },
  placeholder:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  placeholderText: { fontSize: 11, color: COLORS.ink3, textAlign: 'center' },
  seasonBadge:     { position: 'absolute', top: 8, left: 8, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 3 },
  seasonText:      { fontSize: 10, fontWeight: '600' },
  nameBadge:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(28,26,23,0.55)', paddingHorizontal: 8, paddingVertical: 5 },
  nameText:        { fontSize: 11, fontWeight: '500', color: COLORS.cream },
});

// ── ACCESSORY STRIP ───────────────────────────────────────────────────────────
function AccessoryStrip({ accessories, onItemPress, onShuffle }) {
  if (!accessories.length) return null;
  return (
    <View style={acc.container}>
      <View style={acc.header}>
        <Text style={acc.label}>Accessories & shoes</Text>
        <TouchableOpacity onPress={onShuffle} style={acc.shuffleAcc}>
          <Feather name="refresh-cw" size={12} color={COLORS.ink2} />
          <Text style={acc.shuffleAccText}>Shuffle</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {accessories.map(item => {
          const season = SEASONS[item.color_season];
          return (
            <TouchableOpacity key={item.id} style={acc.item} onPress={() => onItemPress(item)} activeOpacity={0.85}>
              <View style={[acc.thumb, { width: ACC_THUMB, height: Math.round(ACC_THUMB * 1.2) }]}>
                {item.image_uri
                  ? <Image source={{ uri: item.image_uri }} style={acc.thumbImg} resizeMode="cover" />
                  : <View style={acc.thumbPlaceholder}><Feather name="image" size={18} color={COLORS.ink3} /></View>}
                {season && <View style={[acc.seasonDot, { backgroundColor: season.bg }]}><Text style={[acc.seasonDotText, { color: season.text }]}>{season.short}</Text></View>}
              </View>
              <Text style={acc.name} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const acc = StyleSheet.create({
  container:      { marginBottom: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, padding: SPACING.md },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  label:          { fontSize: 11, fontWeight: '500', color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  shuffleAcc:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shuffleAccText: { fontSize: 11, fontWeight: '500', color: COLORS.ink2 },
  item:           { alignItems: 'center', marginRight: SPACING.sm, maxWidth: ACC_THUMB },
  thumb:          { borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: '#F0EDE8', position: 'relative' },
  thumbImg:       { width: '100%', height: '100%' },
  thumbPlaceholder:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  seasonDot:      { position: 'absolute', top: 4, left: 4, borderRadius: RADIUS.full, paddingHorizontal: 4, paddingVertical: 2 },
  seasonDotText:  { fontSize: 8, fontWeight: '700' },
  name:           { fontSize: 10, color: COLORS.ink2, marginTop: 4, textAlign: 'center' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function OutfitScreen({ navigate }) {
  const [items, setItems]             = useState([]);
  const [mode, setMode]               = useState('Random');
  const [modeOpen, setModeOpen]       = useState(false);
  const [coreOutfit, setCoreOutfit]   = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [anchorId, setAnchorId]       = useState(null);
  const [warm, setWarm]               = useState(true);  // warm = no outerwear
  const [justWorn, setJustWorn]       = useState(false);
  const [justLiked, setJustLiked]     = useState(false);
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const accSpinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getAllItems().then(data => {
      setItems(data);
      const available = data.filter(i => !i.in_laundry);
      setCoreOutfit(buildCore(available, 'Random', null, false));
      setAccessories(buildAccessories(available));
    });
  }, []);

  const animSpin = (anim) => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };
  const spin    = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const accSpin = accSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const available = items.filter(i => !i.in_laundry);

  const reshuffleCore = () => {
    animSpin(spinAnim);
    setCoreOutfit(buildCore(available, mode, anchorId, !warm));
  };

  const reshuffleAcc = () => {
    animSpin(accSpinAnim);
    setAccessories(buildAccessories(available));
  };

  const handleMode = (m) => {
    setMode(m);
    setModeOpen(false);
    if (m !== 'Start with item') setAnchorId(null);
    setCoreOutfit(buildCore(available, m, null, !warm));
  };

  const handleAnchor = (id) => {
    const next = anchorId === id ? null : id;
    setAnchorId(next);
    setCoreOutfit(buildCore(available, 'Start with item', next, !warm));
  };

  const handleWarmToggle = () => {
    const newWarm = !warm;
    setWarm(newWarm);
    setCoreOutfit(buildCore(available, mode, anchorId, !newWarm));
  };

  const handleWear = async () => {
    const allItems = [...coreOutfit, ...accessories];
    if (!allItems.length) return;
    try {
      const id = await insertOutfit('Quick outfit', allItems.map(i => i.id));
      await logOutfitWear(id);
      setJustWorn(true);
      setTimeout(() => setJustWorn(false), 2000);
    } catch { Alert.alert('Error', 'Could not log outfit.'); }
  };

  const handleLike = async () => {
    const allItems = [...coreOutfit, ...accessories];
    if (!allItems.length) return;
    try {
      await likeOutfit('Favourite outfit', allItems.map(i => i.id));
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 2000);
    } catch { Alert.alert('Error', 'Could not save outfit.'); }
  };

  // Fix 0-piece liked outfits bug: filter liked outfits on load
  // (handled in FavoritesScreen — filter pieces.length === 0)

  const laundryCount = items.filter(i => i.in_laundry).length;
  const allOutfit    = [...coreOutfit, ...accessories];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Outfit builder</Text>
          <Text style={styles.sub}>What are you wearing today?</Text>
        </View>
        {laundryCount > 0 && (
          <View style={styles.laundryNote}>
            <Feather name="wind" size={12} color={COLORS.gold} />
            <Text style={styles.laundryNoteText}>{laundryCount} in laundry</Text>
          </View>
        )}
      </View>

      {/* Controls: mode + warm/cold + shuffle */}
      <View style={styles.controlRow}>
        <View style={styles.modeWrap}>
          <TouchableOpacity style={styles.modeSelector} onPress={() => setModeOpen(v => !v)} activeOpacity={0.7}>
            <Text style={styles.modeSelectorText}>{mode}</Text>
            <Feather name={modeOpen ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.ink2} />
          </TouchableOpacity>
          {modeOpen && (
            <View style={styles.modeDropdown}>
              {MODES.map(m => (
                <TouchableOpacity key={m} style={[styles.modeOption, m === mode && styles.modeOptionActive]} onPress={() => handleMode(m)}>
                  {m === mode && <Feather name="check" size={12} color={COLORS.cream} style={{ marginRight: 6 }} />}
                  <Text style={[styles.modeOptionText, m === mode && styles.modeOptionTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Warm / cold toggle */}
        <TouchableOpacity
          style={[styles.weatherBtn, !warm && styles.weatherBtnCold]}
          onPress={handleWarmToggle}
          activeOpacity={0.8}
        >
          <Feather name={warm ? 'sun' : 'wind'} size={14} color={warm ? COLORS.gold : COLORS.sky ?? COLORS.purple} />
          <Text style={[styles.weatherBtnText, !warm && { color: COLORS.purple }]}>{warm ? 'Warm' : 'Cold'}</Text>
        </TouchableOpacity>

        {/* Core shuffle — hero */}
        <TouchableOpacity style={styles.shuffleBtn} onPress={reshuffleCore} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="refresh-cw" size={18} color={COLORS.cream} />
          </Animated.View>
          <Text style={styles.shuffleBtnText}>Shuffle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Anchor selector */}
        {mode === 'Start with item' && (
          <View style={styles.anchorSection}>
            <Text style={styles.anchorLabel}>Start with</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {available.slice(0, 20).map(item => (
                <TouchableOpacity key={item.id} style={styles.anchorChip} onPress={() => handleAnchor(item.id)} activeOpacity={0.8}>
                  <View style={[styles.anchorImg, anchorId === item.id && styles.anchorImgSelected]}>
                    {item.image_uri
                      ? <Image source={{ uri: item.image_uri }} style={styles.anchorImgFull} resizeMode="cover" />
                      : <Feather name="image" size={16} color={COLORS.ink3} />}
                  </View>
                  <Text style={styles.anchorName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Core collage */}
        {coreOutfit.length === 0 && accessories.length === 0 ? (
          <View style={styles.emptyOutfit}>
            <Feather name="wind" size={40} color={COLORS.ink3} />
            <Text style={styles.emptyTitle}>Add items to your closet first</Text>
            <Text style={styles.emptySub}>Head to the Closet tab and tap +</Text>
          </View>
        ) : (
          <OutfitCollage items={coreOutfit} onItemPress={item => navigate('ItemDetail', { itemId: item.id })} />
        )}

        {/* Accessory strip */}
        <AccessoryStrip
          accessories={accessories}
          onItemPress={item => navigate('ItemDetail', { itemId: item.id })}
          onShuffle={reshuffleAcc}
        />

        {/* Score */}
        {allOutfit.length > 0 && (
          <View style={styles.scoreRow}>
            <Feather name="sun" size={13} color={COLORS.sage} />
            <Text style={styles.scoreText}>{scoreOutfit(coreOutfit, accessories)}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.likeBtn, justLiked && { backgroundColor: COLORS.purpleLt, borderColor: COLORS.purple }]}
            onPress={handleLike}
          >
            <Feather name="heart" size={17} color={justLiked ? COLORS.purple : COLORS.ink2} />
            <Text style={[styles.likeBtnText, justLiked && { color: COLORS.purple }]}>
              {justLiked ? 'Saved!' : 'Save outfit'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.wearBtn, justWorn && { backgroundColor: COLORS.sage }]}
            onPress={handleWear}
          >
            <Feather name={justWorn ? 'check' : 'sun'} size={17} color={COLORS.cream} />
            <Text style={styles.wearBtnText}>{justWorn ? 'Logged!' : 'Wear today'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: COLORS.cream },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title:                { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub:                  { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  laundryNote:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.goldLt, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  laundryNoteText:      { fontSize: 11, fontWeight: '500', color: COLORS.gold },
  controlRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  modeWrap:             { flex: 1, position: 'relative', zIndex: 10 },
  modeSelector:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8 },
  modeSelectorText:     { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.ink },
  modeDropdown:         { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, marginTop: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5, zIndex: 20 },
  modeOption:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  modeOptionActive:     { backgroundColor: COLORS.ink },
  modeOptionText:       { fontSize: 13, fontWeight: '500', color: COLORS.ink },
  modeOptionTextActive: { color: COLORS.cream },
  weatherBtn:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 0.5, borderColor: COLORS.goldLt, backgroundColor: COLORS.goldLt },
  weatherBtnCold:       { borderColor: COLORS.purpleLt, backgroundColor: COLORS.purpleLt },
  weatherBtnText:       { fontSize: 12, fontWeight: '600', color: COLORS.gold },
  shuffleBtn:           { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.ink, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 9 },
  shuffleBtnText:       { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  scroll:               { paddingHorizontal: SPACING.xl, paddingBottom: 48 },
  anchorSection:        { marginBottom: SPACING.lg },
  anchorLabel:          { fontSize: 11, fontWeight: '500', color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  anchorChip:           { alignItems: 'center', gap: 5, marginRight: 12 },
  anchorImg:            { width: 54, height: 54, borderRadius: RADIUS.md, backgroundColor: COLORS.white, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  anchorImgSelected:    { borderColor: COLORS.ink },
  anchorImgFull:        { width: '100%', height: '100%' },
  anchorName:           { fontSize: 10, color: COLORS.ink2, maxWidth: 54, textAlign: 'center' },
  emptyOutfit:          { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:           { fontSize: 18, fontWeight: '600', color: COLORS.ink },
  emptySub:             { fontSize: 13, color: COLORS.ink2 },
  scoreRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.sageLt, borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.md },
  scoreText:            { fontSize: 12, fontWeight: '500', color: COLORS.sageDk, flex: 1 },
  actions:              { flexDirection: 'row', gap: 10 },
  likeBtn:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  likeBtnText:          { fontSize: 14, fontWeight: '500', color: COLORS.ink2 },
  wearBtn:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: RADIUS.lg, backgroundColor: COLORS.ink },
  wearBtnText:          { fontSize: 14, fontWeight: '500', color: COLORS.cream },
});
