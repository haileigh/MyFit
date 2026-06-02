import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Alert, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getSettings, saveSettings } from './database';
import { getApiKey, saveApiKey, deleteApiKey } from './api';
import { COLORS, SPACING, RADIUS, SEASONS } from './theme';

export default function SettingsScreen({ navigate }) {
  const [settings, setSettings]     = useState(null);
  const [dirty, setDirty]           = useState(false);
  const [apiKey, setApiKey]         = useState('');
  const [apiKeyStored, setApiKeyStored] = useState(false);
  const [showKey, setShowKey]       = useState(false);
  const [savingKey, setSavingKey]   = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [s, storedKey] = await Promise.all([getSettings(), getApiKey()]);
    setSettings(s);
    setDirty(false);
    setApiKeyStored(!!storedKey);
    // Don't pre-fill the field — user should re-enter to update
  };

  const update = useCallback((patch) => {
    setSettings(prev => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setDirty(false);
    Alert.alert('Saved', 'Your settings have been saved.');
  };

  const handleSaveApiKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) { Alert.alert('No key entered', 'Paste your Anthropic API key above.'); return; }
    setSavingKey(true);
    const ok = await saveApiKey(trimmed);
    setSavingKey(false);
    if (ok) {
      setApiKeyStored(true);
      setApiKey('');
      setShowKey(false);
      Alert.alert('Key saved', 'Your Anthropic API key has been saved securely to this device.');
    } else {
      Alert.alert('Error', 'Could not save the key. Please try again.');
    }
  };

  const handleRemoveApiKey = () => {
    Alert.alert('Remove API key', 'Remove your Anthropic API key from this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await deleteApiKey();
        setApiKeyStored(false);
        setApiKey('');
        Alert.alert('Removed', 'Your API key has been deleted from this device.');
      }},
    ]);
  };

  // Custom fields
  const addCustomField = () => {
    const fields = settings.customFields || [];
    if (fields.length >= 6) { Alert.alert('Maximum reached', 'You can have up to 6 custom fields.'); return; }
    update({ customFields: [...fields, { key: 'custom_' + Date.now(), label: '' }] });
  };

  const removeCustomField = (idx) => {
    Alert.alert('Remove field', 'Remove this custom field?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const fields = [...(settings.customFields || [])];
        fields.splice(idx, 1);
        update({ customFields: fields });
      }},
    ]);
  };

  const renameCustomField = (idx, label) => {
    const fields = [...(settings.customFields || [])];
    fields[idx] = { ...fields[idx], label };
    update({ customFields: fields });
  };

  // Season toggles
  const toggleSeason = (seasonName) => {
    const hidden = new Set(settings.hiddenSeasons || []);
    hidden.has(seasonName) ? hidden.delete(seasonName) : hidden.add(seasonName);
    update({ hiddenSeasons: [...hidden] });
  };

  if (!settings) return <View style={styles.container} />;

  const hiddenSeasons = new Set(settings.hiddenSeasons || []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('Closet')} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}
          disabled={!dirty}>
          <Text style={[styles.saveBtnText, !dirty && { color: COLORS.ink3 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* PREFERENCES */}
        <SectionHeader label="Preferences" />
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Currency symbol</Text>
              <Text style={styles.rowSub}>Used for prices and cost per wear</Text>
            </View>
            <TextInput
              style={styles.currencyInput}
              value={settings.currency || '$'}
              onChangeText={v => update({ currency: v.slice(0, 2) })}
              maxLength={2}
              placeholder="$"
              placeholderTextColor={COLORS.ink3}
            />
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Cost per wear goal</Text>
              <Text style={styles.rowSub}>Flag items above this amount</Text>
            </View>
            <View style={styles.goalInputWrap}>
              <Text style={styles.goalCurrency}>{settings.currency || '$'}</Text>
              <TextInput
                style={styles.goalInput}
                value={settings.cpwGoal ? String(settings.cpwGoal) : ''}
                onChangeText={v => update({ cpwGoal: v ? parseFloat(v) : null })}
                keyboardType="decimal-pad"
                placeholder="e.g. 5"
                placeholderTextColor={COLORS.ink3}
              />
            </View>
          </View>
        </View>

        {/* ANTHROPIC API KEY */}
        <SectionHeader
          label="AI auto-fill"
          sub="Your key is stored securely on this device only"
        />
        <View style={styles.card}>
          {apiKeyStored ? (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>API key saved</Text>
                <Text style={styles.rowSub}>Claude will auto-fill items when you add a photo</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveApiKey} style={styles.removeKeyBtn}>
                <Feather name="trash-2" size={15} color={COLORS.terra} />
                <Text style={styles.removeKeyText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.row, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
              <Text style={styles.rowLabel}>Anthropic API key</Text>
              <Text style={styles.rowSub}>
                Get your key at console.anthropic.com. It is stored only on this device and never shared.
              </Text>
              <View style={styles.keyInputRow}>
                <TextInput
                  style={styles.keyInput}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-ant-..."
                  placeholderTextColor={COLORS.ink3}
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowKey(v => !v)} style={styles.eyeBtn}>
                  <Feather name={showKey ? 'eye-off' : 'eye'} size={16} color={COLORS.ink3} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.saveKeyBtn, savingKey && { opacity: 0.6 }]}
                onPress={handleSaveApiKey}
                disabled={savingKey}>
                <Text style={styles.saveKeyBtnText}>{savingKey ? 'Saving…' : 'Save key'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CUSTOM FIELDS */}
        <SectionHeader label="Custom fields" sub="Up to 6 fields shown on every item" />
        <View style={styles.card}>
          {(settings.customFields || []).length === 0 && (
            <Text style={styles.emptyNote}>No custom fields yet. Tap + to add one.</Text>
          )}
          {(settings.customFields || []).map((field, idx) => (
            <View key={field.key} style={[
              styles.row,
              idx === (settings.customFields || []).length - 1 && { borderBottomWidth: 0 },
            ]}>
              <Feather name="menu" size={14} color={COLORS.ink3} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.fieldInput}
                value={field.label}
                onChangeText={v => renameCustomField(idx, v)}
                placeholder={'Field ' + (idx + 1) + ' name'}
                placeholderTextColor={COLORS.ink3}
              />
              <TouchableOpacity onPress={() => removeCustomField(idx)} style={styles.removeBtn}>
                <Feather name="x" size={16} color={COLORS.terra} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addFieldBtn} onPress={addCustomField}>
            <Feather name="plus" size={16} color={COLORS.sage} />
            <Text style={styles.addFieldBtnText}>Add custom field</Text>
          </TouchableOpacity>
        </View>

        {/* COLOR SEASONS */}
        <SectionHeader label="Color seasons" sub="Toggle which seasons appear in the app" />
        <View style={styles.card}>
          {Object.entries(SEASONS).map(([name, data], idx, arr) => (
            <View key={name} style={[styles.row, idx === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.seasonDot, { backgroundColor: data.bg }]}>
                <Text style={[styles.seasonDotText, { color: data.text }]}>{data.short}</Text>
              </View>
              <Text style={[styles.rowLabel, { flex: 1, marginLeft: 10 }]}>{name}</Text>
              <Switch
                value={!hiddenSeasons.has(name)}
                onValueChange={() => toggleSeason(name)}
                trackColor={{ false: COLORS.border, true: COLORS.sage }}
                thumbColor={COLORS.white}
              />
            </View>
          ))}
        </View>

        {/* STATS */}
        <SectionHeader label="Wardrobe" />
        <View style={styles.card}>
          <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => navigate('Stats')}>
            <Feather name="bar-chart-2" size={18} color={COLORS.ink2} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Stats & insights</Text>
              <Text style={styles.rowSub}>Wear counts, cost per wear, and more</Text>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.ink3} />
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <SectionHeader label="About" />
        <View style={styles.card}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowLabel}>myfit</Text>
            <Text style={styles.rowSub}>v1.0</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label, sub }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.cream },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  iconBtn:        { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title:          { fontSize: 17, fontWeight: '600', color: COLORS.ink },
  saveBtn:        { backgroundColor: COLORS.ink, borderRadius: RADIUS.full, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnDisabled:{ backgroundColor: COLORS.cream, borderWidth: 0.5, borderColor: COLORS.border },
  saveBtnText:    { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  scroll:         { paddingBottom: 40 },
  sectionHeader:  { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.sm },
  sectionLabel:   { fontSize: 11, fontWeight: '600', color: COLORS.ink3, letterSpacing: 1, textTransform: 'uppercase' },
  sectionSub:     { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  card:           { marginHorizontal: SPACING.xl, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: COLORS.border, overflow: 'hidden' },
  row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  rowLabel:       { fontSize: 14, fontWeight: '500', color: COLORS.ink },
  rowSub:         { fontSize: 12, color: COLORS.ink3, marginTop: 1 },
  currencyInput:  { width: 44, height: 36, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.sm, textAlign: 'center', fontSize: 16, fontWeight: '600', color: COLORS.ink, backgroundColor: COLORS.cream },
  goalInputWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.sm, backgroundColor: COLORS.cream, paddingHorizontal: 8, height: 36 },
  goalCurrency:   { fontSize: 14, color: COLORS.ink2, marginRight: 2 },
  goalInput:      { width: 60, fontSize: 14, color: COLORS.ink },
  keyInputRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, backgroundColor: COLORS.cream, paddingHorizontal: 12, height: 44 },
  keyInput:       { flex: 1, fontSize: 13, color: COLORS.ink },
  eyeBtn:         { padding: 4 },
  saveKeyBtn:     { backgroundColor: COLORS.ink, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  saveKeyBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.cream },
  removeKeyBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 0.5, borderColor: COLORS.terra, backgroundColor: COLORS.terraLt },
  removeKeyText:  { fontSize: 12, fontWeight: '500', color: COLORS.terra },
  emptyNote:      { fontSize: 13, color: COLORS.ink3, padding: SPACING.md, textAlign: 'center' },
  fieldInput:     { flex: 1, fontSize: 14, color: COLORS.ink, paddingVertical: 4 },
  removeBtn:      { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  addFieldBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  addFieldBtnText:{ fontSize: 14, fontWeight: '500', color: COLORS.sage },
  seasonDot:      { width: 36, height: 22, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  seasonDotText:  { fontSize: 10, fontWeight: '600' },
});
