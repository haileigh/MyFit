import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, SafeAreaView, TextInput, Animated, Easing,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOW, FONTS } from './theme';
import { getJourney, toggleSubstep, saveSubstepNote } from './database';
import { useFocusEffect } from './navigation';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  done: {
    bubbleBg: COLORS.accent,
    bubbleBorder: COLORS.accent,
    iconColor: COLORS.white,
    icon: 'checkmark',
    label: 'Complete',
    labelColor: COLORS.accent,
    labelBg: COLORS.accentLight,
    roadColor: COLORS.accent,
  },
  active: {
    bubbleBg: COLORS.primaryMid,
    bubbleBorder: COLORS.primaryMid,
    iconColor: COLORS.white,
    icon: 'ellipse',
    label: 'In progress',
    labelColor: COLORS.primaryMid,
    labelBg: COLORS.primaryLight,
    roadColor: COLORS.primaryMid,
  },
  not_started: {
    bubbleBg: COLORS.bgCard,
    bubbleBorder: COLORS.border,
    iconColor: COLORS.textMuted,
    icon: 'ellipse-outline',
    label: 'Not started',
    labelColor: COLORS.textMuted,
    labelBg: COLORS.bg,
    roadColor: COLORS.border,
  },
};

const BUBBLE_SIZE = 64;
const ROAD_WIDTH = 6;
const ROAD_SEGMENT_HEIGHT = 90;

// ─── ActivePulse — pulsing ring for in-progress bubbles ───────────────────────
function ActivePulse() {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <Animated.View style={{
      position: 'absolute',
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      borderRadius: BUBBLE_SIZE / 2,
      borderWidth: 3,
      borderColor: COLORS.primaryMid,
      transform: [{ scale }],
      opacity,
    }} />
  );
}

// ─── RoadBubble ───────────────────────────────────────────────────────────────
function RoadBubble({ step, side, isLast, onPress }) {
  const cfg = STATUS[step.status] || STATUS.not_started;
  const doneSubs = step.substeps.filter(s => s.done).length;
  const totalSubs = step.substeps.length;
  const subPct = Math.round((doneSubs / totalSubs) * 100);
  const isLeft = side === 'left';

  return (
    <View style={[styles.bubbleRow, isLeft ? styles.bubbleRowLeft : styles.bubbleRowRight]}>
      {/* Road segment on the opposite side of bubble */}
      <View style={[
        styles.roadSegment,
        isLeft ? styles.roadRight : styles.roadLeft,
        { backgroundColor: cfg.roadColor },
      ]} />

      {/* Bubble + card */}
      <View style={[styles.bubbleGroup, isLeft ? styles.bubbleGroupLeft : styles.bubbleGroupRight]}>
        {/* Bubble */}
        <View style={styles.bubbleWrap}>
          {step.status === 'active' && <ActivePulse />}
          <TouchableOpacity
            style={[styles.bubble, { backgroundColor: cfg.bubbleBg, borderColor: cfg.bubbleBorder }]}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Ionicons name={step.icon || cfg.icon} size={26} color={cfg.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <TouchableOpacity
          style={[styles.bubbleCard, isLeft ? styles.bubbleCardLeft : styles.bubbleCardRight]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={styles.bubbleCardTop}>
            <Text style={styles.bubbleTitle} numberOfLines={2}>{step.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.labelBg }]}>
              <Text style={[styles.statusBadgeText, { color: cfg.labelColor }]}>{cfg.label}</Text>
            </View>
          </View>
          <View style={styles.miniProgressWrap}>
            <View style={[styles.miniProgressBar, {
              width: `${subPct}%`,
              backgroundColor: step.status === 'done' ? COLORS.accent : COLORS.primaryMid,
            }]} />
          </View>
          <Text style={styles.bubbleSubCount}>{doneSubs}/{totalSubs} steps</Text>
        </TouchableOpacity>
      </View>

      {/* Vertical road connector (except last) */}
      {!isLast && (
        <View style={[
          styles.verticalRoad,
          isLeft ? styles.verticalRoadLeft : styles.verticalRoadRight,
          { backgroundColor: cfg.roadColor },
        ]} />
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function JourneyScreen({ stats }) {
  const [journey, setJourney] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [noteValues, setNoteValues] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadJourney();
    }, [stats])
  );

  const loadJourney = async () => {
    const data = await getJourney();
    setJourney(data);
    // Pre-load saved notes
    const notes = {};
    data.forEach(step => {
      if (step.notes) {
        Object.assign(notes, step.notes);
      }
    });
    setNoteValues(notes);
  };

  const openModal = (step) => {
    setSelectedStep(step);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedStep(null);
  };

  const handleToggleSubstep = async (stepId, substepIdx) => {
    const updated = await toggleSubstep(stepId, substepIdx);
    setJourney(updated);
    const step = updated.find(s => s.id === stepId);
    setSelectedStep(step || null);
  };

  const handleSaveNote = async (stepId, noteKey, value) => {
    setNoteValues(prev => ({ ...prev, [noteKey]: value }));
    await saveSubstepNote(stepId, noteKey, value);
    const updated = await getJourney();
    setJourney(updated);
  };

  const totalSubsteps = journey.reduce((a, s) => a + s.substeps.length, 0);
  const doneSubsteps = journey.reduce((a, s) => a + s.substeps.filter(x => x.done).length, 0);
  const overallPct = totalSubsteps > 0 ? Math.round((doneSubsteps / totalSubsteps) * 100) : 0;
  const stepsComplete = journey.filter(s => s.status === 'done').length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero progress card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>unlock your license</Text>
              <Text style={styles.heroPct}>{overallPct}%</Text>
              <Text style={styles.heroSub}>{stepsComplete} of {journey.length} steps complete</Text>
            </View>
            <View style={styles.trophyWrap}>
              <Ionicons name="trophy" size={32} color={overallPct === 100 ? '#F59E0B' : COLORS.primaryMid} />
            </View>
          </View>
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { width: `${overallPct}%` }]} />
            {[25, 50, 75].map(m => (
              <View key={m} style={[styles.milestoneDot, { left: `${m}%` }]} />
            ))}
          </View>
          <View style={styles.milestoneRow}>
            <Text style={styles.milestoneLabel}>Start</Text>
            <Text style={styles.milestoneLabel}>Halfway</Text>
            <Text style={styles.milestoneLabel}>License 🎉</Text>
          </View>
          <Text style={styles.anyOrderNote}>
            💡 Steps can be completed in any order
          </Text>
        </View>

        {/* Winding road */}
        <View style={styles.roadContainer}>
          {journey.map((step, i) => (
            <RoadBubble
              key={step.id}
              step={step}
              side={i % 2 === 0 ? 'left' : 'right'}
              isLast={i === journey.length - 1}
              onPress={() => openModal(step)}
            />
          ))}
        </View>

        <Text style={styles.tapHint}>Tap any bubble to see details and check off steps</Text>
      </ScrollView>

      {/* Step detail modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedStep && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
                  <Ionicons name="chevron-down" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedStep.title}</Text>
                  <Text style={styles.modalSub}>{selectedStep.sub}</Text>
                </View>
              </View>

              {selectedStep.autoTracked && (
                <View style={styles.autoTrackBanner}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primaryMid} />
                  <Text style={styles.autoTrackText}>
                    These steps are tracked automatically as you log drives.
                  </Text>
                </View>
              )}

              <ScrollView
                contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Progress circle */}
                <View style={styles.modalProgressRow}>
                  <View style={styles.modalProgressCircle}>
                    <Text style={styles.modalProgressPct}>
                      {Math.round(
                        (selectedStep.substeps.filter(s => s.done).length / selectedStep.substeps.length) * 100
                      )}%
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalProgressLabel}>
                      {selectedStep.substeps.filter(s => s.done).length} of {selectedStep.substeps.length} tasks complete
                    </Text>
                    <View style={styles.modalProgressBarWrap}>
                      <View style={[
                        styles.modalProgressBar,
                        {
                          width: `${Math.round((selectedStep.substeps.filter(s => s.done).length / selectedStep.substeps.length) * 100)}%`,
                          backgroundColor: selectedStep.status === 'done' ? COLORS.accent : COLORS.primaryMid,
                        },
                      ]} />
                    </View>
                  </View>
                </View>

                <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>steps to complete</Text>

                {selectedStep.substeps.map((sub, idx) => (
                  <View key={idx}>
                    <TouchableOpacity
                      style={styles.substepRow}
                      onPress={() => handleToggleSubstep(selectedStep.id, idx)}
                      disabled={!!selectedStep.autoTracked}
                      activeOpacity={selectedStep.autoTracked ? 1 : 0.7}
                    >
                      <View style={[styles.checkCircle, sub.done && styles.checkCircleDone]}>
                        {sub.done && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                      </View>
                      <Text style={[styles.substepText, sub.done && styles.substepDone]}>
                        {sub.text}
                      </Text>
                    </TouchableOpacity>

                    {/* Note field for substeps that have one */}
                    {sub.hasNote && (
                      <View style={styles.noteFieldWrap}>
                        <TextInput
                          style={styles.noteField}
                          placeholder={sub.notePlaceholder || 'Add notes…'}
                          placeholderTextColor={COLORS.textMuted}
                          value={noteValues[sub.noteKey] || ''}
                          onChangeText={(val) => handleSaveNote(selectedStep.id, sub.noteKey, val)}
                          multiline
                          numberOfLines={2}
                        />
                      </View>
                    )}
                  </View>
                ))}

                {selectedStep.autoTracked && (
                  <Text style={styles.autoNote}>
                    Tap "Log" in the app to record drives — progress updates automatically.
                  </Text>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  heroLabel: { fontSize: 11, fontWeight: FONTS.semibold, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  heroPct: { fontSize: 48, fontWeight: FONTS.bold, color: COLORS.white, lineHeight: 52 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  trophyWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  progressWrap: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, overflow: 'visible', position: 'relative' },
  progressBar: { height: 8, backgroundColor: COLORS.accent, borderRadius: RADIUS.full },
  milestoneDot: { position: 'absolute', top: 0, width: 2, height: 8, backgroundColor: 'rgba(255,255,255,0.4)', transform: [{ translateX: -1 }] },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  milestoneLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  anyOrderNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: SPACING.md, textAlign: 'center' },

  // Road
  roadContainer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  bubbleRow: {
    position: 'relative',
    minHeight: BUBBLE_SIZE + ROAD_SEGMENT_HEIGHT,
    marginBottom: 0,
  },
  bubbleRowLeft: { alignItems: 'flex-start' },
  bubbleRowRight: { alignItems: 'flex-end' },

  // Horizontal road segment connecting center to bubble
  roadSegment: {
    position: 'absolute',
    top: BUBBLE_SIZE / 2 - ROAD_WIDTH / 2,
    width: '40%',
    height: ROAD_WIDTH,
    borderRadius: RADIUS.full,
  },
  roadLeft: { left: 0 },
  roadRight: { right: 0 },

  // Vertical road going down to next bubble
  verticalRoad: {
    position: 'absolute',
    bottom: 0,
    width: ROAD_WIDTH,
    height: ROAD_SEGMENT_HEIGHT,
    borderRadius: RADIUS.full,
  },
  verticalRoadLeft: { left: '50%', marginLeft: -ROAD_WIDTH / 2 },
  verticalRoadRight: { left: '50%', marginLeft: -ROAD_WIDTH / 2 },

  // Bubble + card group
  bubbleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    maxWidth: '80%',
  },
  bubbleGroupLeft: { flexDirection: 'row' },
  bubbleGroupRight: { flexDirection: 'row-reverse' },

  bubbleWrap: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },

  // Card next to bubble
  bubbleCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...SHADOW.subtle,
  },
  bubbleCardLeft: {},
  bubbleCardRight: {},
  bubbleCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 6 },
  bubbleTitle: { fontSize: 13, fontWeight: FONTS.semibold, color: COLORS.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  statusBadgeText: { fontSize: 9, fontWeight: FONTS.semibold },
  miniProgressWrap: { height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 4 },
  miniProgressBar: { height: 4, borderRadius: RADIUS.full },
  bubbleSubCount: { fontSize: 10, color: COLORS.textMuted },

  tapHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.lg, marginBottom: SPACING.sm, fontStyle: 'italic' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.bgCard },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.lg, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  modalClose: { padding: 4, marginTop: 2 },
  modalTitle: { fontSize: 18, fontWeight: FONTS.semibold, color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  autoTrackBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.lg, paddingVertical: 10 },
  autoTrackText: { fontSize: 13, color: COLORS.primaryMid, flex: 1 },
  modalProgressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  modalProgressCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  modalProgressPct: { fontSize: 18, fontWeight: FONTS.semibold, color: COLORS.primaryMid },
  modalProgressLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  modalProgressBarWrap: { height: 7, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  modalProgressBar: { height: 7, borderRadius: RADIUS.full },
  sectionLabel: { fontSize: 11, fontWeight: FONTS.semibold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: SPACING.sm },
  substepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkCircleDone: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  substepText: { fontSize: 14, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  substepDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  noteFieldWrap: { marginLeft: 36, marginBottom: 8, marginTop: 2 },
  noteField: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  autoNote: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: SPACING.lg, textAlign: 'center' },
});
