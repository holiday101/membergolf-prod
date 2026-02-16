import React, { useContext, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import Field from "../components/Field";
import { AuthContext } from "../auth/AuthContext";
import { colors, course } from "../config/course";

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return Alert.alert("Missing info", "Enter email and password.");
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert("Login failed", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/course-logo.png")} style={styles.logo} />
      <Text style={styles.title}>{course.appName}</Text>
      <Text style={styles.subtitle}>Sign in to view scores and winnings</Text>

      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="********" secureTextEntry />

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Button title="Sign In" onPress={submit} />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Have an invite?</Text>
        <Text style={styles.link} onPress={() => navigation.navigate("Invite")}>
          Enter code
        </Text>
      </View>
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
  logo: {
    width: 96,
    height: 96,
    alignSelf: "center",
    marginBottom: 16,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  footerText: {
    color: colors.text,
    marginRight: 6,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});
