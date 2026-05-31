/**
 * components.js
 *
 * Pickers:
 *   ColorPicker    — bottom sheet (large swatch grid)
 *   FabricPicker   — bottom sheet (many options + custom text)
 *   OccasionPicker — inline accordion (multi-select chips + custom)
 *   PatternPicker  — inline accordion (single-select + custom text)
 *   SeasonPicker   — inline accordion (single-select)
 *   FitPicker      — inline accordion (single-select)
 *   CategoryPicker — inline accordion (single-select)
 *
 * Other:
 *   Field          — labeled TextInput
 *   PickerSheet    — reusable bottom-sheet modal shell
 *   PickerField    — tappable field row (used by bottom-sheet pickers)
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Pressable, Platform, LayoutAnimation,
  UIManager,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from './theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateNext() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM SHEET SHELL
// ─────────────────────────────────────────────────────────────────────────────
export function PickerSheet({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <View style={sheet.header}>
          <Text style={sheet.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={sheet.closeBtn}>
            <Feather name="x" size={18} color={COLORS.ink2} />
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={sheet.body}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  container: { backgroundColor: COLORS.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  handle:    { width: 36, height: 4, backgroundColor: COLORS.borderMed, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  title:     { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  closeBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border },
  body:      { padding: SPACING.xl, paddingTop: SPACING.lg },
});

// ─────────────────────────────────────────────────────────────────────────────
// PICKER FIELD — tappable trigger row for bottom-sheet pickers
// ─────────────────────────────────────────────────────────────────────────────
export function PickerField({ label, displayValue, placeholder, onPress, colorSwatches }) {
  const isEmpty = !displayValue || (Array.isArray(displayValue) && displayValue.length === 0);
  return (
    <View style={pf.block}>
      {label ? <Text style={pf.label}>{label}</Text> : null}
      <TouchableOpacity style={pf.row} onPress={onPress} activeOpacity={0.7}>
        {colorSwatches && colorSwatches.length > 0 && (
          <View style={pf.swatchRow}>
            {colorSwatches.slice(0, 5).map((hex, i) => (
              <View key={i} style={[pf.swatch, { backgroundColor: hex, marginLeft: i === 0 ? 0 : -5, zIndex: 5 - i, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)' }]} />
            ))}
          </View>
        )}
        <Text style={[pf.value, isEmpty && pf.placeholder]} numberOfLines={1}>
          {isEmpty ? placeholder : (Array.isArray(displayValue) ? displayValue.join(', ') : displayValue)}
        </Text>
        <Feather name="chevron-down" size={14} color={COLORS.ink3} />
      </TouchableOpacity>
    </View>
  );
}

const pf = StyleSheet.create({
  block:       { marginBottom: 14 },
  label:       { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42 },
  swatchRow:   { flexDirection: 'row', alignItems: 'center', marginRight: 2 },
  swatch:      { width: 16, height: 16, borderRadius: 8 },
  value:       { flex: 1, fontSize: 14, color: COLORS.ink },
  placeholder: { color: COLORS.ink3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// INLINE ACCORDION FIELD — tappable trigger that expands below it
// ─────────────────────────────────────────────────────────────────────────────
function AccordionField({ label, summary, placeholder, open, onToggle, children }) {
  const isEmpty = !summary || (Array.isArray(summary) && summary.length === 0);
  const displayText = isEmpty ? placeholder : (Array.isArray(summary) ? summary.join(', ') : summary);

  return (
    <View style={acc.block}>
      {label ? <Text style={acc.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[acc.trigger, open && acc.triggerOpen]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[acc.triggerText, isEmpty && acc.placeholder]} numberOfLines={1}>
          {displayText}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.ink3} />
      </TouchableOpacity>
      {open && (
        <View style={acc.panel}>
          {children}
        </View>
      )}
    </View>
  );
}

const acc = StyleSheet.create({
  block:       { marginBottom: 14 },
  label:       { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  trigger:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42 },
  triggerOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  triggerText: { flex: 1, fontSize: 14, color: COLORS.ink },
  placeholder: { color: COLORS.ink3 },
  panel:       { backgroundColor: COLORS.white, borderWidth: 0.5, borderTopWidth: 0, borderColor: COLORS.borderMed, borderBottomLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md, padding: 12 },
});

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────
export const COLOR_PALETTE = [
  { name: 'White',      hex: '#FFFFFF' }, { name: 'Ivory',      hex: '#FFFFF0' },
  { name: 'Cream',      hex: '#FFFDD0' }, { name: 'Beige',      hex: '#F5F0E8' },
  { name: 'Oatmeal',    hex: '#E8E0D0' }, { name: 'Taupe',      hex: '#C4B9A8' },
  { name: 'Camel',      hex: '#C19A6B' }, { name: 'Tan',        hex: '#D2B48C' },
  { name: 'Sand',       hex: '#C2B280' }, { name: 'Khaki',      hex: '#BDB76B' },
  { name: 'Olive',      hex: '#808000' }, { name: 'Sage',       hex: '#8FAE88' },
  { name: 'Mint',       hex: '#98D4C4' }, { name: 'Teal',       hex: '#008080' },
  { name: 'Forest',     hex: '#228B22' }, { name: 'Emerald',    hex: '#50C878' },
  { name: 'Lime',       hex: '#32CD32' }, { name: 'Sky Blue',   hex: '#87CEEB' },
  { name: 'Cornflower', hex: '#6495ED' }, { name: 'Cobalt',     hex: '#0047AB' },
  { name: 'Navy',       hex: '#001F5B' }, { name: 'Indigo',     hex: '#4B0082' },
  { name: 'Periwinkle', hex: '#CCCCFF' }, { name: 'Lavender',   hex: '#E6E6FA' },
  { name: 'Lilac',      hex: '#C8A2C8' }, { name: 'Mauve',      hex: '#E0B0B0' },
  { name: 'Blush',      hex: '#FFB6C1' }, { name: 'Rose',       hex: '#FF66CC' },
  { name: 'Pink',       hex: '#FFC0CB' }, { name: 'Hot Pink',   hex: '#FF69B4' },
  { name: 'Fuchsia',    hex: '#FF00FF' }, { name: 'Magenta',    hex: '#FF0090' },
  { name: 'Red',        hex: '#CC0000' }, { name: 'Crimson',    hex: '#DC143C' },
  { name: 'Burgundy',   hex: '#800020' }, { name: 'Wine',       hex: '#722F37' },
  { name: 'Rust',       hex: '#B7410E' }, { name: 'Terracotta', hex: '#E2725B' },
  { name: 'Coral',      hex: '#FF7F50' }, { name: 'Peach',      hex: '#FFCBA4' },
  { name: 'Orange',     hex: '#FF8C00' }, { name: 'Amber',      hex: '#FFBF00' },
  { name: 'Yellow',     hex: '#FFD700' }, { name: 'Mustard',    hex: '#FFDB58' },
  { name: 'Gold',       hex: '#CFB53B' }, { name: 'Chocolate',  hex: '#7B3F00' },
  { name: 'Brown',      hex: '#964B00' }, { name: 'Charcoal',   hex: '#36454F' },
  { name: 'Slate',      hex: '#708090' }, { name: 'Grey',       hex: '#9E9E9E' },
  { name: 'Silver',     hex: '#C0C0C0' }, { name: 'Black',      hex: '#1A1A1A' },
  { name: 'Denim',      hex: '#1560BD' }, { name: 'Nude',       hex: '#E8C4A0' },
];

const LIGHT_COLORS = new Set(['White', 'Ivory', 'Cream', 'Beige', 'Oatmeal', 'Periwinkle', 'Lavender', 'Blush', 'Pink', 'Peach', 'Silver', 'Nude']);

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PICKER — bottom sheet, multi-select
// ─────────────────────────────────────────────────────────────────────────────
export function ColorPicker({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const selected = new Set(value);

  const toggle = (name) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    onChange([...next]);
  };

  const addCustom = () => {
    const t = customText.trim();
    if (t && !selected.has(t)) onChange([...value, t]);
    setCustomText('');
  };

  const swatchHexes = value.map(n => COLOR_PALETTE.find(c => c.name === n)?.hex).filter(Boolean);

  return (
    <>
      <PickerField
        label="Color"
        displayValue={value}
        placeholder="Pick colors"
        colorSwatches={swatchHexes}
        onPress={() => setOpen(true)}
      />
      <PickerSheet visible={open} onClose={() => setOpen(false)} title="Color">
        <Text style={cp.hint}>Tap to select · tap again to deselect</Text>
        <View style={cp.grid}>
          {COLOR_PALETTE.map(c => {
            const on = selected.has(c.name);
            const light = LIGHT_COLORS.has(c.name);
            return (
              <TouchableOpacity key={c.name} onPress={() => toggle(c.name)} style={cp.cell}>
                <View style={[cp.swatch, { backgroundColor: c.hex }, light && cp.swatchLight, on && cp.swatchOn]}>
                  {on && <Feather name="check" size={12} color={light ? COLORS.ink : '#fff'} />}
                </View>
                <Text style={cp.swatchLabel} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={cp.customRow}>
          <TextInput style={cp.customInput} value={customText} onChangeText={setCustomText}
            placeholder="Custom color…" placeholderTextColor={COLORS.ink3}
            returnKeyType="done" onSubmitEditing={addCustom} />
          <TouchableOpacity style={cp.customBtn} onPress={addCustom}>
            <Text style={cp.customBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {value.length > 0 && (
          <View style={cp.selectedRow}>
            {value.map(n => (
              <TouchableOpacity key={n} style={cp.selectedChip} onPress={() => toggle(n)}>
                {(() => { const m = COLOR_PALETTE.find(c => c.name === n); return m ? <View style={[cp.selectedDot, { backgroundColor: m.hex, borderWidth: LIGHT_COLORS.has(n) ? 0.5 : 0 }]} /> : null; })()}
                <Text style={cp.selectedChipText}>{n}</Text>
                <Feather name="x" size={11} color={COLORS.ink3} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </PickerSheet>
    </>
  );
}

const cp = StyleSheet.create({
  hint:          { fontSize: 11, color: COLORS.ink3, marginBottom: 12 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  cell:          { alignItems: 'center', width: 44 },
  swatch:        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  swatchLight:   { borderWidth: 0.5, borderColor: COLORS.borderMed },
  swatchOn:      { transform: [{ scale: 1.18 }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  swatchLabel:   { fontSize: 9, color: COLORS.ink3, marginTop: 3, textAlign: 'center' },
  customRow:     { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  customInput:   { flex: 1, height: 36, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.sm, paddingHorizontal: 10, fontSize: 13, color: COLORS.ink, backgroundColor: COLORS.white },
  customBtn:     { backgroundColor: COLORS.ink, borderRadius: RADIUS.sm, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
  customBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.cream },
  selectedRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  selectedChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  selectedDot:   { width: 12, height: 12, borderRadius: 6, borderColor: COLORS.borderMed },
  selectedChipText: { fontSize: 12, color: COLORS.ink, fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────────────────
// FABRIC PICKER — bottom sheet, multi-select + custom
// ─────────────────────────────────────────────────────────────────────────────
export const FABRIC_OPTIONS = [
  'Cotton', 'Merino wool', 'Wool', 'Cashmere', 'Silk', 'Linen',
  'Polyester', 'Nylon', 'Rayon', 'Viscose', 'Denim', 'Velvet',
  'Leather', 'Suede', 'Knit', 'Fleece', 'Canvas', 'Satin',
  'Chiffon', 'Jersey', 'Tweed', 'Corduroy',
];

export function FabricPicker({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const selected = new Set(value);
  const customValues = value.filter(v => !FABRIC_OPTIONS.includes(v));
  const allOptions = [...FABRIC_OPTIONS, ...customValues];

  const toggle = (f) => {
    const next = new Set(selected);
    next.has(f) ? next.delete(f) : next.add(f);
    onChange([...next]);
  };

  const addCustom = () => {
    const t = customText.trim();
    if (t && !selected.has(t)) onChange([...value, t]);
    setCustomText('');
  };

  return (
    <>
      <PickerField label="Fabric" displayValue={value} placeholder="Pick fabrics" onPress={() => setOpen(true)} />
      <PickerSheet visible={open} onClose={() => setOpen(false)} title="Fabric">
        <View style={chips.grid}>
          {allOptions.map(f => {
            const on = selected.has(f);
            return (
              <TouchableOpacity key={f} onPress={() => toggle(f)} style={[chips.chip, on && chips.chipOn]}>
                {on && <Feather name="check" size={11} color={COLORS.cream} style={{ marginRight: 4 }} />}
                <Text style={[chips.chipText, on && chips.chipTextOn]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={chips.customRow}>
          <TextInput style={chips.customInput} value={customText} onChangeText={setCustomText}
            placeholder="Other / blend…" placeholderTextColor={COLORS.ink3}
            returnKeyType="done" onSubmitEditing={addCustom} />
          <TouchableOpacity style={chips.customBtn} onPress={addCustom}>
            <Text style={chips.customBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </PickerSheet>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OCCASION PICKER — inline accordion, multi-select + custom
// ─────────────────────────────────────────────────────────────────────────────
export const OCCASION_PRESETS = [
  'Casual', 'Work', 'Formal', 'Wedding', 'Birthday', 'Date night',
  'Funeral', 'Party', 'Travel', 'Gym', 'Beach', 'Weekend',
  'Going out', 'Lounge', 'Black tie', 'Outdoor',
];

export function OccasionPicker({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const selected = new Set(value);
  const customValues = value.filter(v => !OCCASION_PRESETS.includes(v));
  const allOptions = [...OCCASION_PRESETS, ...customValues];

  const toggle = (o) => {
    const next = new Set(selected);
    next.has(o) ? next.delete(o) : next.add(o);
    onChange([...next]);
  };

  const addCustom = () => {
    const t = customText.trim();
    if (t && !selected.has(t)) onChange([...value, t]);
    setCustomText('');
  };

  return (
    <AccordionField
      label="Occasion"
      summary={value}
      placeholder="Pick occasions"
      open={open}
      onToggle={() => { animateNext(); setOpen(v => !v); }}
    >
      <View style={chips.grid}>
        {allOptions.map(o => {
          const on = selected.has(o);
          return (
            <TouchableOpacity key={o} onPress={() => toggle(o)} style={[chips.chip, on && chips.chipOn]}>
              {on && <Feather name="check" size={11} color={COLORS.cream} style={{ marginRight: 4 }} />}
              <Text style={[chips.chipText, on && chips.chipTextOn]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={chips.customRow}>
        <TextInput style={chips.customInput} value={customText} onChangeText={setCustomText}
          placeholder="Add custom occasion…" placeholderTextColor={COLORS.ink3}
          returnKeyType="done" onSubmitEditing={addCustom} />
        <TouchableOpacity style={chips.customBtn} onPress={addCustom}>
          <Text style={chips.customBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </AccordionField>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN PICKER — inline accordion, single-select + custom
// ─────────────────────────────────────────────────────────────────────────────
export const PATTERN_OPTIONS = [
  'Solid', 'Tonal', 'Ombré',
  'Stripes', 'Pinstripe', 'Awning stripe', 'Multistripe',
  'Plaid', 'Gingham', 'Houndstooth', 'Argyle', 'Windowpane', 'Grid', 'Polka dot',
  'Floral', 'Botanical', 'Abstract', 'Animal print', 'Paisley', 'Ikat',
  'Jacquard', 'Brocade', 'Eyelet', 'Lace', 'Cable knit', 'Ribbed', 'Waffle',
  'Colorblock', 'Patchwork', 'Tie-dye', 'Camouflage', 'Graphic', 'Logo / Branded',
];

export function PatternPicker({ value = '', onChange }) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const isCustom = value && !PATTERN_OPTIONS.includes(value);

  const select = (p) => {
    animateNext();
    onChange(p === value ? '' : p);
    setOpen(false);
  };

  const applyCustom = () => {
    const t = customText.trim();
    if (t) { onChange(t); setCustomText(''); animateNext(); setOpen(false); }
  };

  return (
    <AccordionField
      label="Pattern"
      summary={value}
      placeholder="Pick a pattern"
      open={open}
      onToggle={() => { animateNext(); setOpen(v => !v); }}
    >
      <View style={chips.grid}>
        {PATTERN_OPTIONS.map(p => {
          const on = value === p;
          return (
            <TouchableOpacity key={p} onPress={() => select(p)} style={[chips.chip, on && chips.chipOn]}>
              {on && <Feather name="check" size={11} color={COLORS.cream} style={{ marginRight: 4 }} />}
              <Text style={[chips.chipText, on && chips.chipTextOn]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={chips.customRow}>
        <TextInput style={chips.customInput}
          value={isCustom && !customText ? value : customText}
          onChangeText={setCustomText}
          placeholder="Other pattern…" placeholderTextColor={COLORS.ink3}
          returnKeyType="done" onSubmitEditing={applyCustom} />
        <TouchableOpacity style={chips.customBtn} onPress={applyCustom}>
          <Text style={chips.customBtnText}>Use</Text>
        </TouchableOpacity>
      </View>
    </AccordionField>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASON PICKER — inline accordion, single-select
// ─────────────────────────────────────────────────────────────────────────────
export function SeasonPicker({ value, onChange, seasons, visibleSeasons }) {
  const [open, setOpen] = useState(false);

  const select = (s) => {
    onChange(s === value ? '' : s);
    animateNext();
    setOpen(false);
  };

  return (
    <AccordionField
      label="Color season"
      summary={value}
      placeholder="Pick a color season"
      open={open}
      onToggle={() => { animateNext(); setOpen(v => !v); }}
    >
      <View style={sp.grid}>
        {visibleSeasons.map(s => {
          const data = seasons[s];
          const on = value === s;
          return (
            <TouchableOpacity key={s} onPress={() => select(s)}
              style={[sp.chip, { backgroundColor: data.bg }, on && sp.chipOn]}>
              {on && <Feather name="check" size={11} color={data.text} style={{ marginRight: 5 }} />}
              <Text style={[sp.chipText, { color: data.text }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </AccordionField>
  );
}

const sp = StyleSheet.create({
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'transparent' },
  chipOn:  { borderColor: COLORS.ink },
  chipText:{ fontWeight: '500', fontSize: 12 },
});

// ─────────────────────────────────────────────────────────────────────────────
// FIT PICKER — inline accordion, single-select
// ─────────────────────────────────────────────────────────────────────────────
export function FitPicker({ value, onChange, fitOptions }) {
  const [open, setOpen] = useState(false);

  const select = (f) => {
    onChange(f === value ? '' : f);
    animateNext();
    setOpen(false);
  };

  return (
    <AccordionField
      label="Fit"
      summary={value}
      placeholder="Pick a fit"
      open={open}
      onToggle={() => { animateNext(); setOpen(v => !v); }}
    >
      <View style={chips.grid}>
        {fitOptions.map(f => {
          const on = value === f;
          const isDanger = f === 'I should really get rid of it';
          return (
            <TouchableOpacity key={f} onPress={() => select(f)}
              style={[chips.chip, on && (isDanger ? chips.chipDanger : chips.chipOn), !on && isDanger && chips.chipDangerOutline]}>
              {isDanger && <Feather name="trash-2" size={11} color={on ? COLORS.cream : COLORS.terra} style={{ marginRight: 4 }} />}
              {on && !isDanger && <Feather name="check" size={11} color={COLORS.cream} style={{ marginRight: 4 }} />}
              <Text style={[chips.chipText, on && chips.chipTextOn, !on && isDanger && { color: COLORS.terra }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </AccordionField>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY PICKER — inline accordion, single-select
// ─────────────────────────────────────────────────────────────────────────────
export function CategoryPicker({ value, onChange, categories }) {
  const [open, setOpen] = useState(false);

  const select = (c) => {
    onChange(c);
    animateNext();
    setOpen(false);
  };

  return (
    <AccordionField
      label="Category"
      summary={value}
      placeholder="Pick a category"
      open={open}
      onToggle={() => { animateNext(); setOpen(v => !v); }}
    >
      <View style={chips.grid}>
        {categories.map(c => {
          const on = value === c;
          return (
            <TouchableOpacity key={c} onPress={() => select(c)} style={[chips.chip, on && chips.chipOn]}>
              {on && <Feather name="check" size={11} color={COLORS.cream} style={{ marginRight: 4 }} />}
              <Text style={[chips.chipText, on && chips.chipTextOn]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </AccordionField>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CHIP STYLES
// ─────────────────────────────────────────────────────────────────────────────
const chips = StyleSheet.create({
  grid:              { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: COLORS.borderMed, backgroundColor: COLORS.cream },
  chipOn:            { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipDanger:        { backgroundColor: COLORS.terra, borderColor: COLORS.terra },
  chipDangerOutline: { borderColor: COLORS.terra },
  chipText:          { fontSize: 12, fontWeight: '500', color: COLORS.ink2 },
  chipTextOn:        { color: COLORS.cream },
  customRow:         { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput:       { flex: 1, height: 36, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.sm, paddingHorizontal: 10, fontSize: 13, color: COLORS.ink, backgroundColor: COLORS.white },
  customBtn:         { backgroundColor: COLORS.ink, borderRadius: RADIUS.sm, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
  customBtnText:     { fontSize: 13, fontWeight: '600', color: COLORS.cream },
});

// ─────────────────────────────────────────────────────────────────────────────
// FIELD — labeled TextInput
// ─────────────────────────────────────────────────────────────────────────────
export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <View style={fieldStyles.fieldBlock}>
      {label ? <Text style={fieldStyles.fieldLabel}>{label}</Text> : null}
      <TextInput
        style={[fieldStyles.input, multiline && { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={COLORS.ink3} multiline={multiline}
        keyboardType={keyboardType || 'default'} returnKeyType="done"
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  fieldBlock: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: COLORS.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input:      { backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.borderMed, borderRadius: RADIUS.md, paddingHorizontal: 14, height: 42, fontSize: 14, color: COLORS.ink },
});

// ─────────────────────────────────────────────────────────────────────────────
// CHIP SELECT — generic single-select (kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────
export function ChipSelect({ options, value, onChange, style }) {
  return (
    <View style={[chips.grid, style]}>
      {options.map(o => (
        <TouchableOpacity key={o} onPress={() => onChange(o)}
          style={[chips.chip, value === o && chips.chipOn]}>
          <Text style={[chips.chipText, value === o && chips.chipTextOn]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
