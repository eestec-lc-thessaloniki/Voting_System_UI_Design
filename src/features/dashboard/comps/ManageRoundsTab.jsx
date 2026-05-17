import { useState, useEffect } from 'react'
import { getAll as getAllMeetings } from '../../../services/MeetingApi'
import { getAll as getAllUsers } from '../../../services/UsersApi'
import {
    getChecksByMeeting,
    createAttendanceCheckForMeeting,
    openRound,
    getRoundsByCheckId,
} from '../../../services/AttendanceApi'
import AttendanceRoundCard from './AttendanceRoundCard'
import useAuthStore from '../../../services/authStore'
import styles from './ManageRoundsTab.module.css'

export default function ManageRoundsTab() {
    const { user } = useAuthStore()

    const [meetings, setMeetings] = useState([])
    const [meetingsLoading, setMeetingsLoading] = useState(true)
    const [users, setUsers] = useState([])

    const [selectedMeetingId, setSelectedMeetingId] = useState('')
    const [check, setCheck] = useState(null)
    const [rounds, setRounds] = useState([])
    const [detailLoading, setDetailLoading] = useState(false)

    const [creating, setCreating] = useState(false)
    const [openingRound, setOpeningRound] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        Promise.all([getAllMeetings(), getAllUsers()])
            .then(([meetingData, userData]) => {
                const sorted = [...meetingData].sort(
                    (a, b) => new Date(b.meetingDate) - new Date(a.meetingDate)
                )
                setMeetings(sorted)
                setUsers(userData)
            })
            .catch(() => {})
            .finally(() => setMeetingsLoading(false))
    }, [])

    const loadMeetingDetails = async (meetingId) => {
        setCheck(null)
        setRounds([])
        setError(null)
        if (!meetingId) return
        setDetailLoading(true)
        try {
            const fetchedChecks = await getChecksByMeeting(parseInt(meetingId))
            const firstCheck = fetchedChecks[0] ?? null
            setCheck(firstCheck)
            if (firstCheck) {
                const fetchedRounds = await getRoundsByCheckId(firstCheck.id)
                setRounds(fetchedRounds)
            }
        } catch {
            setError('Failed to load attendance data for this meeting.')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleMeetingChange = (e) => {
        const id = e.target.value
        setSelectedMeetingId(id)
        loadMeetingDetails(id)
    }

    const handleCreateCheck = async () => {
        setCreating(true)
        setError(null)
        try {
            const newCheck = await createAttendanceCheckForMeeting(
                parseInt(selectedMeetingId),
                user.userId
            )
            setCheck(newCheck)
            setRounds([])
        } catch (err) {
            setError(err?.response?.data || 'Failed to create attendance check.')
        } finally {
            setCreating(false)
        }
    }

    const handleOpenRound = async () => {
        if (!check) return
        setOpeningRound(true)
        setError(null)
        try {
            const newRound = await openRound(check.id)
            setRounds(prev => [...prev, newRound])
        } catch (err) {
            setError(err?.response?.data || 'Failed to open round.')
        } finally {
            setOpeningRound(false)
        }
    }

    const hasActiveRound = rounds.some(r => r.isActive)

    return (
        <div className={styles.wrapper}>

            <div className={styles.selectRow}>
                <label className={styles.label}>Meeting</label>
                <select
                    className={styles.select}
                    value={selectedMeetingId}
                    onChange={handleMeetingChange}
                    disabled={meetingsLoading}
                >
                    <option value="">— select a meeting —</option>
                    {meetings.map(m => (
                        <option key={m.id} value={m.id}>
                            Meeting #{m.id}{m.meetingDate ? ` · ${m.meetingDate}` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {selectedMeetingId && detailLoading && (
                <p className={styles.state}>Loading...</p>
            )}

            {error && <p className={styles.stateError}>{error}</p>}

            {selectedMeetingId && !detailLoading && (
                <div className={styles.panel}>

                    <div className={styles.checkRow}>
                        <div className={styles.checkInfo}>
                            <span className={styles.checkLabel}>Attendance Check</span>
                            {!check && <span className={styles.badgeNone}>Not started</span>}
                            {check && (
                                <span className={check.isOpen ? styles.badgeOpen : styles.badgeClosed}>
                                    {check.isOpen ? 'Open' : 'Closed'} · ID {check.id}
                                </span>
                            )}
                        </div>

                        <div className={styles.actions}>
                            {!check && (
                                <button
                                    className={styles.btn}
                                    onClick={handleCreateCheck}
                                    disabled={creating}
                                >
                                    {creating ? 'Creating...' : 'Start Attendance'}
                                </button>
                            )}
                            {check && check.isOpen && !hasActiveRound && (
                                <button
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={handleOpenRound}
                                    disabled={openingRound}
                                >
                                    {openingRound ? 'Opening...' : '＋ Open Round'}
                                </button>
                            )}
                            {hasActiveRound && (
                                <span className={styles.badgeOpen}>Round active</span>
                            )}
                            {check && !check.isOpen && (
                                <span className={styles.badgeClosed}>Check closed</span>
                            )}
                        </div>
                    </div>

                    {rounds.length > 0 && (
                        <div className={styles.roundsList}>
                            <p className={styles.roundsTitle}>Rounds</p>
                            {[...rounds].reverse().map((round, index) => (
                                <AttendanceRoundCard
                                    key={round.id}
                                    round={round}
                                    users={users}
                                    defaultExpanded={index === 0}
                                    onDelete={null}
                                />
                            ))}
                        </div>
                    )}

                    {rounds.length === 0 && check && !detailLoading && (
                        <p className={styles.state}>No rounds yet — open one above.</p>
                    )}
                </div>
            )}
        </div>
    )
}
