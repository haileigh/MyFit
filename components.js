import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';

// ── Color palette ──────────────────────────────────────────────────────────────
export const COLOR_PALETTE = [
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

const LIGHT_COLORS = ['White', 'Ivory', 'Cream'];

// ── ColorPicker — multi-select tap-to-toggle swatches ─────────────────────────
// value: string[] of color names
// onChange: (string[]) => void
export function ColorPicker({ value = [], onChange }) {
  const [customText, setCustomText] = useState('');
  const selected = new Set(value);

  const toggle = (colorName) => {
    const next = new Set(selected);
    next.has(colorName) ? next.delete(colorName) : next.add(colorName);
    onChange([...next]);
  };

  const applyCustom = () => {
    const trimmed = customText.trim();
    if (trimmed && !selected.has(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomText('');
  };

  const removeColor = (colorName) => {
    onChange(value.filter(c => c !== colorName));
  };

  return (
    <View style={cpStyles.wrap}>
      {/* Selected colors summary */}
      {value.length > 0 && (
        <View style={cpStyles.selectedRow}>
          {value.map(name => {
            const match = COLOR_PALETTE.find(c => c.name === name);
            return (
              <TouchableOpacity key={name} style={cpStyles.selectedChip} onPress={() => removeColor(name)}>
                {match && <View style={[cpStyles.selectedSwatch, { backgroundColor: match.hex, borderWidth: LIGHT_COLORS.includes(name) ? 0.5 : 0 }]} />}
                <Text style={cpStyles.selectedChipText}>{name}</Text>
                <Feather name="x" size={11} color={COLORS.ink3} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {/* Swatch grid */}
      <View style={cpStyles.grid}>
        {COLOR_PALETTE.map(c => (
          <TouchableOpacity key={c.name} onPress={() => toggle(c.name)} style={cpStyles.swatchBtn}>
            <View style={[
              cpStyles.gridSwatch,
              { backgroundColor: c.hex, borderWidth: LIGHT_COLORS.includes(c.name) ? 0.5 : 0 },
              selected.has(c.name) && cpStyles.gridSwatchSelected,
            ]}>
              {selected.has(c.name) && (
                <Feather name="check" size={12} color={LIGHT_COLORS.includes(c.name) ? COLORS.ink : '#fff'} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {/* Custom color input */}
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
          <Text style={cpStyles.customBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cpStyles = StyleSheet.create({
  wrap:               { marginBottom: 0 },
  selectedRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  selectedChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  selectedSwatch:     { width: 12, height: 12, borderRadius: 6, borderColor: COLORS.borderMed },
  selectedChipText:   { fontSize: 12, color: COLORS.ink, fontWeight: '500' },
  grid:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  swatchBtn:          { padding: 2 },
  gridSwatch:         { width: 28, height: 28, borderRadius: 14, borderColor: COLORS.borderMed, alignItems: 'center', justifyContent: 'center' },
  gridSwatchSelected: { transform: [{ scale: 1.2 }] },
  customRow:          { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput:        { flex: 1, height: 36, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.sm, paddingHorizontal: 10, fontSize: 13, color: COLORS.ink, backgroundColor: COLORS.cream },
  customBtn:          { backgroundColor: COLORS.ink, borderRadius: RADIUS.sm, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
  customBtnText:      { fontSize: 13, fontWeight: '600', color: COLORS.cream },
});

// ── Occasion presets ───────────────────────────────────────────────────────────
export const OCCASION_PRESETS = [
  'Casual', 'Work', 'Formal', 'Wedding', 'Birthday', 'Date night',
  'Funeral', 'Party', 'Travel', 'Gym', 'Beach', 'Weekend',
];

// OccasionPicker — multi-select chip grid
// value: string[] of occasion names
// onChange: (string[]) => void
export function OccasionPicker({ value = [], onChange }) {
  const [customText, setCustomText] = useState('');
  const selected = new Set(value);

  const toggle = (o) => {
    const next = new Set(selected);
    next.has(o) ? next.delete(o) : next.add(o);
    onChange([...next]);
  };

  const applyCustom = () => {
    const trimmed = customText.trim();
    if (trimmed && !selected.has(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomText('');
  };

  const removeCustom = (o) => onChange(value.filter(v => v !== o));

  const customValues = value.filter(v => !OCCASION_PRESETS.includes(v));

  return (
    <View>
      <View style={ocStyles.grid}>
        {OCCASION_PRESETS.map(o => (
          <TouchableOpacity key={o} onPress={() => toggle(o)}
            style={[ocStyles.chip, selected.has(o) && ocStyles.chipSelected]}>
            <Text style={[ocStyles.chipText, selected.has(o) && ocStyles.chipTextSelected]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {customValues.map(v => (
        <View key={v} style={ocStyles.customCurrent}>
          <Text style={ocStyles.customCurrentText}>{v}</Text>
          <TouchableOpacity onPress={() => removeCustom(v)}>
            <Feather name="x" size={14} color={COLORS.ink3} />
          </TouchableOpacity>
        </View>
      ))}
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
          <Text style={ocStyles.customBtnText}>Add</Text>
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

// ── SeasonPicker — tap-to-toggle grid (replaces horizontal scroll) ─────────────
// value: string — single season name
// onChange: (string) => void
export function SeasonPicker({ value, onChange, seasons, visibleSeasons }) {
  return (
    <View style={spStyles.grid}>
      {visibleSeasons.map(s => {
        const data = seasons[s];
        const selected = value === s;
        return (
          <TouchableOpacity
            key={s}
            onPress={() => onChange(selected ? '' : s)}
            style={[spStyles.chip, { backgroundColor: data.bg }, selected && spStyles.chipSelected]}>
            <Text style={[spStyles.chipText, { color: data.text }]}>{s}</Text>
            {selected && <Feather name="check" size={10} color={data.text} style={{ marginLeft: 4 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const spStyles = StyleSheet.create({
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center' },
  chipSelected:{ borderColor: COLORS.ink },
  chipText:    { fontWeight: '500', fontSize: 12 },
});

// ── Field — labeled text input ─────────────────────────────────────────────────
export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <View style={fieldStyles.fieldBlock}>
      {label ? <Text style={fieldStyles.fieldLabel}>{label}</Text> : null}
      <TextInput
        style={[fieldStyles.input, multiline && { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.ink3}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        returnKeyType="done"
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  fieldBlock:  { marginBottom: 14 },
  fieldLabel:  { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input:       { backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42, fontSize: 14, color: COLORS.ink },
});

// ── ChipSelect — generic single-select chip grid ───────────────────────────────
export function ChipSelect({ options, value, onChange, style }) {
  return (
    <View style={[csStyles.grid, style]}>
      {options.map(o => (
        <TouchableOpacity key={o} onPress={() => onChange(o)}
          style={[csStyles.chip, value === o && csStyles.chipSelected]}>
          <Text style={[csStyles.chipText, value === o && csStyles.chipTextSelected]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const csStyles = StyleSheet.create({
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip:             { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.white },
  chipSelected:     { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText:         { fontWeight: '500', fontSize: 12, color: COLORS.ink2 },
  chipTextSelected: { color: COLORS.cream },
});
