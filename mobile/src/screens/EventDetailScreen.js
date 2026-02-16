import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import { AuthContext } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { colors } from "../config/course";

export default function EventDetailScreen({ route, navigation }) {
  const { token } = useContext(AuthContext);
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/api/events/${eventId}`, { token });
        setEvent(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [eventId, token]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loading}>
        <Text style={styles.empty}>Event not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.eventname}</Text>
      <Text style={styles.subtitle}>{event.eventdescription || "No description"}</Text>
      <Text style={styles.meta}>
        {new Date(event.start_dt).toLocaleDateString()} - {new Date(event.end_dt).toLocaleDateString()}
      </Text>

      <View style={styles.actions}>
        <Button title="Enter Scores" onPress={() => navigation.navigate("Scores", { eventId })} />
        <View style={styles.spacer} />
        <Button
          title="View Winnings"
          variant="secondary"
          onPress={() => navigation.navigate("Winnings", { eventId })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 6,
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
  },
  spacer: {
    height: 12,
  },
  empty: {
    color: colors.secondary,
  },
});
