import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, CATEGORIES, SEASONS, FIT_OPTIONS } from './theme';
import { insertItem, getSettings } from './database';
import { analyzeWithClaude, getApiKey } from './api';
import { ColorPicker, OccasionPicker, SeasonPicker, Field, ChipSelect } from './components';

async function removeBackground(imageUri) {
  return imageUri;
}

const EMPTY_FORM = {
  name: '', brand: '', description: '',
  colors: [], color_season: '', category: 'Other',
  original_price: '', size: '', fit: '', fabric: '',
  occasions: [],
  note1: '', note2: '', note3: '',
};

export default function AddItemScreen({ navigate }) {
  const [step, setStep]           = useState('photo');
  const [imageUri, setImageUri]   = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [settings, setSettings]   = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useState(() => {
    getSettings().then(setSettings);
    getApiKey().then(k => setHasApiKey(!!k));
  });

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
        if (hasApiKey) {
          setAnalyzing(true);
          try {
            const cleaned = await removeBackground(uri);
            const analysis = await analyzeWithClaude(cleaned || uri);
            if (analysis) {
              setForm(prev => ({
                ...prev,
                name:           analysis.name          || '',
                brand:          analysis.brand         || '',
                description:    analysis.description   || '',
                colors:         Array.isArray(analysis.colors) ? analysis.colors : (analysis.color ? [analysis.color] : []),
                color_season:   analysis.color_season  || '',
                category:       analysis.category      || '',
                occasions:      Array.isArray(analysis.occasions) ? analysis.occasions : [],
                size:           analysis.size          || '',
                fit:            analysis.fit           || '',
                fabric:         analysis.fabric        || '',
                original_price: analysis.original_price ? String(analysis.original_price) : '',
              }));
            }
          } finally {
            setAnalyzing(false);
            setStep('form');
          }
        } else {
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
        colors: JSON.stringify(form.colors),
        occasions: JSON.stringify(form.occasions),
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

  // PHOTO STEP
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
            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep('form')}>
              <Text style={styles.skipBtnText}>Skip photo, fill manually →</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // FORM STEP
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
          <Field label="Item name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Merino ribbed turtleneck" />
          <Field label="Brand" value={form.brand} onChangeText={v => set('brand', v)} placeholder="e.g. Arket" />
          <Field label="Description" value={form.description} onChangeText={v => set('description', v)} placeholder="Brief description" multiline />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Color</Text>
            <ColorPicker value={form.colors} onChange={v => set('colors', v)} />
          </View>

          <Field label={"Price (" + currency + ")"} value={form.original_price} onChangeText={v => set('original_price', v)} placeholder="e.g. 129" keyboardType="decimal-pad" />
          <Field label="Size" value={form.size} onChangeText={v => set('size', v)} placeholder="e.g. S, M, 32, 10" />
          <Field label="Fabric" value={form.fabric} onChangeText={v => set('fabric', v)} placeholder="e.g. Cotton, Merino wool" />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Fit</Text>
            <ChipSelect options={FIT_OPTIONS} value={form.fit} onChange={v => set('fit', v === form.fit ? '' : v)} />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Occasion</Text>
            <OccasionPicker value={form.occasions} onChange={v => set('occasions', v)} />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Color season</Text>
            <SeasonPicker
              value={form.color_season}
              onChange={v => set('color_season', v)}
              seasons={SEASONS}
              visibleSeasons={visibleSeasons}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Category</Text>
            <ChipSelect options={CATEGORIES} value={form.category} onChange={v => set('category', v)} />
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
  skipBtn:              { marginTop: SPACING.md },
  skipBtnText:          { fontSize: 13, color: COLORS.ink3 },
  formScroll:           { paddingBottom: 60 },
  formImgContainer:     { marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', aspectRatio: 3/4, marginBottom: SPACING.lg },
  formImg:              { width: '100%', height: '100%' },
  form:                 { paddingHorizontal: SPACING.xl },
  fieldBlock:           { marginBottom: 14 },
  fieldLabel:           { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
});
