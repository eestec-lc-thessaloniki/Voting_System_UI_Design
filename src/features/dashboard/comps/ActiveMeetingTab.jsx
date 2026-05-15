import { useEffect, useState } from 'react'
import { getActive } from '../../../services/MeetingApi'
import { getAll } from '../../../services/UsersApi'
import {
    createAttendanceCheck,
    openRound,
    closeRoundAndOpenVoting,
    deleteRound,
    getRecordsByRound,
} from '../../../services/AttendanceApi'
import { createPoll } from '../../../services/PollsApi'
import useAuthStore from '../../../services/AuthStore'
import AttendanceRoundCard from './AttendanceRoundCard'
import styles from './ActiveMeetingTab.module.css'

const MAJORITY_TYPES = ['ABSOLUTE', 'TWO_THIRDS', 'RELATIVE']

// One poll drives one attendance check drives N rounds
// Admin/Moderator creates poll → attendance check auto-starts → rounds managed here

export default function ActiveMeetingTab() {
    const { user } = useAuthStore()
    const [meeting, setMeeting] = useState(null)
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Per-poll round state: { [pollId]: Round[] }
    const [roundsByPoll, setRoundsByPoll] = useState({})

    // Create poll form
    const [showPollForm, setShowPollForm] = useState(false)
    const [pollForm, setPollForm] = useState({
        title: '',
        description: '',
        majorityType: 'ABSOLUTE',
        candidateNames: [''],
    })
    const [creatingPoll, setCreatingPoll] = useState(false)

    // Per-poll action loading
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

    // --- Poll creation ---
    // Creates poll + immediately creates attendance check for it
    const handleCreatePoll = async (e) => {
        e.preventDefault()
        if (!meeting) return
        setCreatingPoll(true)
        try {
            const newPoll = await createPoll({
                moderatorId: user.userId,
                pollData: {
                    ...pollForm,
                    meetingId: meeting.id,
                    candidateNames: pollForm.candidateNames.filter(n => n.trim() !== ''),
                }
            })
            // Auto-start attendance check for the new poll
            await createAttendanceCheck(newPoll.id)
            // Refresh meeting to pick up new poll
            await fetchData()
            setShowPollForm(false)
            setPollForm({ title: '', description: '', majorityType: 'ABSOLUTE', candidateNames: [''] })
        } catch (err) {
            console.error('Failed to create poll or attendance check', err)
        } finally {
            setCreatingPoll(false)
        }
    }

    // --- Round management ---
    const handleOpenRound = async (poll) => {
        if (!poll.attendanceCheckId) return
        setRoundCreating(prev => ({ ...prev, [poll.id]: true }))
        try {
            const newRound = await openRound(poll.attendanceCheckId)
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
            await closeRoundAndOpenVoting(roundId)
            // Poll status flips to VOTING_OPEN — refresh meeting
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

    // Candidate management
    const handleCandidateChange = (index, value) => {
        const updated = [...pollForm.candidateNames]
        updated[index] = value
        setPollForm({ ...pollForm, candidateNames: updated })
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
    const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.loginProperty)

    return (
        <div className={styles.wrapper}>

            {/* Meeting header */}
            <div className={styles.meetingCard}>
                <div className={styles.meetingInfo}>
                    <span className={styles.meetingLabel}>Active Meeting</span>
                    <span className={styles.meetingTitle}>
                        {meeting.title ?? `Meeting #${meeting.id}`}
                    </span>
                </div>
                {isPrivileged && (
                    <button
                        className={styles.btnAdd}
                        onClick={() => setShowPollForm(v => !v)}
                    >
                        {showPollForm ? 'Cancel' : '＋ New Poll'}
                    </button>
                )}
            </div>

            {/* Create poll form */}
            {showPollForm && isPrivileged && (
                <div className={styles.formCard}>
                    <form onSubmit={handleCreatePoll} className={styles.form}>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label className={styles.label}>Title</label>
                                <input
                                    className={styles.input}
                                    placeholder="Poll title"
                                    value={pollForm.title}
                                    onChange={e => setPollForm({ ...pollForm, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Majority Type</label>
                                <select
                                    className={styles.select}
                                    value={pollForm.majorityType}
                                    onChange={e => setPollForm({ ...pollForm, majorityType: e.target.value })}
                                >
                                    {MAJORITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="What is this poll about?"
                                value={pollForm.description}
                                onChange={e => setPollForm({ ...pollForm, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Candidates</label>
                            <div className={styles.candidateList}>
                                {pollForm.candidateNames.map((name, index) => (
                                    <div key={index} className={styles.candidateRow}>
                                        <input
                                            className={styles.input}
                                            placeholder={`Candidate ${index + 1}`}
                                            value={name}
                                            onChange={e => handleCandidateChange(index, e.target.value)}
                                        />
                                        {pollForm.candidateNames.length > 1 && (
                                            <button
                                                type="button"
                                                className={styles.removeBtn}
                                                onClick={() => setPollForm({
                                                    ...pollForm,
                                                    candidateNames: pollForm.candidateNames.filter((_, i) => i !== index)
                                                })}
                                            >✕</button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className={styles.addBtn}
                                    onClick={() => setPollForm({ ...pollForm, candidateNames: [...pollForm.candidateNames, ''] })}
                                >
                                    + Add Candidate
                                </button>
                            </div>
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={creatingPoll}>
                            {creatingPoll ? 'Creating...' : 'Create Poll & Start Attendance'}
                        </button>
                    </form>
                </div>
            )}

            {/* No active polls */}
            {activePolls.length === 0 && (
                <div className={styles.emptyRounds}>
                    <p>No active polls. {isPrivileged ? 'Create one above.' : 'Wait for a moderator to start a poll.'}</p>
                </div>
            )}

            {/* One section per active poll */}
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

                            {/* Round controls — admin/moderator only */}
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

                        {/* Rounds */}
                        {rounds.length === 0 && (
                            <p className={styles.state}>
                                {isPrivileged ? 'No rounds yet — open a round to start check-in.' : 'Waiting for round to open...'}
                            </p>
                        )}
                        <div className={styles.rounds}>
                            {[...rounds].reverse().map((round, index) => (
                                <AttendanceRoundCard
                                    key={round.id}
                                    round={round}
                                    users={users}
                                    pollId={poll.id}
                                    defaultExpanded={index === 0}
                                    onDelete={isPrivileged
                                        ? () => handleDeleteRound(poll.id, round.id)
                                        : null
                                    }
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
