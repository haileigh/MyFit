import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getStats } from './database';
import { COLORS, SPACING, RADIUS, SEASONS } from './theme';

export default function StatsScreen({ navigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    </SafeAreaView>
  );

  const maxSeasonCount = stats.bySeason[0]?.count || 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Wardrobe stats</Text>
          <Text style={styles.sub}>Your closet at a glance</Text>
        </View>

        <View style={styles.grid}>
          <StatCard label="Total items" value={String(stats.total)} icon="grid" color={COLORS.purpleLt} textColor={COLORS.purpleDk} />
          <StatCard label="Times worn" value={String(stats.totalWorn)} icon="repeat" color={COLORS.sageLt} textColor={COLORS.sageDk} />
          <StatCard label="Never worn" value={String(stats.neverWorn)} icon="alert-circle" color={COLORS.terraLt} textColor={COLORS.terra}
            sub={stats.total ? Math.round((stats.neverWorn / stats.total) * 100) + '% of closet' : ''} />
          <StatCard label="Avg per item" value={stats.total ? (stats.totalWorn / stats.total).toFixed(1) : '0'} icon="trending-up" color={COLORS.goldLt} textColor={COLORS.gold} sub="wears" />
        </View>

        {stats.mostWorn && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Most worn item</Text>
            <View style={styles.mostWornCard}>
              <View style={styles.mostWornIcon}>
                <Feather name="star" size={20} color={COLORS.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mostWornName}>{stats.mostWorn.name}</Text>
                {stats.mostWorn.brand ? <Text style={styles.mostWornBrand}>{stats.mostWorn.brand}</Text> : null}
              </View>
              <Text style={styles.mostWornCount}>{stats.mostWorn.times_worn}×</Text>
            </View>
          </View>
        )}

        {stats.byCategory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>By category</Text>
            <View style={styles.card}>
              {stats.byCategory.map((row, i) => (
                <View key={row.category} style={[styles.barRow, i === stats.byCategory.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.barName}>{row.category || 'Other'}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: (row.count / stats.total * 100) + '%', backgroundColor: COLORS.sage }]} />
                  </View>
                  <Text style={styles.barCount}>{row.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {stats.bySeason.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>By color season</Text>
            <View style={styles.card}>
              {stats.bySeason.map((row, i) => {
                const season = SEASONS[row.color_season];
                return (
                  <View key={row.color_season} style={[styles.barRow, i === stats.bySeason.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.barName}>{row.color_season}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: (row.count / maxSeasonCount * 100) + '%', backgroundColor: season?.text || COLORS.sage }]} />
                    </View>
                    <Text style={styles.barCount}>{row.count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {stats.unworn.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Never worn</Text>
            <View style={styles.card}>
              {stats.unworn.map((item, i) => (
                <View key={item.id} style={[styles.unwornRow, i === stats.unworn.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unwornName}>{item.name}</Text>
                    {item.brand ? <Text style={styles.unwornBrand}>{item.brand}</Text> : null}
                  </View>
                  <View style={styles.unwornBadge}>
                    <Text style={styles.unwornBadgeText}>{item.category || 'Item'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color, textColor, sub }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Feather name={icon} size={16} color={textColor} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: textColor, opacity: 0.7 }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: textColor, opacity: 0.55 }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: COLORS.ink2 },
  scroll: { paddingBottom: 60 },
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  statCard: { width: '47%', borderRadius: RADIUS.lg, padding: 14 },
  statValue: { fontSize: 28, fontWeight: '600', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  statSub: { fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, padding: SPACING.md },
  mostWornCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mostWornIcon: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.goldLt, alignItems: 'center', justifyContent: 'center' },
  mostWornName: { fontSize: 14, fontWeight: '500', color: COLORS.ink },
  mostWornBrand: { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  mostWornCount: { fontSize: 22, fontWeight: '600', color: COLORS.gold },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  barName: { fontSize: 12, color: COLORS.ink2, width: 90 },
  barTrack: { flex: 1, height: 5, backgroundColor: COLORS.cream, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barCount: { fontSize: 12, fontWeight: '500', color: COLORS.ink, width: 20, textAlign: 'right' },
  unwornRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, gap: 10 },
  unwornName: { fontSize: 13, fontWeight: '500', color: COLORS.ink },
  unwornBrand: { fontSize: 11, color: COLORS.ink3, marginTop: 2 },
  unwornBadge: { backgroundColor: COLORS.terraLt, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  unwornBadgeText: { fontSize: 11, fontWeight: '500', color: COLORS.terra },
});
