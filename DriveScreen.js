import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOW, FONTS } from './theme';
import { addLog, getStats, saveStats, syncHoursStep } from './database';

const QUICK_DESTS = [
  { label: 'Home', icon: 'home-outline' },
  { label: 'School', icon: 'school-outline' },
  { label: 'Work', icon: 'briefcase-outline' },
  { label: 'Practice lot', icon: 'car-outline' },
];

const CONDITIONS = [
  { id: 'day', label: 'Daytime', icon: 'sunny-outline' },
  { id: 'night', label: 'Nighttime', icon: 'moon-outline' },
];

const WEATHER = [
  { id: 'clear', label: 'Clear', icon: 'sunny-outline' },
  { id: 'rain', label: 'Rain', icon: 'rainy-outline' },
  { id: 'snow', label: 'Snow / ice', icon: 'snow-outline' },
  { id: 'fog', label: 'Fog', icon: 'cloud-outline' },
];

export default function DriveScreen({ settings, stats, onStatsUpdate }) {
  const [driving, setDriving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [destination, setDestination] = useState('');
  const [condition, setCondition] = useState('day');
  const [weather, setWeather] = useState('clear');
  const [selectedSkill, setSelectedSkill] = useState('');
  const startRef = useRef(null);
  const intervalRef = useRef(null);

  const allSkills = [...(settings?.prioritySkills || [])];
  const prioritySkills = settings?.prioritySkills || [];
  const requiredTotal = settings?.requiredTotal || 45;
  const requiredNight = settings?.requiredNight || 10;

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartStop = async () => {
    if (!driving) {
      // START
      startRef.current = Date.now();
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
      setDriving(true);
    } else {
      // STOP
      clearInterval(intervalRef.current);
      const totalSecs = Math.floor((Date.now() - startRef.current) / 1000);
      const hrs = Math.round((totalSecs / 3600) * 100) / 100;
      if (hrs < 0.01) {
        setDriving(false);
        setElapsed(0);
        return;
      }
      const isNight = condition === 'night';
      const entry = {
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        hours: hrs,
        condition,
        weather,
        destination: destination || 'Drive',
        skill: selectedSkill,
        manual: false,
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
      setDriving(false);
      setElapsed(0);
      Alert.alert(
        'Drive saved ✓',
        `${hrs.toFixed(2)} hrs logged${isNight ? ' (nighttime)' : ''}.${selectedSkill ? `\nSkill: ${selectedSkill}` : ''}`,
        [{ text: 'OK' }],
      );
    }
  };

  const pct = Math.min(100, Math.round(((stats?.totalHours || 0) / requiredTotal) * 100));
  const rem = Math.max(0, requiredTotal - (stats?.totalHours || 0)).toFixed(1);
  const nightRem = Math.max(0, requiredNight - (stats?.nightHours || 0)).toFixed(1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* Timer card */}
      <View style={[styles.card, styles.timerCard]}>
        <Text style={styles.sectionLabel}>current session</Text>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.driveStatus}>
          {driving
            ? `Driving${destination ? ' to ' + destination : ''}…`
            : 'Ready to drive'}
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, driving && styles.stopBtn]}
          onPress={handleStartStop}
          activeOpacity={0.85}
        >
          <Ionicons name={driving ? 'stop-circle-outline' : 'play-circle-outline'} size={22} color={COLORS.white} />
          <Text style={styles.startBtnText}>{driving ? 'Stop drive' : 'Start drive'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress summary */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>total progress</Text>
          <Text style={styles.pctLabel}>{pct}%</Text>
        </View>
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${pct}%` }]} />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.statSmall}>{(stats?.totalHours || 0).toFixed(1)} hrs logged</Text>
          <Text style={styles.statSmall}>{rem} hrs remaining</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: SPACING.xs }]}>
          <Text style={styles.statSmall}>🌙 Night: {(stats?.nightHours || 0).toFixed(1)} hrs</Text>
          <Text style={styles.statSmall}>{nightRem} night hrs left</Text>
        </View>
      </View>

      {/* Quick destinations */}
      <Text style={[styles.sectionLabel, styles.sectionPad]}>quick destination</Text>
      <View style={styles.destGrid}>
        {QUICK_DESTS.map(d => (
          <TouchableOpacity
            key={d.label}
            style={[styles.destBtn, destination === d.label && styles.destBtnActive]}
            onPress={() => setDestination(destination === d.label ? '' : d.label)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={d.icon}
              size={20}
              color={destination === d.label ? COLORS.primaryMid : COLORS.textSecondary}
            />
            <Text style={[styles.destLabel, destination === d.label && styles.destLabelActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conditions */}
      <Text style={[styles.sectionLabel, styles.sectionPad]}>drive conditions</Text>
      <View style={styles.toggleRow}>
        {CONDITIONS.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.toggleBtn, condition === c.id && styles.toggleBtnActive]}
            onPress={() => setCondition(c.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={c.icon}
              size={16}
              color={condition === c.id ? COLORS.primaryMid : COLORS.textSecondary}
            />
            <Text style={[styles.toggleLabel, condition === c.id && styles.toggleLabelActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.toggleRow, { marginTop: SPACING.sm }]}>
        {WEATHER.map(w => (
          <TouchableOpacity
            key={w.id}
            style={[styles.toggleBtn, weather === w.id && styles.toggleBtnActive]}
            onPress={() => setWeather(w.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={w.icon}
              size={16}
              color={weather === w.id ? COLORS.primaryMid : COLORS.textSecondary}
            />
            <Text style={[styles.toggleLabel, weather === w.id && styles.toggleLabelActive]}>
              {w.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Skill focus */}
      <View style={[styles.card, { marginTop: SPACING.md }]}>
        <Text style={styles.sectionLabel}>skill focus for this drive</Text>
        <Text style={styles.skillHint}>Tap to set focus — tracked in your drive log</Text>
        <View style={styles.chipsWrap}>
          {prioritySkills.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, selectedSkill === s && styles.chipActive]}
              onPress={() => setSelectedSkill(selectedSkill === s ? '' : s)}
              activeOpacity={0.75}
            >
              {selectedSkill === s && (
                <Ionicons name="checkmark" size={13} color={COLORS.primaryMid} style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.chipText, selectedSkill === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
          {prioritySkills.length === 0 && (
            <Text style={styles.emptyHint}>Add priority skills in the Skills tab.</Text>
          )}
        </View>
      </View>

    </ScrollView>
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
  timerCard: { alignItems: 'center', paddingVertical: SPACING.xl },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  sectionPad: { marginTop: SPACING.md, paddingHorizontal: 2 },
  timer: {
    fontSize: 52,
    fontWeight: FONTS.medium,
    color: COLORS.primary,
    letterSpacing: 2,
    marginVertical: SPACING.sm,
  },
  driveStatus: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryMid,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: RADIUS.full,
  },
  stopBtn: { backgroundColor: COLORS.danger },
  startBtnText: { fontSize: 16, fontWeight: FONTS.semibold, color: COLORS.white },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressWrap: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginVertical: SPACING.sm,
  },
  progressBar: { height: 8, backgroundColor: COLORS.primaryMid, borderRadius: RADIUS.full },
  pctLabel: { fontSize: 13, fontWeight: FONTS.semibold, color: COLORS.primaryMid },
  statSmall: { fontSize: 12, color: COLORS.textSecondary },
  destGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  destBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    ...SHADOW.subtle,
  },
  destBtnActive: { borderColor: COLORS.primaryMid, backgroundColor: COLORS.primaryLight },
  destLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  destLabelActive: { color: COLORS.primaryMid },
  toggleRow: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    ...SHADOW.subtle,
  },
  toggleBtnActive: { borderColor: COLORS.primaryMid, backgroundColor: COLORS.primaryLight },
  toggleLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  toggleLabelActive: { color: COLORS.primaryMid },
  skillHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryMid },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primaryMid, fontWeight: FONTS.medium },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
});
