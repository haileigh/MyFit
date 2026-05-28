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
  color_season: '', category: '', original_price: '',
  note1: '', note2: '', note3: '',
};

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
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}><Field label="Color" value={form.color} onChangeText={v => set('color', v)} placeholder="e.g. Ivory" /></View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}><Field label={`Price (${currency})`} value={form.original_price} onChangeText={v => set('original_price', v)} placeholder="e.g. 129" keyboardType="decimal-pad" /></View>
          </View>
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
