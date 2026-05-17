import { useState } from 'react'
import ActiveMeetingTab from '../features/dashboard/comps/ActiveMeetingTab.jsx'
import AttendanceHistoryTab from '../features/dashboard/comps/AttendanceHistoryTab.jsx'
import ManageRoundsTab from '../features/dashboard/comps/ManageRoundsTab.jsx'
import useAuthStore from '../services/authStore'
import styles from './AttendancePage.module.css'

export default function AttendancePage() {
    const { user } = useAuthStore()
    const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.role)

    const tabs = [
        { id: 'active', label: 'Active Meeting' },
        { id: 'history', label: 'History' },
        ...(isPrivileged ? [{ id: 'manage', label: 'Manage Rounds' }] : []),
    ]

    const [activeTab, setActiveTab] = useState('active')

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Attendance</h1>
                <p className={styles.subtitle}>Manage check-ins for the active meeting or review past records.</p>
            </div>

            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={styles.content}>
                {activeTab === 'active' && <ActiveMeetingTab />}
                {activeTab === 'history' && <AttendanceHistoryTab />}
                {activeTab === 'manage' && <ManageRoundsTab />}
            </div>
        </div>
    )
}