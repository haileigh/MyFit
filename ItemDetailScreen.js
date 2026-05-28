import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, TextInput, ActivityIndicator, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getItemById, logWear, deleteItem, updateItem, getSettings } from './database';
import { COLORS, SPACING, RADIUS, SEASONS, CATEGORIES } from './theme';

const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY';

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

export default function ItemDetailScreen({ itemId, navigate }) {
  const [item, setItem]           = useState(null);
  const [settings, setSettings]   = useState(null);
  const [justLogged, setJustLogged] = useState(false);
  const [editing, setEditing]     = useState(false);
  const [form, setForm]           = useState({});
  const [imageUri, setImageUri]   = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving]       = useState(false);

  useEffect(() => { load(); }, [itemId]);

  const load = async () => {
    const [loaded, s] = await Promise.all([getItemById(itemId), getSettings()]);
    setItem(loaded);
    setSettings(s);
    if (loaded) {
      const customVals = {};
      (s.customFields || []).forEach(f => { customVals[f.key] = loaded[f.key] || ''; });
      setForm({
        brand: loaded.brand || '',
        name: loaded.name || '',
        description: loaded.description || '',
        color: loaded.color || '',
        color_season: loaded.color_season || '',
        category: loaded.category || '',
        original_price: loaded.original_price ? String(loaded.original_price) : '',
        note1: loaded.note1 || '',
        note2: loaded.note2 || '',
        note3: loaded.note3 || '',
        ...customVals,
      });
      setImageUri(loaded.image_uri || null);
    }
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

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

  const handlePickImage = async (useCamera) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4] });
      }
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        Alert.alert('Re-run analysis?', 'Run Claude AI on the new photo?', [
          { text: 'No thanks', style: 'cancel' },
          { text: 'Yes, analyze', onPress: () => runClaudeAnalysis(uri) },
        ]);
      }
    } catch (e) { Alert.alert('Error', 'Could not access camera or photos.'); }
  };

  const runClaudeAnalysis = async (uri) => {
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY') {
      Alert.alert('API key needed', 'Add your Anthropic API key to ItemDetailScreen.js.');
      return;
    }
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
        Alert.alert('Done!', 'Fields updated — review and save.');
      }
    } finally { setAnalyzing(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Please enter an item name.'); return; }
    setSaving(true);
    try {
      await updateItem(item.id, {
        ...form,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        image_uri: imageUri,
      });
      await load();
      setEditing(false);
    } catch (e) { Alert.alert('Error', 'Could not save changes.'); }
    finally { setSaving(false); }
  };

  if (!item || !settings) return <View style={styles.container} />;

  const visibleSeasons = Object.keys(SEASONS).filter(s => !(settings.hiddenSeasons || []).includes(s));
  const season = SEASONS[item.color_season];
  const currency = settings.currency || '$';
  const cpwGoal = settings.cpwGoal;
  const cpwValue = item.original_price && item.times_worn > 0
    ? item.original_price / item.times_worn : null;
  const costPerWear = cpwValue ? currency + cpwValue.toFixed(2) : '—';
  const cpwOver = cpwGoal && cpwValue && cpwValue > cpwGoal;

  const customFields = (settings.customFields || []).filter(f => f.label);

  // ── EDIT MODE ────────────────────────────────────────────────
  if (editing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { load(); setEditing(false); }} style={styles.iconBtn}>
            <Feather name="x" size={20} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={styles.editTitle}>Edit item</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.saveTopBtn, saving && { opacity: 0.6 }]} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={COLORS.cream} />
              : <Text style={styles.saveTopBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editScroll}>
          <View style={styles.editImgContainer}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={styles.editImg} resizeMode="cover" />
              : <View style={styles.editImgPlaceholder}><Feather name="image" size={40} color={COLORS.ink3} /></View>}
          </View>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => handlePickImage(true)}>
              <Feather name="camera" size={16} color={COLORS.ink2} />
              <Text style={styles.photoBtnText}>Retake photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => handlePickImage(false)}>
              <Feather name="image" size={16} color={COLORS.ink2} />
              <Text style={styles.photoBtnText}>Choose photo</Text>
            </TouchableOpacity>
          </View>
          {analyzing && (
            <View style={styles.statusBanner}>
              <ActivityIndicator size="small" color={COLORS.sage} />
              <Text style={styles.statusText}>Claude is analyzing your photo...</Text>
            </View>
          )}
          {imageUri && !analyzing && (
            <TouchableOpacity style={styles.reanalyzeBtn} onPress={() => runClaudeAnalysis(imageUri)}>
              <Feather name="zap" size={14} color={COLORS.purple} />
              <Text style={styles.reanalyzeBtnText}>Re-run Claude analysis on current photo</Text>
            </TouchableOpacity>
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

  // ── VIEW MODE ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('Closet')} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.iconBtn}>
            <Feather name="edit-2" size={17} color={COLORS.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Feather name="trash-2" size={17} color={COLORS.terra} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.imgContainer}>
          {item.image_uri
            ? <Image source={{ uri: item.image_uri }} style={styles.imgFull} resizeMode="cover" />
            : <View style={styles.imgPlaceholder}><Feather name="image" size={48} color={COLORS.ink3} /></View>}
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
            {item.original_price ? <AttrRow label="Original price" value={currency + item.original_price} /> : null}
            <AttrRow label="Cost per wear" value={costPerWear} highlight={!cpwOver} warn={cpwOver} />
            {cpwOver && (
              <View style={styles.cpwWarn}>
                <Feather name="alert-circle" size={13} color={COLORS.terra} />
                <Text style={styles.cpwWarnText}>Above your {currency}{cpwGoal} goal</Text>
              </View>
            )}
          </View>
          {(item.note1 || item.note2 || item.note3) ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              {item.note1 ? <Text style={styles.noteText}>{item.note1}</Text> : null}
              {item.note2 ? <Text style={styles.noteText}>{item.note2}</Text> : null}
              {item.note3 ? <Text style={styles.noteText}>{item.note3}</Text> : null}
            </View>
          ) : null}
          {customFields.filter(f => item[f.key]).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>More details</Text>
              {customFields.filter(f => item[f.key]).map(f => (
                <AttrRow key={f.key} label={f.label} value={item[f.key]} />
              ))}
            </View>
          )}
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

function AttrRow({ label, value, highlight, warn }) {
  if (!value) return null;
  return (
    <View style={styles.attrRow}>
      <Text style={styles.attrLabel}>{label}</Text>
      <Text style={[styles.attrValue, highlight && { color: COLORS.sage, fontWeight: '500' }, warn && { color: COLORS.terra, fontWeight: '500' }]}>{value}</Text>
    </View>
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
  container:          { flex: 1, backgroundColor: COLORS.cream },
  topBar:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  topBarRight:        { flexDirection: 'row', gap: 8 },
  iconBtn:            { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  editTitle:          { fontSize: 16, fontWeight: '600', color: COLORS.ink },
  saveTopBtn:         { backgroundColor: COLORS.ink, borderRadius: RADIUS.full, paddingHorizontal: 18, paddingVertical: 8 },
  saveTopBtnText:     { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  scroll:             { paddingBottom: 120 },
  imgContainer:       { marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.white, aspectRatio: 1, borderWidth: 0.5, borderColor: COLORS.border },
  imgFull:            { width: '100%', height: '100%' },
  imgPlaceholder:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EDE8' },
  body:               { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  brand:              { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 1.5, marginBottom: 4 },
  name:               { fontSize: 24, fontWeight: '600', color: COLORS.ink, lineHeight: 30 },
  description:        { fontSize: 14, color: COLORS.ink2, marginTop: 6, lineHeight: 20 },
  pills:              { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  pill:               { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  pillText:           { fontSize: 12, fontWeight: '500' },
  section:            { marginTop: 24 },
  sectionLabel:       { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  attrRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  attrLabel:          { fontSize: 13, color: COLORS.ink2 },
  attrValue:          { fontSize: 13, color: COLORS.ink },
  noteText:           { fontSize: 13, color: COLORS.ink2, lineHeight: 20, marginBottom: 4 },
  cpwWarn:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: COLORS.terraLt, borderRadius: RADIUS.sm, padding: 8 },
  cpwWarnText:        { fontSize: 12, color: COLORS.terra, fontWeight: '500' },
  footer:             { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.xl, paddingBottom: 32, backgroundColor: COLORS.cream, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  wearBtn:            { backgroundColor: COLORS.ink, borderRadius: RADIUS.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wearBtnText:        { fontSize: 15, fontWeight: '500', color: COLORS.cream },
  editScroll:         { paddingBottom: 60 },
  editImgContainer:   { marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.white, aspectRatio: 1, borderWidth: 0.5, borderColor: COLORS.border, marginBottom: SPACING.md },
  editImg:            { width: '100%', height: '100%' },
  editImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EDE8' },
  photoRow:           { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  photoBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 0.5, borderColor: COLORS.borderMed, paddingVertical: 10 },
  photoBtnText:       { fontSize: 13, fontWeight: '500', color: COLORS.ink2 },
  statusBanner:       { marginHorizontal: SPACING.xl, marginBottom: SPACING.md, backgroundColor: COLORS.sageLt, borderRadius: RADIUS.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText:         { fontSize: 12, fontWeight: '500', color: COLORS.sageDk, flex: 1 },
  reanalyzeBtn:       { marginHorizontal: SPACING.xl, marginBottom: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.purpleLt, borderRadius: RADIUS.md, padding: 12 },
  reanalyzeBtnText:   { fontSize: 13, fontWeight: '500', color: COLORS.purple },
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
