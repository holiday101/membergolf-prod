import React, { useContext, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import Field from "../components/Field";
import { AuthContext } from "../auth/AuthContext";
import { colors } from "../config/course";

export default function RegisterScreen() {
  const { register } = useContext(AuthContext);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return Alert.alert("Missing info", "Enter email and password.");
    try {
      setLoading(true);
      await register({ firstName, lastName, email: email.trim(), password });
    } catch (err) {
      Alert.alert("Sign up failed", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>This account is tied to your course.</Text>

      <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
      <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
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
