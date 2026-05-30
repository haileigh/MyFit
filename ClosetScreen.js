import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAllItems, getSettings, updateItem } from './database';
import { COLORS, SPACING, RADIUS, SEASONS, CATEGORIES } from './theme';

const FILTERS = ['All', ...CATEGORIES, 'Laundry'];

export default function ClosetScreen({ navigate, laundryMode = false }) {
  const [items, setItems]       = useState([]);
  const [filter, setFilter]     = useState('All');
  const [settings, setSettings] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [data, s] = await Promise.all([getAllItems(), getSettings()]);
    setItems(data);
    setSettings(s);
  };

  // Laundry mode (dedicated screen via navigate('Laundry')) → only in-laundry items
  // Laundry filter tab → only in-laundry items, tap card to mark clean
  // All filter → everything, including laundry (nothing gets lost)
  // Category filter → that category only, excluding laundry
  const allFiltered = laundryMode
    ? items.filter(i => i.in_laundry)
    : filter === 'Laundry'
      ? items.filter(i => i.in_laundry)
      : filter === 'All'
        ? items
        : items.filter(i => i.category === filter && !i.in_laundry);

  const laundryCount = items.filter(i => i.in_laundry).length;
  const currency     = settings?.currency || '$';
  const cpwGoal      = settings?.cpwGoal || null;

  const handleMarkClean = async (id) => {
    await updateItem(id, { in_laundry: false });
    await load();
  };

  const isLaundryContext = laundryMode || filter === 'Laundry';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{laundryMode ? 'Laundry pile' : 'My Closet'}</Text>
          <Text style={styles.sub}>
            {laundryMode
              ? `${laundryCount} item${laundryCount !== 1 ? 's' : ''} in the wash`
              : `${items.filter(i => !i.in_laundry).length} items${laundryCount > 0 ? ` · ${laundryCount} in laundry` : ''}`}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {laundryMode ? (
            <TouchableOpacity onPress={() => navigate('Closet')} style={styles.addBtn}>
              <Feather name="arrow-left" size={20} color={COLORS.ink} />
            </TouchableOpacity>
          ) : (
            <>
              {laundryCount > 0 && (
                <TouchableOpacity onPress={() => navigate('Laundry')} style={[styles.addBtn, { backgroundColor: COLORS.goldLt }]}>
                  <Feather name="wind" size={18} color={COLORS.gold} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigate('Add')} style={styles.addBtn}>
                <Feather name="plus" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Filter chips — hidden in dedicated laundry mode */}
      {!laundryMode && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: SPACING.xl }}>
          {FILTERS.map(f => {
            const isLaundryChip = f === 'Laundry';
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                  isLaundryChip && !active && laundryCount > 0 && styles.chipLaundry,
                ]}>
                {isLaundryChip && (
                  <Feather
                    name="wind"
                    size={11}
                    color={active ? COLORS.cream : laundryCount > 0 ? COLORS.gold : COLORS.ink3}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                  isLaundryChip && !active && laundryCount > 0 && { color: COLORS.gold },
                ]}>
                  {f}{isLaundryChip && laundryCount > 0 ? ` (${laundryCount})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {allFiltered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="wind" size={36} color={COLORS.ink3} />
          <Text style={styles.emptyTitle}>
            {isLaundryContext ? 'Laundry pile is empty' : 'Nothing here yet'}
          </Text>
          <Text style={styles.emptySub}>
            {isLaundryContext ? 'No items marked as in the wash' : 'Tap + to add your first item'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={allFiltered}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={false}
          renderItem={({ item, index }) => {
            const season   = SEASONS[item.color_season];
            const cpwValue = item.original_price && item.times_worn > 0
              ? item.original_price / item.times_worn : null;
            const cpwOver    = cpwGoal && cpwValue && cpwValue > cpwGoal;
            const inLaundry  = item.in_laundry;

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 },
                  // Subtle visual treatment for laundry items shown in All view
                  inLaundry && !isLaundryContext && styles.cardInLaundry,
                ]}
                onPress={() =>
                  isLaundryContext
                    ? handleMarkClean(item.id)
                    : navigate('ItemDetail', { itemId: item.id })
                }
                activeOpacity={0.85}>
                <View style={styles.imgContainer}>
                  {item.image_uri
                    ? <Image source={{ uri: item.image_uri }} style={styles.imgFull} resizeMode="cover" />
                    : <View style={styles.imgPlaceholder}><Feather name="image" size={28} color={COLORS.ink3} /></View>}

                  {/* "Mark clean" overlay — laundry mode or laundry filter */}
                  {isLaundryContext && (
                    <View style={styles.cleanBadge}>
                      <Feather name="check" size={10} color={COLORS.sage} />
                      <Text style={styles.cleanText}>Mark clean</Text>
                    </View>
                  )}

                  {/* Small laundry badge on cards visible in All / category views */}
                  {inLaundry && !isLaundryContext && (
                    <View style={styles.laundryBadge}>
                      <Feather name="wind" size={9} color={COLORS.gold} />
                      <Text style={styles.laundryBadgeText}>Laundry</Text>
                    </View>
                  )}

                  {/* Wear count — hide in laundry context */}
                  {!isLaundryContext && !inLaundry && (
                    <View style={styles.wornBadge}>
                      <Text style={styles.wornText}>{item.times_worn}×</Text>
                    </View>
                  )}

                  {season && (
                    <View style={[styles.seasonBadge, { backgroundColor: season.bg }]}>
                      <Text style={[styles.seasonText, { color: season.text }]}>{season.short}</Text>
                    </View>
                  )}

                  {cpwOver && !isLaundryContext && (
                    <View style={styles.cpwBadge}>
                      <Feather name="alert-circle" size={10} color={COLORS.terra} />
                    </View>
                  )}
                </View>

                <View style={styles.info}>
                  {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  {cpwValue && !isLaundryContext ? (
                    <Text style={[styles.cpw, cpwOver && { color: COLORS.terra }]}>
                      {currency}{cpwValue.toFixed(2)}/wear
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.cream },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title:            { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub:              { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  headerRight:      { flexDirection: 'row', gap: 8 },
  addBtn:           { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  filterRow:        { marginBottom: SPACING.md, flexGrow: 0 },
  chip:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, marginRight: 8 },
  chipActive:       { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipLaundry:      { borderColor: COLORS.gold, backgroundColor: COLORS.goldLt },
  chipText:         { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  chipTextActive:   { color: COLORS.cream },
  grid:             { paddingHorizontal: SPACING.xl, paddingBottom: 20 },
  card:             { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, marginBottom: 12, overflow: 'hidden' },
  cardInLaundry:    { opacity: 0.72, borderColor: COLORS.gold },
  imgContainer:     { width: '100%', aspectRatio: 3/4, backgroundColor: '#F0EDE8', position: 'relative' },
  imgFull:          { width: '100%', height: '100%' },
  imgPlaceholder:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wornBadge:        { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(28,26,23,0.65)', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  wornText:         { fontSize: 10, fontWeight: '500', color: COLORS.cream },
  cleanBadge:       { position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(122,158,135,0.9)', borderRadius: RADIUS.sm, paddingVertical: 5 },
  cleanText:        { fontSize: 11, fontWeight: '600', color: COLORS.cream },
  laundryBadge:     { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.goldLt, borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 3 },
  laundryBadgeText: { fontSize: 9, fontWeight: '600', color: COLORS.gold },
  seasonBadge:      { position: 'absolute', top: 8, left: 8, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  seasonText:       { fontSize: 10, fontWeight: '500' },
  cpwBadge:         { position: 'absolute', bottom: 8, right: 8, backgroundColor: COLORS.terraLt, borderRadius: RADIUS.full, padding: 4 },
  info:             { padding: 10 },
  brand:            { fontSize: 10, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase' },
  name:             { fontSize: 13, fontWeight: '500', color: COLORS.ink, marginTop: 2, lineHeight: 18 },
  cpw:              { fontSize: 11, color: COLORS.ink3, marginTop: 3 },
  empty:            { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle:       { fontSize: 20, fontWeight: '600', color: COLORS.ink },
  emptySub:         { fontSize: 13, color: COLORS.ink2 },
});
