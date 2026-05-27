import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import ClosetScreen from './ClosetScreen';
import ItemDetailScreen from './ItemDetailScreen';
import AddItemScreen from './AddItemScreen';
import OutfitScreen from './OutfitScreen';
import StatsScreen from './StatsScreen';

import { initDB } from './database';
import { COLORS } from './theme';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [screen, setScreen] = useState('Closet');
  const [detailId, setDetailId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>myfit</Text>
        <Text style={styles.loadingSub}>loading your closet...</Text>
      </View>
    );
  }

  const navigate = (dest, params) => {
    if (dest === 'ItemDetail' && params?.itemId) setDetailId(params.itemId);
    if (dest === 'Closet') setDetailId(null);
    setRefreshKey(k => k + 1);
    setScreen(dest);
  };

  const renderScreen = () => {
    if (screen === 'ItemDetail') return <ItemDetailScreen itemId={detailId} navigate={navigate} />;
    if (screen === 'Add') return <AddItemScreen navigate={navigate} />;
    if (screen === 'Outfit') return <OutfitScreen navigate={navigate} refreshKey={refreshKey} />;
    if (screen === 'Stats') return <StatsScreen navigate={navigate} refreshKey={refreshKey} />;
    return <ClosetScreen navigate={navigate} refreshKey={refreshKey} />;
  };

  const tabs = [
    { name: 'Closet', icon: 'grid' },
    { name: 'Outfit', icon: 'layers' },
    { name: 'Add',    icon: 'plus-circle' },
    { name: 'Stats',  icon: 'bar-chart-2' },
  ];

  const activeTab = screen === 'ItemDetail' ? 'Closet'
    : screen === 'Add' ? 'Add'
    : screen === 'Outfit' ? 'Outfit'
    : screen === 'Stats' ? 'Stats'
    : 'Closet';

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>{renderScreen()}</View>
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <View key={tab.name} style={styles.tabItem}>
            <Feather
              name={tab.icon}
              size={22}
              color={activeTab === tab.name ? COLORS.ink : COLORS.ink3}
              onPress={() => navigate(tab.name)}
            />
            <Text style={[styles.tabLabel, { color: activeTab === tab.name ? COLORS.ink : COLORS.ink3 }]}>
              {tab.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  screenArea: { flex: 1 },
  loading: { flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 32, fontWeight: '500', color: COLORS.ink, letterSpacing: -1 },
  loadingSub: { fontSize: 13, color: COLORS.ink3 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.cream, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 10, paddingBottom: 24 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '500' },
});
