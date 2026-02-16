import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

const fallbackCourse = {
  appName: "MemberGolf",
  slug: "membergolf",
  courseId: null,
  colors: {
    primary: "#2F6F60",
    secondary: "#6B6F73",
    background: "#F7F8F6",
    text: "#1D1F20",
    muted: "#8A8F93",
  },
};

export const course = extra.course ?? fallbackCourse;
export const colors = course.colors ?? fallbackCourse.colors;
export const apiBaseUrl = extra.apiBaseUrl ?? "http://localhost:4000";
