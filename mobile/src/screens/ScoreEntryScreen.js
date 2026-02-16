import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Button from "../components/Button";
import { AuthContext } from "../auth/AuthContext";
import { apiRequest } from "../api/client";
import { colors } from "../config/course";

export default function ScoreEntryScreen({ route }) {
  const { token, user } = useContext(AuthContext);
  const { eventId } = route.params;
  const [members, setMembers] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selfGross, setSelfGross] = useState("");
  const [selfNet, setSelfNet] = useState("");
  const [others, setOthers] = useState([
    { memberId: null, gross: "", net: "" },
    { memberId: null, gross: "", net: "" },
    { memberId: null, gross: "", net: "" },
  ]);

  const selfMemberId = user?.memberId ?? null;
  const selfMember = useMemo(
    () => members.find((m) => m.member_id === selfMemberId) || null,
    [members, selfMemberId]
  );

  const load = async () => {
    const [membersData, cardsData] = await Promise.all([
      apiRequest("/members", { token }),
      apiRequest(`/api/events/${eventId}/cards`, { token }),
    ]);
    setMembers(Array.isArray(membersData) ? membersData : []);
    setCards(Array.isArray(cardsData) ? cardsData : []);
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

  const submit = async () => {
    if (!selfMemberId) return Alert.alert("Missing member", "Your account is not linked to a member.");
    if (!selfGross) return Alert.alert("Missing info", "Enter your gross score.");

    const entries = [
      { memberId: selfMemberId, gross: selfGross, net: selfNet },
      ...others.filter((p) => p.memberId),
    ];

    for (const entry of entries) {
      if (!entry.gross) {
        return Alert.alert("Missing info", "All selected players must have a gross score.");
      }
    }

    try {
      for (const entry of entries) {
        await apiRequest(`/api/events/${eventId}/cards`, {
          method: "POST",
          token,
          body: {
            member_id: Number(entry.memberId),
            gross: Number(entry.gross),
            net: entry.net ? Number(entry.net) : null,
            card_dt: new Date().toISOString(),
          },
        });
      }
      setSelfGross("");
      setSelfNet("");
      setOthers([
        { memberId: null, gross: "", net: "" },
        { memberId: null, gross: "", net: "" },
        { memberId: null, gross: "", net: "" },
      ]);
      await load();
    } catch (err) {
      Alert.alert("Save failed", err.message || "Please try again.");
    }
  };

  const selectedOtherIds = others.map((o) => o.memberId).filter(Boolean);
  const availableFor = (currentId) =>
    members.filter(
      (m) =>
        m.member_id !== selfMemberId &&
        (m.member_id === currentId || !selectedOtherIds.includes(m.member_id))
    );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Enter Scores</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Your Score</Text>
        <Text style={styles.selfName}>
          {selfMember ? `${selfMember.firstname} ${selfMember.lastname}` : "Member not linked"}
        </Text>

        <Text style={styles.label}>Gross Score</Text>
        <TextInput
          style={styles.input}
          value={selfGross}
          onChangeText={setSelfGross}
          keyboardType="numeric"
          placeholder="e.g. 85"
        />

        <Text style={styles.label}>Net Score (optional)</Text>
        <TextInput
          style={styles.input}
          value={selfNet}
          onChangeText={setSelfNet}
          keyboardType="numeric"
          placeholder="e.g. 72"
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Add Up To 3 Other Players</Text>
        {others.map((player, idx) => (
          <View key={idx} style={styles.otherBlock}>
            <Text style={styles.label}>Player {idx + 2}</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={player.memberId}
                onValueChange={(value) => {
                  const next = [...others];
                  next[idx] = { ...next[idx], memberId: value };
                  setOthers(next);
                }}
              >
                <Picker.Item label="Select a member" value={null} />
                {availableFor(player.memberId).map((m) => (
                  <Picker.Item
                    key={m.member_id}
                    label={`${m.firstname} ${m.lastname}`}
                    value={m.member_id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Gross Score</Text>
            <TextInput
              style={styles.input}
              value={player.gross}
              onChangeText={(value) => {
                const next = [...others];
                next[idx] = { ...next[idx], gross: value };
                setOthers(next);
              }}
              keyboardType="numeric"
              placeholder="e.g. 85"
            />

            <Text style={styles.label}>Net Score (optional)</Text>
            <TextInput
              style={styles.input}
              value={player.net}
              onChangeText={(value) => {
                const next = [...others];
                next[idx] = { ...next[idx], net: value };
                setOthers(next);
              }}
              keyboardType="numeric"
              placeholder="e.g. 72"
            />
          </View>
        ))}

        <Button title="Submit Cards" onPress={submit} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => String(item.card_id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No scores yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardName}>{item.firstname} {item.lastname}</Text>
                <Text style={styles.cardMeta}>Gross: {item.gross ?? "-"} | Net: {item.net ?? "-"}</Text>
              </View>
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
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E5E7",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  selfName: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E5E7",
    marginVertical: 14,
  },
  otherBlock: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#D9DDDF",
    borderRadius: 10,
    overflow: "hidden",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9DDDF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
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
