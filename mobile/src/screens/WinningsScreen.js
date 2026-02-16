import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AuthContext } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { colors } from "../config/course";

export default function WinningsScreen({ route }) {
  const { token } = useContext(AuthContext);
  const { eventId } = route.params;
  const [winnings, setWinnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const winningsData = await apiRequest(`/api/events/${eventId}/winnings`, { token });
    setWinnings(Array.isArray(winningsData) ? winningsData : []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await load();
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [eventId, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Winnings</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={winnings}
          keyExtractor={(item) => String(item.eventotherpay_id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No winnings yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.cardRow}>
              <Text style={styles.cardName}>{item.firstname} {item.lastname}</Text>
              <Text style={styles.cardMeta}>${item.amount} {item.description ? `• ${item.description}` : ""}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  empty: {
    textAlign: "center",
    color: colors.secondary,
    marginTop: 12,
  },
  cardRow: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E5E7",
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
});
