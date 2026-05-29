import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAllItems, insertOutfit, logOutfitWear } from './database';
import { COLORS, SPACING, RADIUS, SEASONS } from './theme';

const MODES = [
  { key: 'random',  label: 'Random' },
  { key: 'color',   label: 'Coordinated' },
  { key: 'anchor',  label: 'Start with item' },
];

const SEASON_FAMILIES = {
  winter: ['Deep Winter','True Winter','Bright Winter'],
  summer: ['Soft Summer','True Summer','Light Summer'],
  autumn: ['Deep Autumn','True Autumn','Soft Autumn'],
  spring: ['Light Spring','True Spring','Bright Spring'],
};

function getSeasonFamily(season) {
  for (const [family, seasons] of Object.entries(SEASON_FAMILIES)) {
    if (seasons.includes(season)) return family;
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

function buildOutfit(items, mode, anchorId) {
  if (!items.length) return [];
  // exclude items in laundry
  const available = items.filter(i => !i.in_laundry);
  if (!available.length) return [];

  const pool = shuffleArr(available);
  const pick = arr => arr.length ? shuffleArr(arr)[0] : null;

  const cats = {
    top:   pool.filter(i => ['Tops','Dresses'].includes(i.category)),
    bottom:pool.filter(i => i.category === 'Bottoms'),
    shoes: pool.filter(i => i.category === 'Shoes'),
    bag:   pool.filter(i => i.category === 'Bags'),
    outer: pool.filter(i => i.category === 'Outerwear'),
    acc:   pool.filter(i => i.category === 'Accessories'),
  };

  if (mode === 'anchor' && anchorId) {
    const anchor = available.find(i => i.id === anchorId);
    if (!anchor) return buildOutfit(available, 'random', null);
    const rest = shuffleArr(available.filter(i => i.id !== anchorId)).slice(0, 2);
    return [anchor, ...rest].filter(Boolean);
  }

  if (mode === 'color') {
    const families = pool.map(i => getSeasonFamily(i.color_season)).filter(Boolean);
    const dominant = families.length
      ? families.sort((a, b) =>
          families.filter(f => f === b).length - families.filter(f => f === a).length)[0]
      : null;
    const coordPool = dominant
      ? shuffleArr(pool.filter(i => getSeasonFamily(i.color_season) === dominant))
      : pool;
    const top    = pick(coordPool.filter(i => ['Tops','Dresses'].includes(i.category))) || pick(cats.top);
    const bottom = top?.category !== 'Dresses' ? pick(coordPool.filter(i => i.category === 'Bottoms')) || pick(cats.bottom) : null;
    const shoes  = pick(coordPool.filter(i => i.category === 'Shoes')) || pick(cats.shoes);
    return [top, bottom, shoes].filter(Boolean);
  }

  // Random — slot by category with full shuffle
  const hasCategoryVariety = cats.top.length > 0;
  if (hasCategoryVariety) {
    const top    = pick(cats.top);
    const bottom = top?.category !== 'Dresses' ? pick(cats.bottom) : null;
    const shoes  = pick(cats.shoes);
    const extras = shuffleArr([...cats.bag, ...cats.outer, ...cats.acc]);
    const bonus  = extras[0] || null;
    const result = [top, bottom, shoes, bonus].filter(Boolean);
    const seen = new Set();
    return result.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });
  }
  return pool.slice(0, 3);
}

function scoreOutfit(outfit) {
  if (!outfit.length) return 'Add items to get started';
  const families = [...new Set(outfit.map(i => getSeasonFamily(i.color_season)).filter(Boolean))];
  if (families.length === 1) return 'Perfectly cohesive — all ' + families[0] + ' tones';
  if (families.length === 2) return 'Harmonious mix — complementary palettes';
  return 'Eclectic and bold — intentional contrast';
}

function ItemTile({ item, size = 72, height = 88, selected = false, onPress }) {
  return (
    <TouchableOpacity style={[styles.piece, { width: size }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.pieceImg, { width: size, height }, selected && styles.pieceImgSelected]}>
        {item.image_uri
          ? <Image source={{ uri: item.image_uri }} style={styles.pieceImgFull} resizeMode="cover" />
          : <View style={styles.pieceImgPlaceholder}><Feather name="image" size={size * 0.3} color={COLORS.ink3} /></View>}
      </View>
      <Text style={styles.pieceName} numberOfLines={2}>{item.name}</Text>
      {item.brand ? <Text style={styles.pieceBrand} numberOfLines={1}>{item.brand}</Text> : null}
    </TouchableOpacity>
  );
}

export default function OutfitScreen({ navigate }) {
  const [items, setItems]       = useState([]);
  const [mode, setMode]         = useState('random');
  const [outfit, setOutfit]     = useState([]);
  const [anchorId, setAnchorId] = useState(null);
  const [justWorn, setJustWorn] = useState(false);

  useEffect(() => {
    getAllItems().then(data => {
      setItems(data);
      setOutfit(buildOutfit(data, 'random', null));
    });
  }, []);

  const shuffle_outfit = () => setOutfit(buildOutfit(items, mode, anchorId));

  const handleMode = m => {
    setMode(m);
    if (m !== 'anchor') setAnchorId(null);
    setOutfit(buildOutfit(items, m, null));
  };

  const handleAnchor = id => {
    const newAnchor = anchorId === id ? null : id;
    setAnchorId(newAnchor);
    setOutfit(buildOutfit(items, 'anchor', newAnchor));
  };

  const handleWear = async () => {
    if (!outfit.length) return;
    try {
      const id = await insertOutfit('Quick outfit', outfit.map(i => i.id));
      await logOutfitWear(id);
      setJustWorn(true);
      setTimeout(() => setJustWorn(false), 2000);
    } catch (e) { Alert.alert('Error', 'Could not log outfit.'); }
  };

  const laundryCount = items.filter(i => i.in_laundry).length;

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

      <View style={styles.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity key={m.key}
            style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
            onPress={() => handleMode(m.key)}>
            <Text style={[styles.modeBtnText, mode === m.key && styles.modeBtnTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {mode === 'anchor' && (
          <View style={styles.anchorSection}>
            <Text style={styles.anchorLabel}>Start with</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {items.filter(i => !i.in_laundry).slice(0, 16).map(item => (
                <TouchableOpacity key={item.id} style={styles.anchorChip} onPress={() => handleAnchor(item.id)} activeOpacity={0.8}>
                  <View style={[styles.anchorImg, anchorId === item.id && styles.anchorImgSelected]}>
                    {item.image_uri
                      ? <Image source={{ uri: item.image_uri }} style={styles.anchorImgFull} resizeMode="cover" />
                      : <Feather name="image" size={18} color={COLORS.ink3} />}
                  </View>
                  <Text style={styles.anchorName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.outfitCard}>
          {outfit.length === 0 ? (
            <View style={styles.emptyOutfit}>
              <Feather name="wind" size={32} color={COLORS.ink3} />
              <Text style={styles.emptyText}>Add items to your closet first</Text>
            </View>
          ) : (
            <View style={styles.outfitPieces}>
              {outfit.map((item, idx) => (
                <ItemTile
                  key={String(item.id) + idx}
                  item={item}
                  onPress={() => navigate('ItemDetail', { itemId: item.id })}
                />
              ))}
            </View>
          )}
          <View style={styles.scoreRow}>
            <Feather name="sun" size={13} color={COLORS.sage} />
            <Text style={styles.scoreText}>{scoreOutfit(outfit)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shuffleBtn} onPress={shuffle_outfit}>
          <Feather name="refresh-cw" size={16} color={COLORS.ink} />
          <Text style={styles.shuffleBtnText}>Shuffle outfit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.wearBtn, justWorn && { backgroundColor: COLORS.sage }]}
          onPress={handleWear}>
          <Feather name={justWorn ? 'check' : 'sun'} size={18} color={COLORS.cream} />
          <Text style={styles.wearBtnText}>{justWorn ? 'Outfit logged!' : 'Wear this today'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.cream },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title:              { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub:                { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  laundryNote:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.goldLt, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  laundryNoteText:    { fontSize: 11, fontWeight: '500', color: COLORS.gold },
  modeRow:            { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
  modeBtn:            { flex: 1, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 0.5, borderColor: COLORS.borderMed, alignItems: 'center' },
  modeBtnActive:      { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  modeBtnText:        { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  modeBtnTextActive:  { color: COLORS.cream },
  scroll:             { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  anchorSection:      { marginBottom: SPACING.md },
  anchorLabel:        { fontSize: 11, fontWeight: '500', color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  anchorChip:         { alignItems: 'center', gap: 4, marginRight: 12 },
  anchorImg:          { width: 58, height: 58, borderRadius: RADIUS.md, backgroundColor: COLORS.white, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  anchorImgSelected:  { borderColor: COLORS.ink },
  anchorImgFull:      { width: '100%', height: '100%' },
  anchorName:         { fontSize: 10, color: COLORS.ink2, maxWidth: 58 },
  outfitCard:         { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, borderWidth: 0.5, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  outfitPieces:       { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md },
  emptyOutfit:        { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText:          { fontSize: 13, color: COLORS.ink2 },
  scoreRow:           { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.sageLt, borderRadius: RADIUS.sm, padding: 10 },
  scoreText:          { fontSize: 12, fontWeight: '500', color: COLORS.sageDk, flex: 1 },
  piece:              { alignItems: 'center', gap: 5 },
  pieceImg:           { borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 0.5, borderColor: COLORS.border },
  pieceImgSelected:   { borderWidth: 2, borderColor: COLORS.ink },
  pieceImgFull:       { width: '100%', height: '100%' },
  pieceImgPlaceholder:{ flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EDE8' },
  pieceName:          { fontSize: 10, fontWeight: '500', color: COLORS.ink, textAlign: 'center', lineHeight: 13 },
  pieceBrand:         { fontSize: 10, color: COLORS.ink3, textAlign: 'center' },
  shuffleBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderMed, marginBottom: 10 },
  shuffleBtnText:     { fontSize: 14, fontWeight: '500', color: COLORS.ink },
  wearBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: COLORS.ink },
  wearBtnText:        { fontSize: 15, fontWeight: '500', color: COLORS.cream },
});
