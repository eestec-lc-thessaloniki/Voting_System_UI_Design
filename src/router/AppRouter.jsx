import { Routes, Route } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Sidebar from '../components/layout/Sidebar'
import MainPanel from '../components/layout/MainPanel'
import DashBoardPage from '../pages/DashBoardPage'
import ProtectedRoute from "./ProtectedRoute.jsx";
import LoginPage from '../pages/LoginPage.jsx';
import PollsPage from "../pages/PollsPage.jsx";
import { ROUTES } from './routes'
import EventPage from "../pages/EventPage.jsx";
import AnnouncementsPage from "../pages/AnnouncementsPage.jsx";
import MembersPage from "../pages/MembersPage.jsx";
import { Navigate } from "react-router-dom";
import useAuthStore from "../services/AuthStore.js";
import ReportsPage from "../pages/ReportsPage.jsx";
import AttendancePage from "../pages/AttendancePage.jsx";
import SettingsPage  from "../pages/SettingsPage.jsx";
import MeetingsPage from "../pages/MeetingsPage.jsx";

// Placeholder για pages που δεν έχουν φτιαχτεί ακόμα
const Soon = ({ name }) => (
    <div style={{ padding: '32px', color: 'var(--muted2)' }}>
        {name} — coming soon
    </div>
)

export default function AppRouter() {
    const { isAuthenticated } = useAuthStore()

    return (
        <Routes>
            {/* Public route */}
            <Route
                path={ROUTES.LOGIN}
                element={isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <LoginPage />}
            />

            {/* Protected routes */}
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Sidebar />
                            <MainPanel>
                                <Routes>
                                    <Route path={ROUTES.DASHBOARD} element={<DashBoardPage />} />
                                    <Route path={ROUTES.EVENTS} element={<EventPage />} />
                                    <Route path={ROUTES.POLLS} element={<PollsPage />} />
                                    <Route path={ROUTES.MEMBERS} element={<MembersPage />} />
                                    <Route path={ROUTES.ANNOUNCEMENTS} element={<AnnouncementsPage />} />
                                    <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
                                    <Route path={ROUTES.SETTINGS} element={<SettingsPage/>} />
                                    <Route path={ROUTES.ATTENDANCE} element={<AttendancePage />} />
                                    <Route path="/meetings" element={<MeetingsPage />} />
                                </Routes>
                            </MainPanel>
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    )
}