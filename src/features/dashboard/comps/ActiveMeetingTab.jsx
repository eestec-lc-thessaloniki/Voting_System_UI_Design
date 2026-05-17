import { useEffect, useState } from 'react'
import { getActive } from '../../../services/MeetingApi'
import { getAll } from '../../../services/UsersApi'
import {
    openRound,
    closeRoundAndOpenVoting,
    deleteRound,
    getRoundsByCheckId,
} from '../../../services/AttendanceApi'
import useAuthStore from '../../../services/authStore'
import AttendanceRoundCard from './AttendanceRoundCard'
import MemberCheckInCard from './MemberCheckInCard'
import styles from './ActiveMeetingTab.module.css'

export default function ActiveMeetingTab() {
    const { user } = useAuthStore()
    const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.role)

    const [meeting, setMeeting] = useState(null)
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [roundsByPoll, setRoundsByPoll] = useState({})

    const [roundCreating, setRoundCreating] = useState({})
    const [votingOpening, setVotingOpening] = useState({})

    const fetchData = async () => {
        try {
            setError(null)
            const [activeMeeting, allUsers] = await Promise.all([
                getActive(),
                getAll(),
            ])
            setMeeting(activeMeeting)
            setUsers(allUsers)

            const polls = activeMeeting?.polls ?? []
            const roundsMap = {}
            await Promise.all(
                polls
                    .filter(p => p.attendanceCheckId)
                    .map(async p => {
                        try {
                            roundsMap[p.id] = await getRoundsByCheckId(p.attendanceCheckId)
                        } catch {
                            roundsMap[p.id] = []
                        }
                    })
            )
            setRoundsByPoll(roundsMap)
        } catch (err) {
            if (err?.response?.status === 404) {
                setMeeting(null)
            } else {
                setError('Failed to load meeting data.')
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleOpenRound = async (poll) => {
        if (!poll.attendanceCheckId) return
        setRoundCreating(prev => ({ ...prev, [poll.id]: true }))
        try {
            const newRound = await openRound(poll.attendanceCheckId, user.userId)
            setRoundsByPoll(prev => ({
                ...prev,
                [poll.id]: [...(prev[poll.id] ?? []), newRound]
            }))
        } catch (err) {
            console.error('Failed to open round', err)
        } finally {
            setRoundCreating(prev => ({ ...prev, [poll.id]: false }))
        }
    }

    const handleCloseRoundAndOpenVoting = async (poll, roundId) => {
        setVotingOpening(prev => ({ ...prev, [poll.id]: true }))
        try {
            await closeRoundAndOpenVoting(roundId, user.userId)
            await fetchData()
        } catch (err) {
            console.error('Failed to close round and open voting', err)
        } finally {
            setVotingOpening(prev => ({ ...prev, [poll.id]: false }))
        }
    }

    const handleDeleteRound = async (pollId, roundId) => {
        try {
            await deleteRound(roundId, user.userId)
            setRoundsByPoll(prev => ({
                ...prev,
                [pollId]: (prev[pollId] ?? []).filter(r => r.id !== roundId)
            }))
        } catch (err) {
            console.error('Failed to delete round', err)
        }
    }

    if (loading) return <p className={styles.state}>Loading...</p>
    if (error) return <p className={styles.stateError}>{error}</p>
    if (!meeting) return (
        <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <p>No active meeting right now.</p>
        </div>
    )

    const polls = meeting.polls ?? []
    const activePolls = polls.filter(p => p.isActive)

    return (
        <div className={styles.wrapper}>

            <div className={styles.meetingCard}>
                <div className={styles.meetingInfo}>
                    <span className={styles.meetingLabel}>Active Meeting</span>
                    <span className={styles.meetingTitle}>
                        {meeting.title ?? `Meeting #${meeting.id}`}
                    </span>
                </div>
            </div>

            {activePolls.length === 0 && (
                <div className={styles.emptyRounds}>
                    <p>
                        {isPrivileged
                            ? 'No active polls. Create one above.'
                            : 'Wait for a moderator to start a poll.'}
                    </p>
                </div>
            )}

            {activePolls.map(poll => {
                const rounds = roundsByPoll[poll.id] ?? []
                const activeRound = rounds.find(r => r.isActive)
                const votingOpen = poll.status === 'VOTING_OPEN'

                return (
                    <div key={poll.id} className={styles.pollSection}>
                        <div className={styles.pollHeader}>
                            <div>
                                <span className={styles.pollTitle}>{poll.title}</span>
                                <span className={`${styles.pollStatus} ${votingOpen ? styles.statusVoting : styles.statusPending}`}>
                                    {poll.status}
                                </span>
                            </div>

                            {isPrivileged && !votingOpen && (
                                <div className={styles.roundControls}>
                                    {poll.attendanceCheckId && !activeRound && (
                                        <button
                                            className={styles.btnAdd}
                                            onClick={() => handleOpenRound(poll)}
                                            disabled={roundCreating[poll.id]}
                                        >
                                            {roundCreating[poll.id] ? '...' : '＋ Open Round'}
                                        </button>
                                    )}
                                    {activeRound && (
                                        <button
                                            className={`${styles.btnAdd} ${styles.btnPrimary}`}
                                            onClick={() => handleCloseRoundAndOpenVoting(poll, activeRound.id)}
                                            disabled={votingOpening[poll.id]}
                                        >
                                            {votingOpening[poll.id] ? 'Opening...' : 'Close Round & Open Voting'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {rounds.length === 0 && (
                            <p className={styles.state}>
                                {isPrivileged
                                    ? 'No rounds yet — open a round to start check-in.'
                                    : 'Waiting for round to open...'}
                            </p>
                        )}
                        <div className={styles.rounds}>
                            {[...rounds].reverse().map((round, index) => (
                                isPrivileged ? (
                                    <AttendanceRoundCard
                                        key={round.id}
                                        round={round}
                                        users={users}
                                        pollId={poll.id}
                                        defaultExpanded={index === 0}
                                        onDelete={() => handleDeleteRound(poll.id, round.id)}
                                    />
                                ) : (
                                    round.isActive && (
                                        <MemberCheckInCard key={round.id} round={round} />
                                    )
                                )
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}