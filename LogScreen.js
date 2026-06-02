import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOW, FONTS } from './theme';
import { addLog, getLogs, deleteLog, getStats, saveStats, syncHoursStep } from './database';
import { useFocusEffect } from './navigation';

const CONDITION_OPTIONS = [
  { id: 'day', label: 'Daytime', icon: 'sunny-outline' },
  { id: 'night', label: 'Nighttime', icon: 'moon-outline' },
  { id: 'rain', label: 'Rain', icon: 'rainy-outline' },
  { id: 'snow', label: 'Snow / ice', icon: 'snow-outline' },
  { id: 'fog', label: 'Foggy', icon: 'cloud-outline' },
];

const WARN_THRESHOLD = 10;
const MAX_HOURS = 50;

export default function LogScreen({ stats, onStatsUpdate, settings }) {
  const [logs, setLogs] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [condition, setCondition] = useState('day');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const requiredTotal = settings?.requiredTotal || 45;
  const requiredNight = settings?.requiredNight || 15;

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const loadLogs = async () => {
    const data = await getLogs();
    setLogs(data);
  };

  const doSave = async (hrs) => {
    setSaving(true);
    const isNight = condition === 'night';
    const entry = {
      date: date.trim() || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      hours: Math.round(hrs * 100) / 100,
      condition,
      weather: 'clear',
      destination: notes.trim() || 'Manual entry',
      skill: '',
      manual: true,
    };
    await addLog(entry);
    const current = await getStats();
    const newTotal = Math.round((current.totalHours + hrs) * 100) / 100;
    const newNight = isNight
      ? Math.round((current.nightHours + hrs) * 100) / 100
      : current.nightHours;
    const newStats = { totalHours: newTotal, nightHours: newNight };
    await saveStats(newStats);
    await syncHoursStep(newTotal, newNight, requiredNight);
    onStatsUpdate(newStats);
    setDate('');
    setHours('');
    setNotes('');
    setCondition('day');
    setShowAddForm(false);
    setSaving(false);
    loadLogs();
  };

  const handleAddPrev = async () => {
    const hrs = parseFloat(hours);
    if (!hrs || hrs <= 0) {
      Alert.alert('Invalid hours', 'Please enter a valid number of hours.');
      return;
    }
    if (hrs > MAX_HOURS) {
      Alert.alert('Too many hours', `Please enter ${MAX_HOURS} hours or less for a single entry.`);
      return;
    }
    if (hrs > WARN_THRESHOLD) {
      Alert.alert(
        'That\'s a lot of hours!',
        `You entered ${hrs} hours for a single entry. Are you sure that's right?`,
        [
          { text: 'Edit', style: 'cancel' },
          { text: 'Yes, save it', onPress: () => doSave(hrs) },
        ]
      );
      return;
    }
    await doSave(hrs);
  };

  const handleDelete = (log) => {
    Alert.alert(
      'Delete drive?',
      `Remove ${log.hours.toFixed(2)} hrs on ${log.date}? This cannot be undone and will not adjust your total.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteLog(log.id);
            loadLogs();
          },
        },
      ]
    );
  };

  const totalHours = stats?.totalHours || 0;
  const nightHours = stats?.nightHours || 0;
  const pct = Math.min(100, Math.round((totalHours / requiredTotal) * 100));
  const nightPct = Math.min(100, Math.round((nightHours / requiredNight) * 100));
  const rem = Math.max(0, requiredTotal - totalHours).toFixed(1);

  const conditionIcon = (c) => {
    const found = CONDITION_OPTIONS.find(x => x.id === c);
    return found ? found.icon : 'car-outline';
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Summary card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>hours toward license</Text>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.bigNum}>{totalHours.toFixed(1)}</Text>
              <Text style={styles.bigNumSub}>of {requiredTotal} hrs required</Text>
            </View>
            <View style={styles.pctCircle}>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          </View>
          {/* Total bar */}
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Total</Text>
            <View style={styles.progressWrap}>
              <View style={[styles.progressBar, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.barValue}>{rem} left</Text>
          </View>
          {/* Night bar */}
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Night 🌙</Text>
            <View style={styles.progressWrap}>
              <View style={[styles.progressBar, { width: `${nightPct}%`, backgroundColor: COLORS.primary }]} />
            </View>
            <Text style={styles.barValue}>
              {Math.max(0, requiredNight - nightHours).toFixed(1)} left
            </Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Ionicons name="sunny-outline" size={14} color={COLORS.amber} />
              <Text style={styles.statPillText}>{(totalHours - nightHours).toFixed(1)} day</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="moon-outline" size={14} color={COLORS.primary} />
              <Text style={styles.statPillText}>{nightHours.toFixed(1)} night</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="car-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.statPillText}>{logs.length} drives</Text>
            </View>
          </View>
        </View>

        {/* Add previous hours */}
        <TouchableOpacity
          style={styles.addPrevBtn}
          onPress={() => setShowAddForm(!showAddForm)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showAddForm ? 'chevron-up' : 'add-circle-outline'}
            size={18}
            color={COLORS.primaryMid}
          />
          <Text style={styles.addPrevText}>
            {showAddForm ? 'Cancel' : 'Add hours logged before this app'}
          </Text>
        </TouchableOpacity>

        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>add previous hours</Text>

            <Text style={styles.fieldLabel}>Date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. May 20, 2025"
              placeholderTextColor={COLORS.textMuted}
              value={date}
              onChangeText={setDate}
            />

            <Text style={styles.fieldLabel}>Hours driven * (max {MAX_HOURS})</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1.5"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={hours}
              onChangeText={setHours}
            />

            <Text style={styles.fieldLabel}>Conditions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.xs }}>
                {CONDITION_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, condition === c.id && styles.chipActive]}
                    onPress={() => setCondition(c.id)}
                  >
                    <Ionicons
                      name={c.icon}
                      size={14}
                      color={condition === c.id ? COLORS.primaryMid : COLORS.textSecondary}
                    />
                    <Text style={[styles.chipText, condition === c.id && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. highway, school route, rainy"
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleAddPrev}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Add hours'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Drive history */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>drive history</Text>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No drives logged yet. Start a drive or add previous hours above.</Text>
          ) : (
            logs.map(log => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logIconWrap}>
                  <Ionicons name={conditionIcon(log.condition)} size={18} color={COLORS.primaryMid} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle}>{log.destination}</Text>
                  <Text style={styles.logSub}>
                    {log.date} · {log.condition}{log.weather && log.weather !== 'clear' ? ` · ${log.weather}` : ''}
                    {log.skill ? ` · ${log.skill}` : ''}
                    {log.manual ? ' · manual' : ''}
                  </Text>
                </View>
                <Text style={styles.logHrs}>{log.hours.toFixed(2)}h</Text>
                <TouchableOpacity onPress={() => handleDelete(log)} style={{ padding: 4, marginLeft: 4 }}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.lg },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: SPACING.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bigNum: { fontSize: 42, fontWeight: FONTS.medium, color: COLORS.primary, lineHeight: 46 },
  bigNumSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  pctCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: { fontSize: 18, fontWeight: FONTS.semibold, color: COLORS.primaryMid },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.sm },
  barLabel: { fontSize: 12, color: COLORS.textSecondary, width: 52 },
  barValue: { fontSize: 11, color: COLORS.textMuted, width: 44, textAlign: 'right' },
  progressWrap: {
    flex: 1,
    height: 7,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBar: { height: 7, backgroundColor: COLORS.primaryMid, borderRadius: RADIUS.full },
  statRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statPillText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  addPrevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  addPrevText: { fontSize: 14, color: COLORS.primaryMid, fontWeight: FONTS.medium },
  fieldLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryMid },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primaryMid, fontWeight: FONTS.medium },
  saveBtn: {
    backgroundColor: COLORS.primaryMid,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveBtnText: { fontSize: 15, fontWeight: FONTS.semibold, color: COLORS.white },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  logIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTitle: { fontSize: 13, fontWeight: FONTS.medium, color: COLORS.textPrimary },
  logSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  logHrs: { fontSize: 13, fontWeight: FONTS.semibold, color: COLORS.primaryMid },
  emptyText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 20 },
});
