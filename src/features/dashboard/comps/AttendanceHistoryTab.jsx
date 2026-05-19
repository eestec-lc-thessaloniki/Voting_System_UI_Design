import { useEffect, useState } from 'react'
import { getAll as getAllMeetings } from '../../../services/MeetingApi'
import { getRoundsByCheckId, getAttendanceSummary } from '../../../services/AttendanceApi'
import { getPollsByMeeting } from '../../../services/PollsApi'
import styles from './AttendancehistoryTab.module.css'

const MAX_MEETINGS = 5

// --- Round row — lazy loads when poll is expanded ---
function RoundRow({ round }) {
    const closedAt = round.closedAt
        ? new Date(round.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—'
    const createdAt = round.createdAt
        ? new Date(round.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—'

    return (
        <div className={styles.roundRow}>
            <span className={styles.roundLabel}>Round {round.roundNumber}</span>
            <span className={styles.roundMeta}>Opened: {createdAt}</span>
            <span className={styles.roundMeta}>Closed: {closedAt}</span>
            <span className={`${styles.roundStatus} ${round.isActive ? styles.roundActive : styles.roundClosed}`}>
                {round.isActive ? 'Active' : 'Closed'}
            </span>
        </div>
    )
}

// --- Poll section — lazy loads rounds + summary when expanded ---
function PollSection({ poll }) {
    const [expanded, setExpanded] = useState(false)
    const [rounds, setRounds] = useState([])
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleExpand = async () => {
        setExpanded(v => !v)
        if (rounds.length > 0 || !poll.attendanceCheckId) return
        setLoading(true)
        try {
            const [fetchedRounds, fetchedSummary] = await Promise.all([
                getRoundsByCheckId(poll.attendanceCheckId),
                getAttendanceSummary(poll.id),
            ])
            // Newest rounds first
            setRounds([...fetchedRounds].reverse())
            setSummary(fetchedSummary)
        } catch (err) {
            console.error('Failed to load poll attendance data', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.pollSection}>
            <button className={styles.pollHeader} onClick={handleExpand}>
                <div className={styles.pollInfo}>
                    <span className={styles.pollTitle}>{poll.title}</span>
                    <span className={`${styles.pollStatus} ${styles[`status_${poll.status}`]}`}>
                        {poll.status}
                    </span>
                </div>
                <div className={styles.pollMeta}>
                    {poll.electoralBodyCount != null && (
                        <span className={styles.pollCount}>
                            🗳 Electoral body: {poll.electoralBodyCount}
                        </span>
                    )}
                    <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
                </div>
            </button>

            {expanded && (
                <div className={styles.pollBody}>
                    {loading ? (
                        <p className={styles.state}>Loading...</p>
                    ) : (
                        <>
                            {/* Attendance summary counts */}
                            {summary && (
                                <div className={styles.summaryBar}>
                                    <span className={styles.summaryItem}>
                                        👤 Junior: {summary.juniorMembers ?? 0}
                                    </span>
                                    <span className={styles.summaryItem}>
                                        👤 Members: {summary.members ?? 0}
                                    </span>
                                    <span className={styles.summaryItem}>
                                        👤 Alumni: {summary.alumni ?? 0}
                                    </span>
                                    <span className={`${styles.summaryItem} ${styles.summaryTotal}`}>
                                        Total: {summary.total ?? 0}
                                    </span>
                                </div>
                            )}

                            {/* Rounds */}
                            {rounds.length === 0 ? (
                                <p className={styles.state}>No rounds recorded.</p>
                            ) : (
                                <div className={styles.roundsList}>
                                    {rounds.map(round => (
                                        <RoundRow key={round.id} round={round} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// --- Meeting card — lazy loads polls when expanded ---
function MeetingCard({ meeting }) {
    const [expanded, setExpanded] = useState(false)
    const [polls, setPolls] = useState([])
    const [loading, setLoading] = useState(false)

    const handleExpand = async () => {
        setExpanded(v => !v)
        if (polls.length > 0) return
        setLoading(true)
        try {
            const fetchedPolls = await getPollsByMeeting(meeting.id)
            setPolls(fetchedPolls ?? [])
        } catch (err) {
            console.error('Failed to load polls for meeting', meeting.id, err)
        } finally {
            setLoading(false)
        }
    }

    const meetingDate = meeting.meetingDate
        ? new Date(meeting.meetingDate).toLocaleDateString()
        : '—'

    return (
        <div className={styles.card}>
            <button className={styles.cardHeader} onClick={handleExpand}>
                <div className={styles.cardInfo}>
                    <span className={styles.cardTitle}>
                        {meeting.title ?? `Meeting #${meeting.id}`}
                    </span>
                    <span className={styles.cardDate}>{meetingDate}</span>
                </div>
                <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <div className={styles.cardBody}>
                    {loading ? (
                        <p className={styles.state}>Loading polls...</p>
                    ) : polls.length === 0 ? (
                        <p className={styles.state}>No polls for this meeting.</p>
                    ) : (
                        polls.map(poll => (
                            <PollSection key={poll.id} poll={poll} />
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

// --- Main tab ---
export default function AttendanceHistoryTab() {
    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const all = await getAllMeetings()
                // Newest first, cap at 5
                const sorted = [...all]
                    .sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate))
                    .slice(0, MAX_MEETINGS)
                setMeetings(sorted)
            } catch {
                setError('Failed to load meeting history.')
            } finally {
                setLoading(false)
            }
        }
        fetchMeetings()
    }, [])

    if (loading) return <p className={styles.state}>Loading history...</p>
    if (error) return <p className={styles.stateError}>{error}</p>
    if (meetings.length === 0) return (
        <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🗂️</span>
            <p>No meetings found.</p>
        </div>
    )

    return (
        <div className={styles.wrapper}>
            {meetings.map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
        </div>
    )
}