import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Image, Dimensions, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAllItems, insertOutfit, logOutfitWear, likeOutfit } from './database';
import { COLORS, SPACING, RADIUS, SEASONS } from './theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP     = 10;
const H_PAD        = SPACING.xl;
// Each card is just under half the screen width
const CARD_WIDTH   = Math.floor((SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2);
const CARD_HEIGHT  = Math.round(CARD_WIDTH * 1.35); // portrait ratio
// Overlap: cards in rows after the first overlap by 25% of card height
const OVERLAP      = Math.round(CARD_HEIGHT * 0.25);
// Horizontal nudge: alternate cards shift left/right slightly
const H_NUDGE      = 8;

const MODES = ['Random', 'Coordinated', 'Start with item'];

const STACK_ORDER = [
  'Outerwear', 'Tops', 'Dresses', 'Skirts', 'Bottoms', 'Shorts',
  'Pajamas', 'Robes', 'Shoes', 'Bags', 'Accessories', 'Other',
];

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

function sortByStack(items) {
  return [...items].sort((a, b) => {
    const ia = STACK_ORDER.indexOf(a.category);
    const ib = STACK_ORDER.indexOf(b.category);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

function buildOutfit(items, mode, anchorId) {
  if (!items.length) return [];
  const available = items.filter(i => !i.in_laundry);
  if (!available.length) return [];
  const pool = shuffleArr(available);
  const pick = arr => arr.length ? shuffleArr(arr)[0] : null;
  const cats = {
    top:    pool.filter(i => ['Tops', 'Dresses'].includes(i.category)),
    bottom: pool.filter(i => ['Bottoms', 'Skirts', 'Shorts'].includes(i.category)),
    shoes:  pool.filter(i => i.category === 'Shoes'),
    bag:    pool.filter(i => i.category === 'Bags'),
    outer:  pool.filter(i => ['Outerwear', 'Robes'].includes(i.category)),
    acc:    pool.filter(i => i.category === 'Accessories'),
  };

  if (mode === 'Start with item' && anchorId) {
    const anchor = available.find(i => i.id === anchorId);
    if (!anchor) return buildOutfit(available, 'Random', null);
    const rest = shuffleArr(available.filter(i => i.id !== anchorId)).slice(0, 3);
    return sortByStack([anchor, ...rest].filter(Boolean));
  }

  if (mode === 'Coordinated') {
    const families = pool.map(i => getSeasonFamily(i.color_season)).filter(Boolean);
    const dominant = families.length
      ? families.sort((a, b) => families.filter(f => f === b).length - families.filter(f => f === a).length)[0]
      : null;
    const coordPool = dominant ? shuffleArr(pool.filter(i => getSeasonFamily(i.color_season) === dominant)) : pool;
    const top    = pick(coordPool.filter(i => ['Tops', 'Dresses'].includes(i.category))) || pick(cats.top);
    const bottom = top?.category !== 'Dresses' ? pick(coordPool.filter(i => ['Bottoms', 'Skirts', 'Shorts'].includes(i.category))) || pick(cats.bottom) : null;
    const shoes  = pick(coordPool.filter(i => i.category === 'Shoes')) || pick(cats.shoes);
    const extra  = pick(coordPool.filter(i => i.category === 'Bags' || i.category === 'Accessories')) || null;
    return sortByStack([top, bottom, shoes, extra].filter(Boolean));
  }

  // Random
  if (cats.top.length > 0) {
    const top    = pick(cats.top);
    const bottom = top?.category !== 'Dresses' ? pick(cats.bottom) : null;
    const shoes  = pick(cats.shoes);
    const bonus  = shuffleArr([...cats.bag, ...cats.outer, ...cats.acc])[0] || null;
    const result = [top, bottom, shoes, bonus].filter(Boolean);
    const seen   = new Set();
    return sortByStack(result.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; }));
  }
  return sortByStack(pool.slice(0, 4));
}

function scoreOutfit(outfit) {
  if (!outfit.length) return 'Add items to get started';
  const families = [...new Set(outfit.map(i => getSeasonFamily(i.color_season)).filter(Boolean))];
  if (families.length === 1) return 'Perfectly cohesive — all ' + families[0] + ' tones';
  if (families.length === 2) return 'Harmonious mix — complementary palettes';
  return 'Eclectic and bold — intentional contrast';
}

// 2×2 overlapping collage
function OutfitCollage({ outfit, onItemPress }) {
  if (!outfit.length) return null;

  // Pad to even number for clean 2-col layout
  const items = outfit.slice(0, 4); // max 4
  const rows  = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={col.container}>
      {rows.map((row, rowIdx) => {
        const isSecondRow = rowIdx > 0;
        return (
          <View
            key={rowIdx}
            style={[
              col.row,
              isSecondRow && { marginTop: -OVERLAP },
            ]}
          >
            {row.map((item, colIdx) => {
              // Alternate horizontal nudge
              const nudge = colIdx === 0 ? -H_NUDGE : H_NUDGE;
              const isEvenRow = rowIdx % 2 === 0;
              const finalNudge = isEvenRow ? nudge : -nudge;
              const season = SEASONS[item.color_season];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    col.card,
                    {
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                      marginHorizontal: finalNudge / 2,
                      zIndex: rowIdx * 2 + colIdx,
                    },
                  ]}
                  onPress={() => onItemPress(item)}
                  activeOpacity={0.88}
                >
                  {item.image_uri
                    ? <Image source={{ uri: item.image_uri }} style={col.img} resizeMode="cover" />
                    : (
                      <View style={col.placeholder}>
                        <Feather name="image" size={32} color={COLORS.ink3} />
                        <Text style={col.placeholderText} numberOfLines={2}>{item.name}</Text>
                      </View>
                    )}
                  {season && (
                    <View style={[col.seasonBadge, { backgroundColor: season.bg }]}>
                      <Text style={[col.seasonText, { color: season.text }]}>{season.short}</Text>
                    </View>
                  )}
                  <View style={col.nameBadge}>
                    <Text style={col.nameText} numberOfLines={1}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
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

export default function OutfitScreen({ navigate }) {
  const [items, setItems]         = useState([]);
  const [mode, setMode]           = useState('Random');
  const [modeOpen, setModeOpen]   = useState(false);
  const [outfit, setOutfit]       = useState([]);
  const [anchorId, setAnchorId]   = useState(null);
  const [justWorn, setJustWorn]   = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getAllItems().then(data => {
      setItems(data);
      setOutfit(buildOutfit(data, 'Random', null));
    });
  }, []);

  const animateShuffle = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const reshuffle = () => {
    animateShuffle();
    setOutfit(buildOutfit(items, mode, anchorId));
  };

  const handleMode = (m) => {
    setMode(m);
    setModeOpen(false);
    if (m !== 'Start with item') setAnchorId(null);
    setOutfit(buildOutfit(items, m, null));
  };

  const handleAnchor = (id) => {
    const next = anchorId === id ? null : id;
    setAnchorId(next);
    setOutfit(buildOutfit(items, 'Start with item', next));
  };

  const handleWear = async () => {
    if (!outfit.length) return;
    try {
      const id = await insertOutfit('Quick outfit', outfit.map(i => i.id));
      await logOutfitWear(id);
      setJustWorn(true);
      setTimeout(() => setJustWorn(false), 2000);
    } catch { Alert.alert('Error', 'Could not log outfit.'); }
  };

  const handleLike = async () => {
    if (!outfit.length) return;
    try {
      await likeOutfit('Favourite outfit', outfit.map(i => i.id));
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 2000);
    } catch { Alert.alert('Error', 'Could not save outfit.'); }
  };

  const laundryCount = items.filter(i => i.in_laundry).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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

      {/* Top controls: mode selector + shuffle */}
      <View style={styles.controlRow}>
        {/* Mode compact selector */}
        <View style={styles.modeWrap}>
          <TouchableOpacity
            style={styles.modeSelector}
            onPress={() => setModeOpen(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.modeSelectorText}>{mode}</Text>
            <Feather name={modeOpen ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.ink2} />
          </TouchableOpacity>
          {modeOpen && (
            <View style={styles.modeDropdown}>
              {MODES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeOption, m === mode && styles.modeOptionActive]}
                  onPress={() => handleMode(m)}
                >
                  {m === mode && <Feather name="check" size={12} color={COLORS.cream} style={{ marginRight: 6 }} />}
                  <Text style={[styles.modeOptionText, m === mode && styles.modeOptionTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Shuffle — hero button */}
        <TouchableOpacity style={styles.shuffleBtn} onPress={reshuffle} activeOpacity={0.8}>
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
              {items.filter(i => !i.in_laundry).slice(0, 20).map(item => (
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

        {/* Outfit collage */}
        {outfit.length === 0 ? (
          <View style={styles.emptyOutfit}>
            <Feather name="wind" size={40} color={COLORS.ink3} />
            <Text style={styles.emptyTitle}>Add items to your closet first</Text>
            <Text style={styles.emptySub}>Head to the Closet tab and tap +</Text>
          </View>
        ) : (
          <OutfitCollage outfit={outfit} onItemPress={item => navigate('ItemDetail', { itemId: item.id })} />
        )}

        {/* Score */}
        {outfit.length > 0 && (
          <View style={styles.scoreRow}>
            <Feather name="sun" size={13} color={COLORS.sage} />
            <Text style={styles.scoreText}>{scoreOutfit(outfit)}</Text>
          </View>
        )}

        {/* Action buttons */}
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
  container:         { flex: 1, backgroundColor: COLORS.cream },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title:             { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub:               { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  laundryNote:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.goldLt, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  laundryNoteText:   { fontSize: 11, fontWeight: '500', color: COLORS.gold },
  // Controls row
  controlRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  modeWrap:          { flex: 1, position: 'relative', zIndex: 10 },
  modeSelector:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8 },
  modeSelectorText:  { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.ink },
  modeDropdown:      { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, marginTop: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5, zIndex: 20 },
  modeOption:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  modeOptionActive:  { backgroundColor: COLORS.ink },
  modeOptionText:    { fontSize: 13, fontWeight: '500', color: COLORS.ink },
  modeOptionTextActive: { color: COLORS.cream },
  shuffleBtn:        { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.ink, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 9 },
  shuffleBtnText:    { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  scroll:            { paddingHorizontal: SPACING.xl, paddingBottom: 48 },
  // Anchor
  anchorSection:     { marginBottom: SPACING.lg },
  anchorLabel:       { fontSize: 11, fontWeight: '500', color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  anchorChip:        { alignItems: 'center', gap: 5, marginRight: 12 },
  anchorImg:         { width: 54, height: 54, borderRadius: RADIUS.md, backgroundColor: COLORS.white, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  anchorImgSelected: { borderColor: COLORS.ink },
  anchorImgFull:     { width: '100%', height: '100%' },
  anchorName:        { fontSize: 10, color: COLORS.ink2, maxWidth: 54, textAlign: 'center' },
  // Empty
  emptyOutfit:       { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:        { fontSize: 18, fontWeight: '600', color: COLORS.ink },
  emptySub:          { fontSize: 13, color: COLORS.ink2 },
  // Score
  scoreRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.sageLt, borderRadius: RADIUS.md, padding: 12, marginBottom: SPACING.md },
  scoreText:         { fontSize: 12, fontWeight: '500', color: COLORS.sageDk, flex: 1 },
  // Action buttons
  actions:           { flexDirection: 'row', gap: 10 },
  likeBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  likeBtnText:       { fontSize: 14, fontWeight: '500', color: COLORS.ink2 },
  wearBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: RADIUS.lg, backgroundColor: COLORS.ink },
  wearBtnText:       { fontSize: 14, fontWeight: '500', color: COLORS.cream },
});
