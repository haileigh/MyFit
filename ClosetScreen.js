import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAllItems } from './database';
import { COLORS, SPACING, RADIUS, SEASONS, CATEGORIES } from './theme';

const FILTERS = ['All', ...CATEGORIES];

export default function ClosetScreen({ navigate, refreshKey }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => { load(); }, [refreshKey]);
  const load = async () => setItems(await getAllItems());
  const filtered = filter === 'All' ? items : items.filter(i => i.category === filter);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Closet</Text>
          <Text style={styles.sub}>{items.length} items</Text>
        </View>
        <TouchableOpacity onPress={() => navigate('Add')} style={styles.addBtn}>
          <Feather name="plus" size={20} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: SPACING.xl }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="wind" size={36} color={COLORS.ink3} />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySub}>Tap + to add your first item</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={false}
          renderItem={({ item, index }) => {
            const season = SEASONS[item.color_season];
            return (
              <TouchableOpacity
                style={[styles.card, index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 }]}
                onPress={() => navigate('ItemDetail', { itemId: item.id })}
                activeOpacity={0.85}
              >
                <View style={styles.imgContainer}>
                  {item.image_uri ? (
                    <Image source={{ uri: item.image_uri }} style={styles.img} resizeMode="cover" />
                  ) : (
                    <View style={styles.imgPlaceholder}>
                      <Feather name="image" size={28} color={COLORS.ink3} />
                    </View>
                  )}
                  <View style={styles.wornBadge}>
                    <Text style={styles.wornText}>{item.times_worn}×</Text>
                  </View>
                  {season && (
                    <View style={[styles.seasonBadge, { backgroundColor: season.bg }]}>
                      <Text style={[styles.seasonText, { color: season.text }]}>{season.short}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.info}>
                  {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  filterRow: { marginBottom: SPACING.md, flexGrow: 0 },
  chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  chipTextActive: { color: COLORS.cream },
  grid: { paddingHorizontal: SPACING.xl, paddingBottom: 20 },
  card: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, marginBottom: 12, overflow: 'hidden' },
  imgContainer: { width: '100%', aspectRatio: 3/4, backgroundColor: '#F0EDE8', position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wornBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(28,26,23,0.65)', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  wornText: { fontSize: 10, fontWeight: '500', color: COLORS.cream },
  seasonBadge: { position: 'absolute', top: 8, left: 8, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  seasonText: { fontSize: 10, fontWeight: '500' },
  info: { padding: 10 },
  brand: { fontSize: 10, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase' },
  name: { fontSize: 13, fontWeight: '500', color: COLORS.ink, marginTop: 2, lineHeight: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.ink },
  emptySub: { fontSize: 13, color: COLORS.ink2 },
});
