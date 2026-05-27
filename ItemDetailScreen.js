import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getItemById, logWear, deleteItem } from './database';
import { COLORS, SPACING, RADIUS, SEASONS } from './theme';

export default function ItemDetailScreen({ itemId, navigate }) {
  const [item, setItem] = useState(null);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => { load(); }, [itemId]);
  const load = async () => setItem(await getItemById(itemId));

  if (!item) return <View style={styles.container} />;

  const season = SEASONS[item.color_season];
  const costPerWear = item.original_price && item.times_worn > 0
    ? '$' + (item.original_price / item.times_worn).toFixed(2)
    : '—';

  const handleWear = async () => {
    await logWear(item.id);
    setJustLogged(true);
    await load();
    setTimeout(() => setJustLogged(false), 2000);
  };

  const handleDelete = () => {
    Alert.alert('Remove item', 'Remove "' + item.name + '" from your closet?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await deleteItem(item.id);
        navigate('Closet');
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('Closet')} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Feather name="trash-2" size={18} color={COLORS.terra} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.imgContainer}>
          {item.image_uri ? (
            <Image source={{ uri: item.image_uri }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Feather name="image" size={48} color={COLORS.ink3} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          {item.brand ? <Text style={styles.brand}>{item.brand.toUpperCase()}</Text> : null}
          <Text style={styles.name}>{item.name}</Text>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          <View style={styles.pills}>
            {season && <View style={[styles.pill, { backgroundColor: season.bg }]}><Text style={[styles.pillText, { color: season.text }]}>{item.color_season}</Text></View>}
            {item.color ? <View style={[styles.pill, { backgroundColor: COLORS.sageLt }]}><Text style={[styles.pillText, { color: COLORS.sageDk }]}>{item.color}</Text></View> : null}
            <View style={[styles.pill, { backgroundColor: COLORS.goldLt }]}><Text style={[styles.pillText, { color: '#7A6030' }]}>Worn {item.times_worn}×</Text></View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            {item.category ? <AttrRow label="Category" value={item.category} /> : null}
            {item.color ? <AttrRow label="Color" value={item.color} /> : null}
            {item.original_price ? <AttrRow label="Original price" value={'$' + item.original_price} /> : null}
            <AttrRow label="Cost per wear" value={costPerWear} highlight />
          </View>
          {(item.note1 || item.note2 || item.note3) ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              {item.note1 ? <Text style={styles.noteText}>{item.note1}</Text> : null}
              {item.note2 ? <Text style={styles.noteText}>{item.note2}</Text> : null}
              {item.note3 ? <Text style={styles.noteText}>{item.note3}</Text> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.wearBtn, justLogged && { backgroundColor: COLORS.sage }]}
          onPress={handleWear}>
          <Feather name={justLogged ? 'check' : 'sun'} size={18} color={COLORS.cream} />
          <Text style={styles.wearBtnText}>{justLogged ? 'Logged!' : 'Log wear today'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function AttrRow({ label, value, highlight }) {
  if (!value) return null;
  return (
    <View style={styles.attrRow}>
      <Text style={styles.attrLabel}>{label}</Text>
      <Text style={[styles.attrValue, highlight && { color: COLORS.sage, fontWeight: '500' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  iconBtn: { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 120 },
  imgContainer: { marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.white, aspectRatio: 1, borderWidth: 0.5, borderColor: COLORS.border },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EDE8' },
  body: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  brand: { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 1.5, marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '600', color: COLORS.ink, lineHeight: 30 },
  description: { fontSize: 14, color: COLORS.ink2, marginTop: 6, lineHeight: 20 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  pillText: { fontSize: 12, fontWeight: '500' },
  section: { marginTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  attrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  attrLabel: { fontSize: 13, color: COLORS.ink2 },
  attrValue: { fontSize: 13, color: COLORS.ink },
  noteText: { fontSize: 13, color: COLORS.ink2, lineHeight: 20, marginBottom: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.xl, paddingBottom: 32, backgroundColor: COLORS.cream, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  wearBtn: { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wearBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.cream },
});
