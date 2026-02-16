const path = require("path");
const fs = require("fs");

function loadCourseConfig(slug) {
  const coursePath = path.join(__dirname, "config", "courses", `${slug}.json`);
  if (!fs.existsSync(coursePath)) {
    throw new Error(`Missing course config: ${coursePath}`);
  }
  return JSON.parse(fs.readFileSync(coursePath, "utf8"));
}

const courseSlug = process.env.COURSE_SLUG || "birch-creek";
const course = loadCourseConfig(courseSlug);

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:4000";

module.exports = {
  expo: {
    name: course.appName,
    slug: course.slug,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: course.colors.background,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: course.iosBundleIdentifier,
    },
    android: {
      package: course.androidPackage,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: course.colors.background,
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    scheme: "membergolf",
    platforms: ["ios", "android"],
    extra: {
      course,
      apiBaseUrl,
    },
  },
};
