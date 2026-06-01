import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Image, FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, CATEGORIES, SEASONS, FIT_OPTIONS } from './theme';
import { insertItem, getSettings, getAllItems } from './database';
import { analyzeWithClaude, getApiKey } from './api';
import {
  ColorPicker, OccasionPicker, FabricPicker, PatternPicker,
  SeasonPicker, FitPicker, CategoryPicker, Field,
} from './components';

// Generate default name: "Top #4", "Jacket #1", etc.
async function makeDefaultName(category) {
  try {
    const all = await getAllItems();
    const n   = all.filter(i => i.category === category).length + 1;
    const label = category && category !== 'Other' ? category.replace(/s$/, '') : 'Item';
    return `${label} #${n}`;
  } catch { return 'Item #1'; }
}

const EMPTY_FORM = {
  category: 'Tops',
  name: '', brand: '', description: '',
  colors: [], color_season: '',
  size: '', fit: '', fabric: [], pattern: '',
  occasions: [],
  original_price: '',
  note1: '', note2: '', note3: '',
};

export default function AddItemScreen({ navigate }) {
  const [step, setStep]                 = useState('photo'); // photo | form | bulk
  const [imageUri, setImageUri]         = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [bulkSaving, setBulkSaving]     = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [settings, setSettings]         = useState(null);
  const [hasApiKey, setHasApiKey]       = useState(false);
  const [nameIsDefault, setNameIsDefault] = useState(true);
  // Bulk upload state
  const [bulkAssets, setBulkAssets]     = useState([]); // array of { uri, name, done }

  useEffect(() => {
    getSettings().then(setSettings);
    getApiKey().then(k => setHasApiKey(!!k));
  }, []);

  // Auto-generate name when category changes (only if user hasn't typed one)
  useEffect(() => {
    if (!nameIsDefault) return;
    makeDefaultName(form.category).then(n => set('name', n));
  }, [form.category]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── SINGLE PHOTO ────────────────────────────────────────────────────────────
  const handlePickImage = async (useCamera) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
        // Keep crop for single photo — good UX for framing the item
        result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
        // Single photo from library — with crop
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
      }
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setAnalyzeError(null);
        if (hasApiKey) {
          setAnalyzing(true);
          const response = await analyzeWithClaude(uri);
          if (response.success) {
            const r   = response.data;
            const cat = r.category || form.category;
            const defaultName = await makeDefaultName(cat);
            setForm(prev => ({
              ...prev,
              category:       cat,
              name:           r.name || defaultName,
              brand:          r.brand || '',
              description:    r.description || '',
              colors:         Array.isArray(r.colors) ? r.colors : [],
              color_season:   r.color_season || '',
              occasions:      Array.isArray(r.occasions) ? r.occasions : [],
              size:           r.size || '',
              fit:            r.fit || '',
              fabric:         r.fabric ? [r.fabric] : [],
              pattern:        r.pattern || '',
              original_price: r.original_price ? String(r.original_price) : '',
            }));
            setNameIsDefault(false);
          } else {
            setAnalyzeError(response.error);
          }
          setAnalyzing(false);
          setStep('form');
        } else {
          setStep('form');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not access camera or photos.');
      setAnalyzing(false);
    }
  };

  // ── BULK PHOTO UPLOAD ───────────────────────────────────────────────────────
  const handleBulkPick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
      // Multi-select, no crop for bulk
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        allowsMultipleSelection: true,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const assets = result.assets.map((a, i) => ({
          uri:  a.uri,
          name: `Item #${i + 1}`,
          done: false,
        }));
        setBulkAssets(assets);
        setStep('bulk');
      }
    } catch { Alert.alert('Error', 'Could not access photo library.'); }
  };

  const handleBulkSave = async () => {
    if (!bulkAssets.length) return;
    setBulkSaving(true);
    let saved = 0;
    for (let i = 0; i < bulkAssets.length; i++) {
      const asset = bulkAssets[i];
      try {
        const all = await getAllItems();
        const n   = all.length + 1;
        await insertItem({
          category:  'Tops',
          name:      `Item #${n}`,
          image_uri: asset.uri,
          colors: '[]', occasions: '[]', fabric: '[]',
          brand: '', description: '', color_season: '',
          size: '', fit: '', pattern: '',
          original_price: null,
          note1: '', note2: '', note3: '',
        });
        saved++;
        // Mark as done in list
        setBulkAssets(prev => prev.map((a, idx) => idx === i ? { ...a, done: true } : a));
      } catch { /* skip failed items, continue */ }
    }
    setBulkSaving(false);
    Alert.alert('Done!', `${saved} item${saved !== 1 ? 's' : ''} added to your closet. Edit each one to fill in the details.`, [
      { text: 'Go to Closet', onPress: () => navigate('Closet') },
    ]);
  };

  // ── SINGLE ITEM SAVE ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Please enter a name for this item.'); return; }
    setSaving(true);
    try {
      const customVals = {};
      if (settings) (settings.customFields || []).forEach(f => { customVals[f.key] = form[f.key] || ''; });
      await insertItem({
        ...form,
        ...customVals,
        colors:         JSON.stringify(form.colors),
        occasions:      JSON.stringify(form.occasions),
        fabric:         JSON.stringify(form.fabric),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        image_uri:      imageUri,
      });
      navigate('Closet');
    } catch { Alert.alert('Error', 'Could not save item.'); }
    finally { setSaving(false); }
  };

  const currency       = settings?.currency || '$';
  const hiddenSeasons  = settings?.hiddenSeasons || [];
  const visibleSeasons = Object.keys(SEASONS).filter(s => !hiddenSeasons.includes(s));
  const customFields   = (settings?.customFields || []).filter(f => f.label);

  // ── BULK STEP ───────────────────────────────────────────────────────────────
  if (step === 'bulk') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { setBulkAssets([]); setStep('photo'); }} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{bulkAssets.length} photos selected</Text>
          <TouchableOpacity
            onPress={handleBulkSave}
            style={[styles.saveTopBtn, bulkSaving && { opacity: 0.6 }]}
            disabled={bulkSaving}
          >
            {bulkSaving
              ? <ActivityIndicator size="small" color={COLORS.cream} />
              : <Text style={styles.saveTopBtnText}>Add all</Text>}
          </TouchableOpacity>
        </View>
        <Text style={styles.bulkHint}>
          All photos will be added as draft items. Edit each one to fill in the details.
        </Text>
        <FlatList
          data={bulkAssets}
          keyExtractor={(_, i) => String(i)}
          numColumns={3}
          contentContainerStyle={styles.bulkGrid}
          renderItem={({ item }) => (
            <View style={styles.bulkThumb}>
              <Image source={{ uri: item.uri }} style={styles.bulkThumbImg} resizeMode="cover" />
              {item.done && (
                <View style={styles.bulkDoneBadge}>
                  <Feather name="check" size={14} color={COLORS.cream} />
                </View>
              )}
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  // ── PHOTO STEP ───────────────────────────────────────────────────────────────
  if (step === 'photo') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigate('Closet')} style={styles.iconBtn}>
            <Feather name="x" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Add item</Text>
          <View style={{ width: 38 }} />
        </View>
        {analyzing ? (
          <View style={styles.analyzing}>
            <ActivityIndicator size="large" color={COLORS.sage} />
            <Text style={styles.analyzingTitle}>Analyzing your item...</Text>
            <Text style={styles.analyzingSub}>Claude is identifying brand, color, and season</Text>
          </View>
        ) : (
          <View style={styles.photoStep}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />
              : (
                <View style={styles.photoPlaceholder}>
                  <Feather name="camera" size={48} color={COLORS.ink3} />
                  <Text style={styles.photoPlaceholderText}>Take or choose a photo</Text>
                  {!hasApiKey && (
                    <Text style={styles.noKeyNote}>Add an Anthropic key in Settings to enable auto-fill</Text>
                  )}
                </View>
              )}
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={() => handlePickImage(true)}>
                <Feather name="camera" size={20} color={COLORS.ink} />
                <Text style={styles.photoBtnText}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={() => handlePickImage(false)}>
                <Feather name="image" size={20} color={COLORS.ink} />
                <Text style={styles.photoBtnText}>Choose photo</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkPick}>
              <Feather name="layers" size={16} color={COLORS.ink2} />
              <Text style={styles.bulkBtnText}>Bulk add multiple photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep('form')}>
              <Text style={styles.skipBtnText}>Skip photo, fill manually →</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── FORM STEP ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { setStep('photo'); setAnalyzeError(null); }} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Item details</Text>
        <TouchableOpacity onPress={handleSave} style={[styles.saveTopBtn, saving && { opacity: 0.6 }]} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={COLORS.cream} />
            : <Text style={styles.saveTopBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        {imageUri && (
          <View style={styles.formImgContainer}>
            <Image source={{ uri: imageUri }} style={styles.formImg} resizeMode="cover" />
          </View>
        )}

        {/* Inline analysis error if Claude failed */}
        {analyzeError && (
          <View style={styles.analyzeErrorBanner}>
            <Feather name="alert-circle" size={14} color={COLORS.terra} />
            <Text style={styles.analyzeErrorText}>{analyzeError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <CategoryPicker value={form.category} onChange={v => set('category', v)} categories={CATEGORIES} />
          <Field label="Item name *" value={form.name} onChangeText={v => { set('name', v); setNameIsDefault(false); }} placeholder="e.g. Merino ribbed turtleneck" />
          <Field label="Brand" value={form.brand} onChangeText={v => set('brand', v)} placeholder="e.g. Arket" />
          <Field label="Description" value={form.description} onChangeText={v => set('description', v)} placeholder="Brief description" multiline />
          <ColorPicker value={form.colors} onChange={v => set('colors', v)} />
          <PatternPicker value={form.pattern} onChange={v => set('pattern', v)} />
          <SeasonPicker value={form.color_season} onChange={v => set('color_season', v)} seasons={SEASONS} visibleSeasons={visibleSeasons} />
          <Field label="Size" value={form.size} onChangeText={v => set('size', v)} placeholder="e.g. S, M, 32, 10" />
          <FitPicker value={form.fit} onChange={v => set('fit', v)} fitOptions={FIT_OPTIONS} />
          <FabricPicker value={form.fabric} onChange={v => set('fabric', v)} />
          <OccasionPicker value={form.occasions} onChange={v => set('occasions', v)} />
          <Field label={`Price (${currency})`} value={form.original_price} onChangeText={v => set('original_price', v)} placeholder="e.g. 129" keyboardType="decimal-pad" />
          <Text style={styles.sectionDivider}>Notes</Text>
          <Field value={form.note1} onChangeText={v => set('note1', v)} placeholder="Note 1" />
          <Field value={form.note2} onChangeText={v => set('note2', v)} placeholder="Note 2" />
          <Field value={form.note3} onChangeText={v => set('note3', v)} placeholder="Note 3" />
          {customFields.length > 0 && (
            <>
              <Text style={styles.sectionDivider}>Custom fields</Text>
              {customFields.map(f => (
                <Field key={f.key} label={f.label} value={form[f.key] || ''} onChangeText={v => set(f.key, v)} placeholder={f.label} />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const THUMB_SIZE = 110;

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: COLORS.cream },
  topBar:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  iconBtn:              { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  topTitle:             { fontSize: 17, fontWeight: '600', color: COLORS.ink },
  saveTopBtn:           { backgroundColor: COLORS.ink, borderRadius: RADIUS.full, paddingHorizontal: 18, paddingVertical: 8 },
  saveTopBtnText:       { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  analyzing:            { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  analyzingTitle:       { fontSize: 18, fontWeight: '600', color: COLORS.ink },
  analyzingSub:         { fontSize: 13, color: COLORS.ink2, textAlign: 'center' },
  photoStep:            { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  photoPlaceholder:     { width: '100%', aspectRatio: 3/4, borderRadius: RADIUS.xl, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', gap: 12 },
  photoPlaceholderText: { fontSize: 14, color: COLORS.ink3 },
  noKeyNote:            { fontSize: 12, color: COLORS.ink3, textAlign: 'center', paddingHorizontal: 24 },
  previewImg:           { width: '100%', aspectRatio: 3/4, borderRadius: RADIUS.xl },
  photoActions:         { flexDirection: 'row', gap: 12, marginTop: SPACING.lg, width: '100%' },
  photoBtn:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.borderMed, paddingVertical: 13 },
  photoBtnText:         { fontSize: 14, fontWeight: '500', color: COLORS.ink },
  bulkBtn:              { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.md, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  bulkBtnText:          { fontSize: 13, fontWeight: '500', color: COLORS.ink2 },
  skipBtn:              { marginTop: SPACING.md },
  skipBtnText:          { fontSize: 13, color: COLORS.ink3 },
  // Bulk step
  bulkHint:             { fontSize: 12, color: COLORS.ink3, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, textAlign: 'center' },
  bulkGrid:             { paddingHorizontal: SPACING.xl, gap: 4 },
  bulkThumb:            { width: THUMB_SIZE, height: THUMB_SIZE, margin: 2, borderRadius: RADIUS.sm, overflow: 'hidden', position: 'relative', backgroundColor: '#F0EDE8' },
  bulkThumbImg:         { width: '100%', height: '100%' },
  bulkDoneBadge:        { position: 'absolute', top: 6, right: 6, backgroundColor: COLORS.sage, borderRadius: RADIUS.full, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  // Form step
  formScroll:           { paddingBottom: 60 },
  formImgContainer:     { marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', aspectRatio: 3/4, marginBottom: SPACING.lg },
  formImg:              { width: '100%', height: '100%' },
  analyzeErrorBanner:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: SPACING.xl, marginBottom: SPACING.md, backgroundColor: COLORS.terraLt, borderRadius: RADIUS.md, padding: 12 },
  analyzeErrorText:     { flex: 1, fontSize: 12, color: COLORS.terra, fontWeight: '500' },
  form:                 { paddingHorizontal: SPACING.xl },
  sectionDivider:       { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 8, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: COLORS.border },
});
