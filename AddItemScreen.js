import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { COLORS, SPACING, RADIUS, CATEGORIES, SEASONS } from './theme';
import { insertItem } from './database';

// ── API KEYS ────────────────────────────────────────────────
const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY';
const REMOVEBG_API_KEY  = 'YOUR_REMOVEBG_API_KEY';
// ────────────────────────────────────────────────────────────

// ── CAMERA & BACKGROUND REMOVAL ─────────────────────────────
// These functions are ready for the real build (EAS/APK).
// expo-image-picker and expo-file-system don't run in Snack.
// Uncomment and use when you build the APK:
//
// import * as ImagePicker from 'expo-image-picker';
// import * as FileSystem from 'expo-file-system';
//
// async function pickImage(useCamera) {
//   if (useCamera) {
//     const { status } = await ImagePicker.requestCameraPermissionsAsync();
//     if (status !== 'granted') { Alert.alert('Permission needed'); return null; }
//     const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [3,4] });
//     return result.canceled ? null : result.assets[0].uri;
//   } else {
//     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (status !== 'granted') { Alert.alert('Permission needed'); return null; }
//     const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [3,4] });
//     return result.canceled ? null : result.assets[0].uri;
//   }
// }
//
// async function removeBackground(imageUri) {
//   const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
//   const response = await fetch('https://api.remove.bg/v1.0/removebg', {
//     method: 'POST',
//     headers: { 'X-Api-Key': REMOVEBG_API_KEY, 'Content-Type': 'application/json' },
//     body: JSON.stringify({ image_file_b64: base64, size: 'auto' }),
//   });
//   const data = await response.json();
//   return 'data:image/png;base64,' + data.result_b64;
// }
// ────────────────────────────────────────────────────────────

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
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `You are a fashion expert. Analyze this clothing item and return ONLY a JSON object with no extra text:
{
  "brand": "brand name if visible, else empty string",
  "name": "item name e.g. Merino ribbed turtleneck",
  "description": "one sentence describing style and fabric",
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

export default function AddItemScreen({ navigate }) {
  const [imageUri, setImageUri] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand: '', name: '', description: '', color: '',
    color_season: '', category: '', original_price: '',
    note1: '', note2: '', note3: '',
    custom_label1: '', custom_label2: '', custom_label3: '',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // In the real APK build, this calls pickImage() from expo-image-picker.
  // In Snack, we show a notice instead.
  const handlePhotoAction = (useCamera) => {
    Alert.alert(
      'Camera not available in Snack',
      'Photo capture works in the real APK build. For now, fill in details manually or paste an image URL below.',
      [{ text: 'OK' }]
    );
  };

  const handleRemoveBackground = () => {
    setShowImageOptions(false);
    runClaudeAnalysis(imageUri);
  };

  const handleKeepAsIs = () => {
    setShowImageOptions(false);
    runClaudeAnalysis(imageUri);
  };

  const runClaudeAnalysis = async (uri) => {
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY') return;
    setAnalyzing(true);
    try {
      const result = await analyzeWithClaude(uri);
      if (result) {
        setForm(prev => ({
          ...prev,
          brand: result.brand || prev.brand,
          name: result.name || prev.name,
          description: result.description || prev.description,
          color: result.color || prev.color,
          color_season: result.color_season || prev.color_season,
          category: result.category || prev.category,
          original_price: result.original_price ? String(result.original_price) : prev.original_price,
        }));
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Please add an item name.'); return; }
    setSaving(true);
    try {
      await insertItem({
        ...form,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        image_uri: imageUri || null,
      });
      setForm({ brand:'',name:'',description:'',color:'',color_season:'',category:'',original_price:'',note1:'',note2:'',note3:'',custom_label1:'',custom_label2:'',custom_label3:'' });
      setImageUri(null);
      setShowImageOptions(false);
      navigate('Closet');
    } catch (e) {
      Alert.alert('Save failed', 'Could not save item. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add item</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Photo zone */}
        {!imageUri ? (
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => handlePhotoAction(true)}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnLabel}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => handlePhotoAction(false)}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnLabel}>Choose photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity style={styles.changeBtn}
              onPress={() => { setImageUri(null); setShowImageOptions(false); }}>
              <Text style={styles.changeBtnText}>✕  Change photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Background removal options — shown after photo selected */}
        {showImageOptions && (
          <View style={styles.bgOptionsCard}>
            <Text style={styles.bgOptionsTitle}>Remove background?</Text>
            <Text style={styles.bgOptionsSub}>Clean backgrounds make your closet look great</Text>
            <View style={styles.bgOptionsRow}>
              <TouchableOpacity style={styles.bgOptionBtn} onPress={handleRemoveBackground}>
                <Text style={styles.bgOptionIcon}>✨</Text>
                <Text style={styles.bgOptionLabel}>Remove background</Text>
                <Text style={styles.bgOptionSub}>Needs API key</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bgOptionBtn, styles.bgOptionBtnAlt]} onPress={handleKeepAsIs}>
                <Text style={styles.bgOptionIcon}>📌</Text>
                <Text style={[styles.bgOptionLabel, { color: COLORS.ink }]}>Keep as is</Text>
                <Text style={[styles.bgOptionSub, { color: COLORS.ink2 }]}>Use original photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status banners */}
        {analyzing && (
          <View style={styles.banner}>
            <ActivityIndicator size="small" color={COLORS.sage} />
            <Text style={styles.bannerText}>Claude is identifying your item...</Text>
          </View>
        )}
        {!analyzing && !showImageOptions && (
          <View style={[styles.banner, { backgroundColor: COLORS.goldLt }]}>
            <Text style={[styles.bannerText, { color: COLORS.gold }]}>
              📷  Camera works in the APK build · Fill in details manually for now
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <Field label="Brand" value={form.brand} onChangeText={v => set('brand', v)} placeholder="e.g. Arket" />
          <Field label="Item name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Merino ribbed turtleneck" />
          <Field label="Description" value={form.description} onChangeText={v => set('description', v)} placeholder="Brief description" multiline />

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Field label="Color" value={form.color} onChangeText={v => set('color', v)} placeholder="e.g. Ivory" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Price ($)" value={form.original_price} onChangeText={v => set('original_price', v)} placeholder="e.g. 129" keyboardType="decimal-pad" />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Color season</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {Object.keys(SEASONS).map(s => (
                <TouchableOpacity key={s} onPress={() => set('color_season', s)}
                  style={[styles.seasonChip, { backgroundColor: SEASONS[s].bg },
                    form.color_season === s && styles.seasonChipSelected]}>
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
          <Field value={form.note1} onChangeText={v => set('note1', v)} placeholder="e.g. Dry clean only" />
          <Field value={form.note2} onChangeText={v => set('note2', v)} placeholder="e.g. Bought in Paris" />
          <Field value={form.note3} onChangeText={v => set('note3', v)} placeholder="Additional note" />

          <Text style={[styles.fieldLabel, { marginBottom: 8, marginTop: 20 }]}>Custom fields</Text>
          <Field value={form.custom_label1} onChangeText={v => set('custom_label1', v)} placeholder="Custom field 1" />
          <Field value={form.custom_label2} onChangeText={v => set('custom_label2', v)} placeholder="Custom field 2" />
          <Field value={form.custom_label3} onChangeText={v => set('custom_label3', v)} placeholder="Custom field 3" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={COLORS.cream} />
            : <Text style={styles.saveBtnText}>Save to closet</Text>}
        </TouchableOpacity>
      </View>
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
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: 24, fontWeight: '600', color: COLORS.ink },
  scroll: { paddingBottom: 120 },
  photoRow: { flexDirection: 'row', gap: 12, paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  photoBtn: { flex: 1, height: 120, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.borderMed, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoBtnIcon: { fontSize: 28 },
  photoBtnLabel: { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  previewContainer: { marginHorizontal: SPACING.xl, marginBottom: SPACING.md },
  preview: { width: '100%', height: 260, borderRadius: RADIUS.lg, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.border },
  changeBtn: { marginTop: 8, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  changeBtnText: { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  bgOptionsCard: { marginHorizontal: SPACING.xl, marginBottom: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, padding: SPACING.lg },
  bgOptionsTitle: { fontSize: 16, fontWeight: '600', color: COLORS.ink, marginBottom: 4 },
  bgOptionsSub: { fontSize: 12, color: COLORS.ink2, marginBottom: 14 },
  bgOptionsRow: { flexDirection: 'row', gap: 10 },
  bgOptionBtn: { flex: 1, backgroundColor: COLORS.ink, borderRadius: RADIUS.md, padding: 12, alignItems: 'center', gap: 4 },
  bgOptionBtnAlt: { backgroundColor: COLORS.cream, borderWidth: 0.5, borderColor: COLORS.borderMed },
  bgOptionIcon: { fontSize: 22 },
  bgOptionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.cream },
  bgOptionSub: { fontSize: 10, color: 'rgba(247,244,239,0.7)' },
  banner: { marginHorizontal: SPACING.xl, marginBottom: SPACING.md, backgroundColor: COLORS.sageLt, borderRadius: RADIUS.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerText: { fontSize: 12, fontWeight: '500', color: COLORS.sageDk, flex: 1 },
  form: { paddingHorizontal: SPACING.xl },
  fieldBlock: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42, fontSize: 14, color: COLORS.ink },
  seasonChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  seasonChipSelected: { borderColor: COLORS.ink },
  seasonChipText: { fontWeight: '500', fontSize: 12 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  catChipSelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  catChipText: { fontWeight: '500', fontSize: 12, color: COLORS.ink2 },
  catChipTextSelected: { color: COLORS.cream },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.xl, paddingBottom: 32, backgroundColor: COLORS.cream, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontWeight: '500', fontSize: 15, color: COLORS.cream },
});