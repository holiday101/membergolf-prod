import React, { useContext } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import { AuthContext, AuthProvider } from "./src/auth/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import InviteScreen from "./src/screens/InviteScreen";
import EventsScreen from "./src/screens/EventsScreen";
import EventDetailScreen from "./src/screens/EventDetailScreen";
import ScoreEntryScreen from "./src/screens/ScoreEntryScreen";
import WinningsScreen from "./src/screens/WinningsScreen";
import { colors } from "./src/config/course";

const Stack = createNativeStackNavigator();
const linking = {
  prefixes: [Linking.createURL("/"), "membergolf://"],
  config: {
    screens: {
      Invite: "invite",
    },
  },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Invite" component={InviteScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: "Event" }} />
      <Stack.Screen name="Scores" component={ScoreEntryScreen} />
      <Stack.Screen name="Winnings" component={WinningsScreen} />
    </Stack.Navigator>
  );
}

function Root() {
  const { token, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <NavigationContainer linking={linking}>
      {token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Root />
    </AuthProvider>
  );
}
