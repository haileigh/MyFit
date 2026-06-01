import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Image, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getLikedOutfits, deleteLikedOutfit, getAllItems, insertOutfit, logOutfitWear } from './database';
import { COLORS, SPACING, RADIUS, SEASONS } from './theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB        = Math.floor((SCREEN_WIDTH - SPACING.xl * 2 - 8 * 3) / 4);

function OutfitCard({ outfit, allItems, onDelete, onWear }) {
  const itemIds = (() => { try { return JSON.parse(outfit.item_ids); } catch { return []; } })();
  const pieces  = itemIds.map(id => allItems.find(i => i.id === id)).filter(Boolean);
  const missing = itemIds.length - pieces.length;

  return (
    <View style={card.container}>
      <View style={card.thumbRow}>
        {pieces.slice(0, 4).map(item => {
          const season = SEASONS[item.color_season];
          return (
            <View key={item.id} style={[card.thumb, { width: THUMB, height: Math.round(THUMB * 1.35) }]}>
              {item.image_uri
                ? <Image source={{ uri: item.image_uri }} style={card.thumbImg} resizeMode="cover" />
                : <View style={card.thumbPlaceholder}><Feather name="image" size={16} color={COLORS.ink3} /></View>}
              {season && (
                <View style={[card.seasonDot, { backgroundColor: season.bg }]}>
                  <Text style={[card.seasonDotText, { color: season.text }]}>{season.short}</Text>
                </View>
              )}
            </View>
          );
        })}
        {/* Fill empty slots to always show 4 */}
        {Array.from({ length: Math.max(0, 4 - pieces.length) }).map((_, i) => (
          <View key={'e' + i} style={[card.thumb, card.thumbEmpty, { width: THUMB, height: Math.round(THUMB * 1.35) }]} />
        ))}
      </View>

      {/* Missing items warning */}
      {missing > 0 && (
        <View style={card.missingBanner}>
          <Feather name="alert-circle" size={12} color={COLORS.gold} />
          <Text style={card.missingText}>
            {missing} item{missing !== 1 ? 's' : ''} from this outfit {missing !== 1 ? 'have' : 'has'} been removed
          </Text>
        </View>
      )}

      <View style={card.info}>
        <View style={{ flex: 1 }}>
          <Text style={card.piecesText}>{pieces.length} piece{pieces.length !== 1 ? 's' : ''}</Text>
          <Text style={card.dateText}>
            {new Date(outfit.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <View style={card.actions}>
          <TouchableOpacity style={card.actionBtn} onPress={onWear}>
            <Feather name="sun" size={15} color={COLORS.sage} />
          </TouchableOpacity>
          <TouchableOpacity style={card.actionBtn} onPress={onDelete}>
            <Feather name="trash-2" size={15} color={COLORS.terra} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  container:        { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, marginBottom: 14, overflow: 'hidden' },
  thumbRow:         { flexDirection: 'row', gap: 2, padding: 8 },
  thumb:            { borderRadius: RADIUS.sm, overflow: 'hidden', position: 'relative', backgroundColor: '#F0EDE8' },
  thumbImg:         { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbEmpty:       { backgroundColor: COLORS.cream, borderWidth: 0.5, borderColor: COLORS.border },
  seasonDot:        { position: 'absolute', top: 4, left: 4, borderRadius: RADIUS.full, paddingHorizontal: 4, paddingVertical: 2 },
  seasonDotText:    { fontSize: 8, fontWeight: '700' },
  missingBanner:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.goldLt, paddingHorizontal: 12, paddingVertical: 7 },
  missingText:      { fontSize: 11, color: COLORS.gold, fontWeight: '500', flex: 1 },
  info:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  piecesText:       { fontSize: 13, fontWeight: '500', color: COLORS.ink },
  dateText:         { fontSize: 11, color: COLORS.ink3, marginTop: 2 },
  actions:          { flexDirection: 'row', gap: 6 },
  actionBtn:        { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border },
});

export default function FavoritesScreen({ navigate }) {
  const [outfits, setOutfits]   = useState([]);
  const [allItems, setAllItems] = useState([]);

  const load = useCallback(async () => {
    const [liked, items] = await Promise.all([getLikedOutfits(), getAllItems()]);
    setAllItems(items);
    // Filter out outfits where ALL items have been deleted (0 pieces remaining)
    const valid = liked.filter(o => {
      const ids    = (() => { try { return JSON.parse(o.item_ids); } catch { return []; } })();
      const pieces = ids.filter(id => items.find(i => i.id === id));
      return pieces.length > 0;
    });
    setOutfits(valid);
  }, []);

  useEffect(() => { load(); }, []);

  const handleDelete = (outfit) => {
    Alert.alert('Remove outfit', 'Remove this saved outfit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteLikedOutfit(outfit.id); await load(); } },
    ]);
  };

  const handleWear = async (outfit) => {
    try {
      const itemIds = JSON.parse(outfit.item_ids);
      // Only log wear for items that still exist
      const validIds = itemIds.filter(id => allItems.find(i => i.id === id));
      if (!validIds.length) { Alert.alert('No items found', 'All items in this outfit have been removed.'); return; }
      const id = await insertOutfit(outfit.name, validIds);
      await logOutfitWear(id);
      Alert.alert('Logged!', 'Wear count updated for all items in this outfit.');
    } catch { Alert.alert('Error', 'Could not log outfit.'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favourites</Text>
        <Text style={styles.sub}>{outfits.length} saved outfit{outfits.length !== 1 ? 's' : ''}</Text>
      </View>

      {outfits.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="heart" size={40} color={COLORS.ink3} />
          <Text style={styles.emptyTitle}>No saved outfits yet</Text>
          <Text style={styles.emptySub}>Tap ♡ in the Outfit tab to save one</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigate('Outfit')}>
            <Text style={styles.emptyBtnText}>Go to Outfit builder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {outfits.map(outfit => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              allItems={allItems}
              onDelete={() => handleDelete(outfit)}
              onWear={() => handleWear(outfit)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.cream },
  header:       { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title:        { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub:          { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  scroll:       { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle:   { fontSize: 20, fontWeight: '600', color: COLORS.ink },
  emptySub:     { fontSize: 13, color: COLORS.ink2, textAlign: 'center' },
  emptyBtn:     { marginTop: 8, backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.cream },
});
