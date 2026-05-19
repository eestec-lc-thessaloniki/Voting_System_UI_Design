import { ROUTES } from "../../router/routes";
import styles from './Sidebar.module.css'
import Sidebarlogo from './Sidebarlogo'
import Navgroup from './Navgroup'
import SideBarUser from './SideBarUser'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_PUBLIC = [
    {
        group: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
            { id: 'events', label: 'Events', icon: 'calendar' },
            { id: 'announcements', label: 'Announcements', icon: 'message' },
        ]
    },
    {
        group: 'Details',
        items: [
            { id: 'polls', label: 'Polls', icon: 'check' },
            { id: 'settings', label: 'Settings', icon: 'settings' },
        ]
    },
]

const NAV_PRIVILEGED = [
    {
        group: 'Admin',
        items: [
            { id: 'attendance', label: 'Attendance', icon: 'user-check' },
            { id: 'meetings', label: 'Meetings', icon: 'users' },
            { id: 'members', label: 'Members', icon: 'user' },
            { id: 'reports', label: 'Reports', icon: 'bar-chart' },
        ]
    }
]

const NAV_ROUTE_MAP = {
    dashboard: ROUTES.DASHBOARD,
    events: ROUTES.EVENTS,
    announcements: ROUTES.ANNOUNCEMENTS,
    polls: ROUTES.POLLS,
    settings: ROUTES.SETTINGS,
    attendance: ROUTES.ATTENDANCE,
    meetings: ROUTES.MEETINGS,
    members: ROUTES.MEMBERS,
    reports: ROUTES.REPORTS,
}

export default function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { isPrivileged } = useAuth()

    const active = Object.entries(NAV_ROUTE_MAP).find(
        ([, route]) => location.pathname === route
    )?.[0] ?? 'dashboard'

    const nav = isPrivileged ? [...NAV_PUBLIC, ...NAV_PRIVILEGED] : NAV_PUBLIC

    return (
        <aside className={styles.sidebar}>
            <div className={styles.glow} />
            <Sidebarlogo />
            <nav className={styles.nav}>
                {nav.map(group => (
                    <Navgroup
                        key={group.group}
                        group={group}
                        active={active}
                        onSelect={(id) => navigate(NAV_ROUTE_MAP[id])}
                    />
                ))}
            </nav>
            <SideBarUser />
        </aside>
    )
}