import { useState, useEffect } from 'react'
import styles from './DashBoardPage.module.css'
import HeroWelcome from '../features/dashboard/comps/HeroWelcome'
import StatRow from '../features/dashboard/comps/StatRow'
import PollCard from '../features/dashboard/comps/PollCard'
import EventsCard from '../features/dashboard/comps/EventsCard'
import AttendanceCard from '../features/dashboard/comps/AttendanceCard'
import NoticeBoardCard from '../features/dashboard/comps/NoticeBoardCard'

import { fetchEvents, fetchAnnouncements, fetchStats, fetchPolls, fetchAttendanceSessions } from '../services/dashboardApi'

export default function DashboardPage() {
    const [events, setEvents]         = useState([])
    const [notices, setNotices]       = useState([])
    const [stats, setStats]           = useState([])
    const [polls, setPolls]           = useState([])
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading]       = useState(true)
    const [error, setError]           = useState(null)

    useEffect(() => {
        async function loadData() {
            try {
                const [eventsData, announcementsData, statsData, pollsData, attendanceData] = await Promise.all([
                    fetchEvents(),
                    fetchAnnouncements(),
                    fetchStats(),
                    fetchPolls(),
                    fetchAttendanceSessions(),
                ])
                setEvents(eventsData)
                setNotices(announcementsData)
                setStats(statsData)
                setPolls(pollsData)
                setAttendance(attendanceData)
            } catch (err) {
                console.error(err)
                setError('Could not load live data.')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    return (
        <main className={styles.content}>
            <HeroWelcome />
            <StatRow stats={stats} />

            <div className={styles.mainGrid}>
                <PollCard polls={polls} />
                <EventsCard events={events} loading={loading} error={error} />
            </div>

            <div className={styles.bottomGrid}>
                <AttendanceCard sessions={attendance} />
                <NoticeBoardCard notices={notices} loading={loading} error={error} />
            </div>
        </main>
    )
}