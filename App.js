import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from './theme';
import { getSettings, saveSettings, getStats, isFirstLaunch, markLaunched } from './database';

import DriveScreen from './DriveScreen';
import LogScreen from './LogScreen';
import SkillsScreen from './SkillsScreen';
import JourneyScreen from './JourneyScreen';
import SettingsScreen from './SettingsScreen';

const TABS = [
  { id: 'drive', label: 'Drive', icon: 'car-outline', iconActive: 'car' },
  { id: 'log', label: 'Log', icon: 'time-outline', iconActive: 'time' },
  { id: 'skills', label: 'Skills', icon: 'barbell-outline', iconActive: 'barbell' },
  { id: 'journey', label: 'Unlock', icon: 'trophy-outline', iconActive: 'trophy' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

// Little radio easter egg — tap the header icon 3x to unlock a fun message
const RADIO_MESSAGES = [
  "📻 I said DON'T touch it.",
  "📻 Hands on the wheel!!",
  "📻 That's a 10-minute silence penalty.",
  "📻 The DJ is NOT impressed.",
  "📻 Focus on the road, not the vibes.",
];

export default function App() {
  const [activeTab, setActiveTab] = useState('drive');
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({ totalHours: 0, nightHours: 0 });
  const [loading, setLoading] = useState(true);
  const [tabVersion, setTabVersion] = useState(0);
  const [radioTaps, setRadioTaps] = useState(0);
  const [radioMsg, setRadioMsg] = useState('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const first = await isFirstLaunch();
    if (first) await markLaunched();
    const [s, st] = await Promise.all([getSettings(), getStats()]);
    setSettings(s);
    setStats(st);
    setLoading(false);
  };

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
    setTabVersion(v => v + 1);
  };

  const handleSettingsUpdate = useCallback(async (updated) => {
    await saveSettings(updated);
    setSettings(updated);
  }, []);

  const handleStatsUpdate = useCallback((updated) => {
    setStats(updated);
  }, []);

  const handleRadioTap = () => {
    const next = radioTaps + 1;
    setRadioTaps(next);
    if (next >= 3) {
      const msg = RADIO_MESSAGES[Math.floor(Math.random() * RADIO_MESSAGES.length)];
      setRadioMsg(msg);
      setRadioTaps(0);
      setTimeout(() => setRadioMsg(''), 2500);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingRadio}>📻</Text>
        <Text style={styles.loadingTitle}>Don't Touch The Radio</Text>
        <Text style={styles.loadingText}>Loading your drive log…</Text>
        <ActivityIndicator size="small" color={COLORS.primaryMid} style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'drive':
        return (
          <DriveScreen
            key={`drive-${tabVersion}`}
            settings={settings}
            stats={stats}
            onStatsUpdate={handleStatsUpdate}
          />
        );
      case 'log':
        return (
          <LogScreen
            key={`log-${tabVersion}`}
            settings={settings}
            stats={stats}
            onStatsUpdate={handleStatsUpdate}
          />
        );
      case 'skills':
        return (
          <SkillsScreen
            key={`skills-${tabVersion}`}
            settings={settings}
            onSettingsUpdate={handleSettingsUpdate}
          />
        );
      case 'journey':
        return (
          <JourneyScreen
            key={`journey-${tabVersion}`}
            stats={stats}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            key={`settings-${tabVersion}`}
            settings={settings}
            onSettingsUpdate={handleSettingsUpdate}
          />
        );
      default:
        return null;
    }
  };

  const screenTitles = {
    drive: settings?.driverName ? `Hi, ${settings.driverName} 👋` : "Don't Touch The Radio",
    log: 'Hours Log',
    skills: 'Skills',
    journey: 'Unlock Your License',
    settings: 'Settings',
  };

  const pct = Math.min(100, Math.round(((stats?.totalHours || 0) / (settings?.requiredTotal || 45)) * 100));

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleRadioTap} activeOpacity={0.7} style={styles.headerLeft}>
          <Text style={styles.headerRadioIcon}>📻</Text>
          <Text style={styles.headerTitle}>{screenTitles[activeTab]}</Text>
        </TouchableOpacity>
        {activeTab === 'drive' && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{pct}% there</Text>
          </View>
        )}
      </View>

      {/* Easter egg toast */}
      {!!radioMsg && (
        <View style={styles.radioToast}>
          <Text style={styles.radioToastText}>{radioMsg}</Text>
        </View>
      )}

      {/* Screen */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              {active && <View style={styles.tabIndicator} />}
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? COLORS.primaryMid : COLORS.tabInactive}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  loadingRadio: { fontSize: 52, marginBottom: SPACING.md },
  loadingTitle: {
    fontSize: 22,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    backgroundColor: COLORS.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerRadioIcon: { fontSize: 20 },
  headerTitle: {
    fontSize: 18,
    fontWeight: FONTS.semibold,
    color: COLORS.white,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: FONTS.semibold,
    color: COLORS.white,
  },
  radioToast: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  radioToastText: {
    fontSize: 14,
    fontWeight: FONTS.semibold,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  screenContainer: { flex: 1, backgroundColor: COLORS.bg },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 2.5,
    backgroundColor: COLORS.primaryMid,
    borderRadius: RADIUS.full,
  },
  tabLabel: { fontSize: 10, color: COLORS.tabInactive, marginTop: 3, fontWeight: FONTS.medium },
  tabLabelActive: { color: COLORS.primaryMid },
});
