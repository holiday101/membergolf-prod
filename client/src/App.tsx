import { Routes, Route, Navigate } from "react-router-dom";
import { getToken } from "./auth";

import AuthPage from "./pages/AuthPage";
import CalendarPage from "./pages/CalendarPage";
import CreateEventPage from "./pages/CreateEventPage";
import EventListPage from "./pages/EventListPage";
import MemberListPage from "./pages/MemberListPage";
import MemberDetailPage from "./pages/MemberDetailPage";
import SubEventDetailPage from "./pages/SubEventDetailPage";
import SubEventCreatePage from "./pages/SubEventCreatePage";
import RosterListPage from "./pages/RosterListPage";
import UserListPage from "./pages/UserListPage";
import EditEventPage from "./pages/EditEventPage";
import EnterScoresPage from "./pages/EnterScoresPage";
import EventWinningsPage from "./pages/EventWinningsPage";
import EventUploadPage from "./pages/EventUploadPage";
import PostHandicapsPage from "./pages/PostHandicapsPage";
import CourseListPage from "./pages/CourseListPage";
import PublicShell from "./components/Public/PublicShell";
import PublicCalendarPage from "./pages/PublicCalendarPage";
import PublicEventListPage from "./pages/PublicEventListPage";
import PublicMemberListPage from "./pages/PublicMemberListPage";
import PublicMemberDetailPage from "./pages/PublicMemberDetailPage";
import PublicEventDetailPage from "./pages/PublicEventDetailPage";
import MarketingPage from "./pages/MarketingPage";

import AppShell from "./components/AppShell";

function HomeRedirect() {
  return getToken() ? <Navigate to="/calendar" replace /> : <MarketingPage />;
}

function LoginRedirect() {
  return getToken() ? <Navigate to="/calendar" replace /> : <AuthPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginRedirect />} />

      <Route path="/public/:courseId" element={<PublicShell />}>
        <Route index element={<PublicCalendarPage />} />
        <Route path="events" element={<PublicEventListPage />} />
        <Route path="events/:eventId" element={<PublicEventDetailPage />} />
        <Route path="members" element={<PublicMemberListPage />} />
        <Route path="members/:memberId" element={<PublicMemberDetailPage />} />
      </Route>

      {/* Everything inside AppShell shows the global header/nav */}
      <Route element={<AppShell />}>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/events" element={<EventListPage />} />
        <Route path="/events/new" element={<CreateEventPage />} />
        <Route path="/events/:id" element={<EditEventPage />} />
        <Route path="/events/:id/scores" element={<EnterScoresPage />} />
        <Route path="/events/:id/winnings" element={<EventWinningsPage />} />
        <Route path="/events/:id/handicaps" element={<PostHandicapsPage />} />
        <Route path="/events/:id/uploads" element={<EventUploadPage />} />
        <Route path="/members" element={<MemberListPage />} />
        <Route path="/members/:memberId" element={<MemberDetailPage />} />
        <Route path="/subevents/new" element={<SubEventCreatePage />} />
        <Route path="/subevents/:id" element={<SubEventDetailPage />} />
        <Route path="/rosters" element={<RosterListPage />} />
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/users" element={<UserListPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
