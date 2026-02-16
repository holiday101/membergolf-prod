import React, { useContext, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import Field from "../components/Field";
import { AuthContext } from "../auth/AuthContext";
import { colors } from "../config/course";

export default function InviteScreen({ route }) {
  const { acceptInvite } = useContext(AuthContext);
  const [token, setToken] = useState(route?.params?.token || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token || !password) {
      return Alert.alert("Missing info", "Enter invite code and password.");
    }
    try {
      setLoading(true);
      await acceptInvite({ token: token.trim(), password, firstName, lastName });
    } catch (err) {
      Alert.alert("Invite failed", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accept Invite</Text>
      <Text style={styles.subtitle}>Enter the invite code from your email.</Text>

      <Field label="Invite Code" value={token} onChangeText={setToken} placeholder="Paste invite code" />
      <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
      <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="********" secureTextEntry />

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Button title="Create Account" onPress={submit} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 20,
  },
});
