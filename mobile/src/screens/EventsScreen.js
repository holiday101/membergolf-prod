import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { colors } from "../config/course";
import { dateRangeAroundToday } from "../utils/date";

export default function EventsScreen({ navigation }) {
  const { token, logout } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    const { start, end } = dateRangeAroundToday(45);
    const data = await apiRequest(`/api/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
      token,
    });
    setEvents(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadEvents();
      } catch (err) {
        if (err.status === 401) logout();
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, logout]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadEvents();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
    >
      <Text style={styles.cardTitle}>{item.eventname}</Text>
      <Text style={styles.cardSubtitle}>{item.eventdescription || "No description"}</Text>
      <Text style={styles.cardMeta}>
        {new Date(item.start_dt).toLocaleDateString()} - {new Date(item.end_dt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Events</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No events found.</Text>}
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
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: colors.text,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E5E7",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
  },
  empty: {
    textAlign: "center",
    color: colors.secondary,
  },
});
