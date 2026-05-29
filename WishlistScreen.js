import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Alert, TextInput, ScrollView, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getWishlist, addWishlistItem, deleteWishlistItem, updateWishlistItem, insertItem, getSettings } from './database';
import { COLORS, SPACING, RADIUS, CATEGORIES } from './theme';

const EMPTY_FORM = { name: '', brand: '', category: '', desired_price: '', url: '', note: '' };

export default function WishlistScreen({ navigate }) {
  const [items, setItems]       = useState([]);
  const [settings, setSettings] = useState(null);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [data, s] = await Promise.all([getWishlist(), getSettings()]);
    setItems(data);
    setSettings(s);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Please enter an item name.'); return; }
    setSaving(true);
    try {
      await addWishlistItem(form);
      setForm(EMPTY_FORM);
      setAdding(false);
      await load();
    } finally { setSaving(false); }
  };

  const handlePurchased = (item) => {
    Alert.alert(
      'Mark as purchased?',
      'This will add "' + item.name + '" to your closet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to closet',
          onPress: async () => {
            await insertItem({
              name: item.name, brand: item.brand || '',
              category: item.category || '', original_price: item.actual_price || item.desired_price || null,
              description: '', color: '', color_season: '', note1: item.note || '',
              note2: '', note3: '', image_uri: null,
            });
            await deleteWishlistItem(item.id);
            await load();
            Alert.alert('Added to closet!', '"' + item.name + '" is now in your closet.');
          },
        },
      ]
    );
  };

  const handleDelete = (item) => {
    Alert.alert('Remove from wishlist', 'Remove "' + item.name + '"?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteWishlistItem(item.id); await load(); } },
    ]);
  };

  const handleLogPrice = (item) => {
    Alert.alert(
      'Log actual price',
      'What did you pay for this?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            // We use a simple prompt-style — price entered in alert
            // In a real implementation you'd use a modal
            await updateWishlistItem(item.id, { actual_price: item.desired_price });
            await load();
          },
        },
      ]
    );
  };

  const currency = settings?.currency || '$';

  if (adding) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { setAdding(false); setForm(EMPTY_FORM); }} style={styles.iconBtn}>
            <Feather name="x" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Add to wishlist</Text>
          <TouchableOpacity onPress={handleAdd} style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.formScroll}>
          <View style={styles.form}>
            <Field label="Item name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Silk slip dress" />
            <Field label="Brand" value={form.brand} onChangeText={v => set('brand', v)} placeholder="e.g. Reformation" />
            <Field label={`Desired price (${currency})`} value={form.desired_price} onChangeText={v => set('desired_price', v)} placeholder="e.g. 200" keyboardType="decimal-pad" />
            <Field label="URL" value={form.url} onChangeText={v => set('url', v)} placeholder="https://..." keyboardType="url" />
            <Field label="Note" value={form.note} onChangeText={v => set('note', v)} placeholder="e.g. Wait for sale" multiline />
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} onPress={() => set('category', c)}
                    style={[styles.catChip, form.category === c && styles.catChipSelected]}>
                    <Text style={[styles.catChipText, form.category === c && styles.catChipTextSelected]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('Stats')} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Wishlist</Text>
          <Text style={styles.sub}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => setAdding(true)} style={styles.addBtn}>
          <Feather name="plus" size={20} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="heart" size={36} color={COLORS.ink3} />
          <Text style={styles.emptyTitle}>Wishlist is empty</Text>
          <Text style={styles.emptySub}>Tap + to add items you want</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const savings = item.desired_price && item.actual_price
              ? item.desired_price - item.actual_price : null;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    {item.brand ? <Text style={styles.brand}>{item.brand.toUpperCase()}</Text> : null}
                    <Text style={styles.name}>{item.name}</Text>
                    {item.category ? (
                      <View style={styles.catPill}>
                        <Text style={styles.catPillText}>{item.category}</Text>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                    <Feather name="x" size={16} color={COLORS.ink3} />
                  </TouchableOpacity>
                </View>

                <View style={styles.priceRow}>
                  {item.desired_price ? (
                    <View style={styles.priceBlock}>
                      <Text style={styles.priceLabel}>Target</Text>
                      <Text style={styles.priceValue}>{currency}{item.desired_price}</Text>
                    </View>
                  ) : null}
                  {item.actual_price ? (
                    <View style={styles.priceBlock}>
                      <Text style={styles.priceLabel}>Paid</Text>
                      <Text style={[styles.priceValue, { color: COLORS.sage }]}>{currency}{item.actual_price}</Text>
                    </View>
                  ) : null}
                  {savings > 0 ? (
                    <View style={styles.priceBlock}>
                      <Text style={styles.priceLabel}>Saved</Text>
                      <Text style={[styles.priceValue, { color: COLORS.sageDk }]}>{currency}{savings.toFixed(2)}</Text>
                    </View>
                  ) : null}
                </View>

                {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}

                <View style={styles.cardActions}>
                  {item.url ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(item.url)}>
                      <Feather name="external-link" size={14} color={COLORS.ink2} />
                      <Text style={styles.actionBtnText}>View item</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleLogPrice(item)}>
                    <Feather name="tag" size={14} color={COLORS.ink2} />
                    <Text style={styles.actionBtnText}>Log price paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.purchasedBtn]} onPress={() => handlePurchased(item)}>
                    <Feather name="check" size={14} color={COLORS.sage} />
                    <Text style={[styles.actionBtnText, { color: COLORS.sage }]}>Purchased</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <View style={styles.fieldBlock}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        style={[styles.input, multiline && { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={COLORS.ink3} multiline={multiline}
        keyboardType={keyboardType || 'default'} returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.cream },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  iconBtn:         { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  topTitle:        { fontSize: 17, fontWeight: '600', color: COLORS.ink },
  title:           { fontSize: 28, fontWeight: '600', color: COLORS.ink, letterSpacing: -0.5 },
  sub:             { fontSize: 12, color: COLORS.ink2, marginTop: 2 },
  addBtn:          { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  saveBtn:         { backgroundColor: COLORS.ink, borderRadius: RADIUS.full, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnText:     { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  list:            { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  card:            { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, padding: SPACING.md, marginBottom: 12 },
  cardTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  brand:           { fontSize: 10, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  name:            { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  catPill:         { marginTop: 5, alignSelf: 'flex-start', backgroundColor: COLORS.purpleLt, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  catPillText:     { fontSize: 11, fontWeight: '500', color: COLORS.purple },
  deleteBtn:       { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  priceRow:        { flexDirection: 'row', gap: 16, marginBottom: SPACING.sm },
  priceBlock:      { alignItems: 'flex-start' },
  priceLabel:      { fontSize: 10, fontWeight: '500', color: COLORS.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue:      { fontSize: 16, fontWeight: '600', color: COLORS.ink },
  noteText:        { fontSize: 12, color: COLORS.ink2, marginBottom: SPACING.sm, fontStyle: 'italic' },
  cardActions:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  actionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: COLORS.cream },
  actionBtnText:   { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  purchasedBtn:    { backgroundColor: COLORS.sageLt },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle:      { fontSize: 20, fontWeight: '600', color: COLORS.ink },
  emptySub:        { fontSize: 13, color: COLORS.ink2 },
  formScroll:      { paddingBottom: 60 },
  form:            { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  fieldBlock:      { marginBottom: 14 },
  fieldLabel:      { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input:           { backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42, fontSize: 14, color: COLORS.ink },
  catGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  catChip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  catChipSelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  catChipText:     { fontWeight: '500', fontSize: 12, color: COLORS.ink2 },
  catChipTextSelected: { color: COLORS.cream },
});
