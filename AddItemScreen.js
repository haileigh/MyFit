import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, CATEGORIES, SEASONS } from './theme';
import { insertItem, getSettings } from './database';

// ── API KEYS ────────────────────────────────────────────────
const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY';
const REMOVEBG_API_KEY  = 'YOUR_REMOVEBG_API_KEY';
// ────────────────────────────────────────────────────────────

async function removeBackground(imageUri) {
  // Stub — return original image until Remove.bg key is added
  return imageUri;
}

async function analyzeWithClaude(imageUri) {
  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY') return null;
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `Analyze this clothing item. Return ONLY a JSON object, no extra text:
{
  "brand": "brand name if visible, else empty string",
  "name": "item name e.g. Merino ribbed turtleneck",
  "description": "one sentence style and fabric description",
  "color": "primary color name",
  "color_season": "one of: Deep Winter, True Winter, Bright Winter, Soft Summer, True Summer, Light Summer, Deep Autumn, True Autumn, Soft Autumn, Light Spring, True Spring, Bright Spring",
  "category": "one of: Tops, Bottoms, Outerwear, Shoes, Dresses, Accessories, Bags, Other",
  "original_price": 0
}` },
          ],
        }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('Claude analysis failed:', e);
    return null;
  }
}

const EMPTY_FORM = {
  brand: '', name: '', description: '', color: '',
  color_season: '', category: 'Other', original_price: '',
  note1: '', note2: '', note3: '',
};

// Clothing-relevant color palette with names
const COLOR_PALETTE = [
  { name: 'White',       hex: '#FFFFFF' },
  { name: 'Ivory',       hex: '#FFFFF0' },
  { name: 'Cream',       hex: '#FFFDD0' },
  { name: 'Beige',       hex: '#F5F0E8' },
  { name: 'Oatmeal',     hex: '#E8E0D0' },
  { name: 'Taupe',       hex: '#C4B9A8' },
  { name: 'Camel',       hex: '#C19A6B' },
  { name: 'Tan',         hex: '#D2B48C' },
  { name: 'Sand',        hex: '#C2B280' },
  { name: 'Khaki',       hex: '#BDB76B' },
  { name: 'Olive',       hex: '#808000' },
  { name: 'Sage',        hex: '#8FAE88' },
  { name: 'Mint',        hex: '#98D4C4' },
  { name: 'Teal',        hex: '#008080' },
  { name: 'Forest',      hex: '#228B22' },
  { name: 'Emerald',     hex: '#50C878' },
  { name: 'Lime',        hex: '#32CD32' },
  { name: 'Sky Blue',    hex: '#87CEEB' },
  { name: 'Cornflower',  hex: '#6495ED' },
  { name: 'Cobalt',      hex: '#0047AB' },
  { name: 'Navy',        hex: '#001F5B' },
  { name: 'Indigo',      hex: '#4B0082' },
  { name: 'Periwinkle',  hex: '#CCCCFF' },
  { name: 'Lavender',    hex: '#E6E6FA' },
  { name: 'Lilac',       hex: '#C8A2C8' },
  { name: 'Mauve',       hex: '#E0B0B0' },
  { name: 'Blush',       hex: '#FFB6C1' },
  { name: 'Rose',        hex: '#FF66CC' },
  { name: 'Pink',        hex: '#FFC0CB' },
  { name: 'Hot Pink',    hex: '#FF69B4' },
  { name: 'Fuchsia',     hex: '#FF00FF' },
  { name: 'Magenta',     hex: '#FF0090' },
  { name: 'Red',         hex: '#CC0000' },
  { name: 'Crimson',     hex: '#DC143C' },
  { name: 'Burgundy',    hex: '#800020' },
  { name: 'Wine',        hex: '#722F37' },
  { name: 'Rust',        hex: '#B7410E' },
  { name: 'Terracotta',  hex: '#E2725B' },
  { name: 'Coral',       hex: '#FF7F50' },
  { name: 'Peach',       hex: '#FFCBA4' },
  { name: 'Orange',      hex: '#FF8C00' },
  { name: 'Amber',       hex: '#FFBF00' },
  { name: 'Yellow',      hex: '#FFD700' },
  { name: 'Mustard',     hex: '#FFDB58' },
  { name: 'Gold',        hex: '#CFB53B' },
  { name: 'Chocolate',   hex: '#7B3F00' },
  { name: 'Brown',       hex: '#964B00' },
  { name: 'Charcoal',    hex: '#36454F' },
  { name: 'Slate',       hex: '#708090' },
  { name: 'Grey',        hex: '#9E9E9E' },
  { name: 'Silver',      hex: '#C0C0C0' },
  { name: 'Black',       hex: '#1A1A1A' },
];

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const selected = COLOR_PALETTE.find(c => c.name === value);

  const pick = (color) => {
    onChange(color.name);
    setOpen(false);
  };

  const applyCustom = () => {
    if (customText.trim()) { onChange(customText.trim()); setOpen(false); setCustomText(''); }
  };

  return (
    <View style={cpStyles.wrap}>
      <TouchableOpacity style={cpStyles.trigger} onPress={() => setOpen(v => !v)}>
        <View style={[cpStyles.swatch, { backgroundColor: selected?.hex || '#E8E4DC', borderWidth: selected ? 0 : 0.5 }]} />
        <Text style={[cpStyles.triggerText, !value && { color: COLORS.ink3 }]}>{value || 'Pick a color'}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.ink3} />
      </TouchableOpacity>
      {open && (
        <View style={cpStyles.panel}>
          <View style={cpStyles.grid}>
            {COLOR_PALETTE.map(c => (
              <TouchableOpacity key={c.name} onPress={() => pick(c)} style={cpStyles.swatchBtn}>
                <View style={[
                  cpStyles.gridSwatch,
                  { backgroundColor: c.hex, borderWidth: c.name === 'White' || c.name === 'Ivory' || c.name === 'Cream' ? 0.5 : 0 },
                  value === c.name && cpStyles.gridSwatchSelected,
                ]} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={cpStyles.customRow}>
            <TextInput
              style={cpStyles.customInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="Custom color name…"
              placeholderTextColor={COLORS.ink3}
              returnKeyType="done"
              onSubmitEditing={applyCustom}
            />
            <TouchableOpacity style={cpStyles.customBtn} onPress={applyCustom}>
              <Text style={cpStyles.customBtnText}>Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const cpStyles = StyleSheet.create({
  wrap:               { marginBottom: 0 },
  trigger:            { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42 },
  swatch:             { width: 20, height: 20, borderRadius: 10, borderColor: COLORS.borderMed },
  triggerText:        { flex: 1, fontSize: 14, color: COLORS.ink },
  panel:              { marginTop: 6, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 0.5, borderColor: COLORS.borderMed, padding: 12 },
  grid:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchBtn:          { padding: 2 },
  gridSwatch:         { width: 28, height: 28, borderRadius: 14, borderColor: COLORS.borderMed },
  gridSwatchSelected: { transform: [{ scale: 1.25 }], shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 4 },
  customRow:          { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  customInput:        { flex: 1, height: 36, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.sm, paddingHorizontal: 10, fontSize: 13, color: COLORS.ink, backgroundColor: COLORS.cream },
  customBtnText:      { fontSize: 13, fontWeight: '600', color: COLORS.cream },
  customBtn:          { backgroundColor: COLORS.ink, borderRadius: RADIUS.sm, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
});

const OCCASION_PRESETS = [
  'Casual', 'Work', 'Formal', 'Wedding', 'Birthday', 'Date night',
  'Funeral', 'Party', 'Travel', 'Gym', 'Beach', 'Weekend',
];

function OccasionPicker({ value, onChange }) {
  const [customText, setCustomText] = useState('');
  const isPreset = OCCASION_PRESETS.includes(value);

  const pick = (o) => onChange(o === value ? '' : o);
  const applyCustom = () => {
    if (customText.trim()) { onChange(customText.trim()); setCustomText(''); }
  };

  return (
    <View>
      <View style={ocStyles.grid}>
        {OCCASION_PRESETS.map(o => (
          <TouchableOpacity key={o} onPress={() => pick(o)}
            style={[ocStyles.chip, value === o && ocStyles.chipSelected]}>
            <Text style={[ocStyles.chipText, value === o && ocStyles.chipTextSelected]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Show current value if it's a custom (non-preset) string */}
      {value && !isPreset && (
        <View style={ocStyles.customCurrent}>
          <Text style={ocStyles.customCurrentText}>{value}</Text>
          <TouchableOpacity onPress={() => onChange('')}>
            <Feather name="x" size={14} color={COLORS.ink3} />
          </TouchableOpacity>
        </View>
      )}
      <View style={ocStyles.customRow}>
        <TextInput
          style={ocStyles.customInput}
          value={customText}
          onChangeText={setCustomText}
          placeholder="Other occasion…"
          placeholderTextColor={COLORS.ink3}
          returnKeyType="done"
          onSubmitEditing={applyCustom}
        />
        <TouchableOpacity style={ocStyles.customBtn} onPress={applyCustom}>
          <Text style={ocStyles.customBtnText}>Use</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ocStyles = StyleSheet.create({
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  chipSelected:     { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText:         { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  chipTextSelected: { color: COLORS.cream },
  customCurrent:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.sageLt, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 },
  customCurrentText:{ fontSize: 13, fontWeight: '500', color: COLORS.sageDk },
  customRow:        { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput:      { flex: 1, height: 36, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.sm, paddingHorizontal: 10, fontSize: 13, color: COLORS.ink, backgroundColor: COLORS.cream },
  customBtn:        { backgroundColor: COLORS.ink, borderRadius: RADIUS.sm, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
  customBtnText:    { fontSize: 13, fontWeight: '600', color: COLORS.cream },
});

export default function AddItemScreen({ navigate }) {
  const [step, setStep]         = useState('photo'); // photo | form
  const [imageUri, setImageUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [settings, setSettings] = useState(null);

  // Load settings for custom fields + seasons
  useState(() => { getSettings().then(setSettings); });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePickImage = async (useCamera) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to take photos.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
      }
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setAnalyzing(true);
        try {
          const cleaned = await removeBackground(uri);
          const analysis = await analyzeWithClaude(cleaned || uri);
          if (analysis) {
            setForm(prev => ({
              ...prev,
              brand:        analysis.brand        || '',
              name:         analysis.name         || '',
              description:  analysis.description  || '',
              color:        analysis.color        || '',
              color_season: analysis.color_season || '',
              category:     analysis.category     || '',
              original_price: analysis.original_price ? String(analysis.original_price) : '',
            }));
          }
        } finally {
          setAnalyzing(false);
          setStep('form');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not access camera or photos.');
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Please enter a name for this item.'); return; }
    setSaving(true);
    try {
      const customVals = {};
      if (settings) {
        (settings.customFields || []).forEach(f => { customVals[f.key] = form[f.key] || ''; });
      }
      await insertItem({
        ...form,
        ...customVals,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        image_uri: imageUri,
      });
      navigate('Closet');
    } catch (e) {
      Alert.alert('Error', 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  const currency = settings?.currency || '$';
  const visibleSeasons = settings
    ? Object.keys(SEASONS).filter(s => !(settings.hiddenSeasons || []).includes(s))
    : Object.keys(SEASONS);
  const customFields = (settings?.customFields || []).filter(f => f.label);

  // ── PHOTO STEP ───────────────────────────────────────────
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
            {imageUri && (
              <TouchableOpacity style={styles.skipBtn} onPress={() => setStep('form')}>
                <Text style={styles.skipBtnText}>Skip analysis, fill manually →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── FORM STEP ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setStep('photo')} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Item details</Text>
        <TouchableOpacity onPress={handleSave} style={[styles.saveTopBtn, saving && { opacity: 0.6 }]} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={COLORS.cream} />
            : <Text style={styles.saveTopBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
        {imageUri && (
          <View style={styles.formImgContainer}>
            <Image source={{ uri: imageUri }} style={styles.formImg} resizeMode="cover" />
          </View>
        )}
        <View style={styles.form}>
          <Field label="Brand" value={form.brand} onChangeText={v => set('brand', v)} placeholder="e.g. Arket" />
          <Field label="Item name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Merino ribbed turtleneck" />
          <Field label="Description" value={form.description} onChangeText={v => set('description', v)} placeholder="Brief description" multiline />
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Color</Text>
            <ColorPicker value={form.color} onChange={v => set('color', v)} />
          </View>
          <Field label={`Price (${currency})`} value={form.original_price} onChangeText={v => set('original_price', v)} placeholder="e.g. 129" keyboardType="decimal-pad" />
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Color season</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {visibleSeasons.map(s => (
                <TouchableOpacity key={s} onPress={() => set('color_season', s)}
                  style={[styles.seasonChip, { backgroundColor: SEASONS[s].bg }, form.color_season === s && styles.seasonChipSelected]}>
                  <Text style={[styles.seasonChipText, { color: SEASONS[s].text }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
          <Text style={[styles.fieldLabel, { marginBottom: 8, marginTop: 20 }]}>Notes</Text>
          <Field value={form.note1} onChangeText={v => set('note1', v)} placeholder="Note 1" />
          <Field value={form.note2} onChangeText={v => set('note2', v)} placeholder="Note 2" />
          <Field value={form.note3} onChangeText={v => set('note3', v)} placeholder="Note 3" />
          {customFields.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginBottom: 8, marginTop: 20 }]}>Custom fields</Text>
              {customFields.map(f => f.label === 'Occasion'
                ? (
                  <View key={f.key} style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <OccasionPicker value={form[f.key] || ''} onChange={v => set(f.key, v)} />
                  </View>
                )
                : <Field key={f.key} label={f.label} value={form[f.key] || ''} onChangeText={v => set(f.key, v)} placeholder={f.label} />
              )}
            </>
          )}
        </View>
      </ScrollView>
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

import { Feather } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.cream },
  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  iconBtn:            { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  topTitle:           { fontSize: 17, fontWeight: '600', color: COLORS.ink },
  saveTopBtn:         { backgroundColor: COLORS.ink, borderRadius: RADIUS.full, paddingHorizontal: 18, paddingVertical: 8 },
  saveTopBtnText:     { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  analyzing:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  analyzingTitle:     { fontSize: 18, fontWeight: '600', color: COLORS.ink },
  analyzingSub:       { fontSize: 13, color: COLORS.ink2, textAlign: 'center' },
  photoStep:          { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  photoPlaceholder:   { width: '100%', aspectRatio: 3/4, borderRadius: RADIUS.xl, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', gap: 12 },
  photoPlaceholderText: { fontSize: 14, color: COLORS.ink3 },
  previewImg:         { width: '100%', aspectRatio: 3/4, borderRadius: RADIUS.xl },
  photoActions:       { flexDirection: 'row', gap: 12, marginTop: SPACING.lg, width: '100%' },
  photoBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.borderMed, paddingVertical: 13 },
  photoBtnText:       { fontSize: 14, fontWeight: '500', color: COLORS.ink },
  skipBtn:            { marginTop: SPACING.md },
  skipBtnText:        { fontSize: 13, color: COLORS.ink3 },
  formScroll:         { paddingBottom: 60 },
  formImgContainer:   { marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', aspectRatio: 3/4, marginBottom: SPACING.lg },
  formImg:            { width: '100%', height: '100%' },
  form:               { paddingHorizontal: SPACING.xl },
  fieldBlock:         { marginBottom: 14 },
  fieldLabel:         { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input:              { backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42, fontSize: 14, color: COLORS.ink },
  seasonChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  seasonChipSelected: { borderColor: COLORS.ink },
  seasonChipText:     { fontWeight: '500', fontSize: 12 },
  catGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  catChip:            { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  catChipSelected:    { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  catChipText:        { fontWeight: '500', fontSize: 12, color: COLORS.ink2 },
  catChipTextSelected:{ color: COLORS.cream },
});
