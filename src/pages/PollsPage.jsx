import { useState } from 'react'
import { usePolls, useCreatePoll } from '../hooks/usePolls'
import { useHasVoted, useCastVote, useVoteCount, useElectionResults } from '../hooks/useVoting'
import {
    useCreateAttendanceCheck,
    useCloseAttendanceCheck,
    useOpenRound,
    useCloseRoundAndOpenVoting,
    useCheckIn,
    useCheckOut,
    useAttendanceSummary,
} from '../hooks/useAttendance'
import useAuthStore from '../services/AuthStore'
import { useDismissed } from '../hooks/useDismissed'
import styles from './PollsPage.module.css'

const MAJORITY_TYPES = ['ABSOLUTE', 'TWO_THIRDS', 'RELATIVE']

const STATUS_STYLES = {
    PENDING:                   { label: 'Pending',        className: 'badgeMuted' },
    VOTING_OPEN:               { label: 'Voting Open',    className: 'badgeGreen' },
    REQUIRES_NEXT_ROUND:       { label: 'Next Round',     className: 'badgeGold' },
    WINNER_DECLARED:           { label: 'Winner',         className: 'badgeBlue' },
    TIE_REQUIRES_NEW_BOARD_VOTE: { label: 'Tie — Board Vote', className: 'badgeGold' },
}

const ROUND_LABELS = {
    FIRST_ROUND:  '1st Round',
    SECOND_ROUND: '2nd Round',
    THIRD_ROUND:  '3rd Round',
}

const VOTE_OPTIONS = ['FOR', 'AGAINST', 'BLANK']

// --- Admin Controls Panel ---
// Drives the full attendance → voting lifecycle for a poll
function AdminControlsPanel({ poll }) {
    const [checkInUserId, setCheckInUserId] = useState('')
    const { data: summary } = useAttendanceSummary(poll.id)

    const { mutate: createCheck, isPending: creatingCheck } = useCreateAttendanceCheck()
    const { mutate: closeCheck, isPending: closingCheck } = useCloseAttendanceCheck()
    const { mutate: openRound, isPending: openingRound } = useOpenRound()
    const { mutate: closeRound, isPending: closingRound } = useCloseRoundAndOpenVoting()
    const { mutate: doCheckIn, isPending: checkingIn } = useCheckIn()
    const { mutate: doCheckOut, isPending: checkingOut } = useCheckOut()

    const checkId = poll.attendanceCheckId
    // Most recent active round from summary — adjust field name to match your API response
    const activeRound = summary?.activeRound
    const activeRoundId = activeRound?.id

    return (
        <div className={styles.adminPanel}>
            <p className={styles.adminPanelTitle}>⚙ Attendance Controls</p>

            <div className={styles.adminRow}>
                {/* Step 1 — create check if not started */}
                {!checkId && (
                    <button
                        className={styles.adminBtn}
                        onClick={() => createCheck(poll.id)}
                        disabled={creatingCheck}
                    >
                        {creatingCheck ? 'Starting...' : 'Begin Attendance'}
                    </button>
                )}

                {/* Step 2 — open a round */}
                {checkId && !activeRoundId && poll.status === 'PENDING' && (
                    <button
                        className={styles.adminBtn}
                        onClick={() => openRound(checkId)}
                        disabled={openingRound}
                    >
                        {openingRound ? 'Opening...' : 'Open Round'}
                    </button>
                )}

                {/* Step 3 — close round and open voting (the key trigger) */}
                {activeRoundId && (
                    <button
                        className={`${styles.adminBtn} ${styles.adminBtnPrimary}`}
                        onClick={() => closeRound(activeRoundId)}
                        disabled={closingRound}
                    >
                        {closingRound ? 'Opening Voting...' : 'Close Round & Open Voting'}
                    </button>
                )}

                {/* Close check permanently */}
                {checkId && poll.status !== 'PENDING' && (
                    <button
                        className={`${styles.adminBtn} ${styles.adminBtnDanger}`}
                        onClick={() => closeCheck(checkId)}
                        disabled={closingCheck}
                    >
                        {closingCheck ? 'Closing...' : 'End Check'}
                    </button>
                )}
            </div>

            {/* Check-in a user by ID — only during an active round */}
            {activeRoundId && (
                <div className={styles.checkInRow}>
                    <input
                        className={styles.input}
                        type="number"
                        placeholder="User ID to check in"
                        value={checkInUserId}
                        onChange={e => setCheckInUserId(e.target.value)}
                    />
                    <button
                        className={styles.adminBtn}
                        onClick={() => doCheckIn({ roundId: activeRoundId, userId: Number(checkInUserId), pollId: poll.id })}
                        disabled={!checkInUserId || checkingIn}
                    >
                        {checkingIn ? 'Checking in...' : 'Check In'}
                    </button>
                </div>
            )}

            {/* Attendance summary */}
            {summary && (
                <div className={styles.summaryRow}>
                    <span className={styles.summaryItem}>
                        ✅ Present: {summary.activeCount ?? 0}
                    </span>
                    <span className={styles.summaryItem}>
                        📋 Total checked: {summary.totalCheckedIn ?? 0}
                    </span>
                    <span className={styles.summaryItem}>
                        🗳 Electoral body: {poll.electoralBodyCount ?? '—'}
                    </span>
                </div>
            )}
        </div>
    )
}

// --- Poll Card ---
function PollCard({ poll, userId, userRole, onDismiss }) {
    const { data: hasVoted } = useHasVoted(userId, poll.id)
    const { data: voteCount } = useVoteCount(poll.id)
    const { data: results } = useElectionResults(poll.id)
    const { mutate: castVote, isPending: voting } = useCastVote()

    const [expanded, setExpanded] = useState(false)
    const [selectedOption, setSelectedOption] = useState(null)
    const [selectedVoteType, setSelectedVoteType] = useState('FOR')
    const [_voted, setVoted] = useState(false)

    const alreadyVoted = hasVoted || _voted
    const isModeratorOrAdmin = userRole === 'MODERATOR' || userRole === 'ADMIN'

    // Gate: voting UI only shown when poll is explicitly VOTING_OPEN
    const votingOpen = poll.status === 'VOTING_OPEN'

    const status = STATUS_STYLES[poll.status] ?? { label: poll.status, className: 'badgeMuted' }

    const handleVote = () => {
        if (!selectedOption || alreadyVoted) return
        castVote({
            userId,
            pollId: poll.id,
            optionId: selectedOption,
            voteOption: selectedVoteType,
        }, {
            onSuccess: () => {
                setVoted(true)
                setExpanded(false)
            }
        })
    }

    return (
        <div className={styles.card}>
            <div className={styles.cardTop}>
                <div className={styles.badges}>
                    <span className={`${styles.badge} ${styles[status.className]}`}>
                        {status.label}
                    </span>
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>
                        {ROUND_LABELS[poll.currentRound] ?? poll.currentRound}
                    </span>
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>
                        {poll.majorityType}
                    </span>
                </div>
                <div className={styles.cardActions}>
                    <span className={styles.date}>
                        {new Date(poll.createdAt).toLocaleDateString()}
                    </span>
                    <button className={styles.dismissBtn} onClick={() => onDismiss(poll.id)}>✕</button>
                </div>
            </div>

            <h2 className={styles.cardTitle}>{poll.title}</h2>
            <p className={styles.cardContent}>{poll.description}</p>

            <div className={styles.cardFooter}>
                <span className={styles.meta}>
                    📅 Meeting #{poll.meetingId}
                </span>
                <span className={styles.meta}>
                    🗳 {voteCount ?? 0} / {poll.electoralBodyCount ?? '?'} votes
                </span>
            </div>

            {/* Admin controls — full lifecycle panel */}
            {isModeratorOrAdmin && (
                <AdminControlsPanel poll={poll} />
            )}

            {/* Vote button — only when VOTING_OPEN */}
            {votingOpen && !alreadyVoted && (
                <button
                    className={styles.expandBtn}
                    onClick={() => setExpanded(v => !v)}
                >
                    {expanded ? 'Hide Voting' : 'Cast Vote'}
                </button>
            )}

            {/* Not eligible message — poll active but not VOTING_OPEN */}
            {!votingOpen && poll.isActive && !isModeratorOrAdmin && (
                <p className={styles.notEligible}>
                    ⏳ Voting not open yet — attendance in progress.
                </p>
            )}

            {/* Voting panel */}
            {expanded && votingOpen && !alreadyVoted && poll.options?.length > 0 && (
                <div className={styles.votingPanel}>
                    <div className={styles.votingSection}>
                        <p className={styles.votingLabel}>Select Candidate</p>
                        <div className={styles.optionsList}>
                            {poll.options.map(opt => (
                                <button
                                    key={opt.id}
                                    className={`${styles.optionBtn} ${selectedOption === opt.id ? styles.optionSelected : ''}`}
                                    onClick={() => setSelectedOption(opt.id)}
                                >
                                    {opt.optionText}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.votingSection}>
                        <p className={styles.votingLabel}>Vote Type</p>
                        <div className={styles.voteTypeRow}>
                            {VOTE_OPTIONS.map(v => (
                                <button
                                    key={v}
                                    className={`${styles.voteTypeBtn} ${selectedVoteType === v ? styles.voteTypeSelected : ''}`}
                                    onClick={() => setSelectedVoteType(v)}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className={styles.submitVoteBtn}
                        onClick={handleVote}
                        disabled={!selectedOption || voting}
                    >
                        {voting ? 'Submitting...' : 'Submit Vote'}
                    </button>
                </div>
            )}

            {expanded && votingOpen && !alreadyVoted && poll.options?.length === 0 && (
                <div className={styles.votingPanel}>
                    <p className={styles.alreadyVoted}>No candidates available for this poll.</p>
                </div>
            )}

            {alreadyVoted && (
                <div className={styles.votingPanel}>
                    <p className={styles.alreadyVoted}>✓ You have already voted in this poll.</p>
                    {results && (
                        <div className={styles.results}>
                            <p className={styles.votingLabel}>Current Results</p>
                            {results.candidates?.map((c, i) => (
                                <div key={i} className={styles.resultRow}>
                                    <span className={styles.resultName}>{c.candidateName}</span>
                                    <span className={styles.resultVotes}>{c.forVotes} votes</span>
                                </div>
                            ))}
                            {results.winner && (
                                <p className={styles.winner}>🏆 Winner: {results.winner}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// --- Polls Page ---
export default function PollsPage() {
    const { user } = useAuthStore()
    const { data: polls, isLoading } = usePolls()
    const { mutate: createPoll, isPending, isError, error } = useCreatePoll()
    const { dismiss, isVisible } = useDismissed()

    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        title: '',
        description: '',
        meetingId: '',
        majorityType: 'ABSOLUTE',
        candidateNames: [''],
    })

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleCandidateChange = (index, value) => {
        const updated = [...form.candidateNames]
        updated[index] = value
        setForm({ ...form, candidateNames: updated })
    }

    const addCandidate = () =>
        setForm({ ...form, candidateNames: [...form.candidateNames, ''] })

    const removeCandidate = (index) => {
        const updated = form.candidateNames.filter((_, i) => i !== index)
        setForm({ ...form, candidateNames: updated })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        createPoll({
            moderatorId: user.userId,
            pollData: {
                ...form,
                meetingId: Number(form.meetingId),
                // electoralBodyCount removed — auto-calculated when round closes
                candidateNames: form.candidateNames.filter(n => n.trim() !== ''),
            }
        }, {
            onSuccess: () => {
                setForm({
                    title: '',
                    description: '',
                    meetingId: '',
                    majorityType: 'ABSOLUTE',
                    candidateNames: [''],
                })
                setShowForm(false)
            }
        })
    }

    return (
        <main className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Polls</h1>
                    <p className={styles.subtitle}>Manage and create voting polls</p>
                </div>
                <button className={styles.createBtn} onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Cancel' : '+ New Poll'}
                </button>
            </div>

            {showForm && (
                <div className={styles.formCard}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label className={styles.label}>Title</label>
                                <input
                                    className={styles.input}
                                    name="title"
                                    placeholder="Poll title"
                                    value={form.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Meeting ID</label>
                                <input
                                    className={styles.input}
                                    name="meetingId"
                                    type="number"
                                    placeholder="e.g. 1"
                                    value={form.meetingId}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                name="description"
                                placeholder="What is this poll about?"
                                value={form.description}
                                onChange={handleChange}
                                rows={3}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Majority Type</label>
                            <select
                                className={styles.select}
                                name="majorityType"
                                value={form.majorityType}
                                onChange={handleChange}
                            >
                                {MAJORITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Candidates</label>
                            <div className={styles.candidateList}>
                                {form.candidateNames.map((name, index) => (
                                    <div key={index} className={styles.candidateRow}>
                                        <input
                                            className={styles.input}
                                            placeholder={`Candidate ${index + 1}`}
                                            value={name}
                                            onChange={(e) => handleCandidateChange(index, e.target.value)}
                                        />
                                        {form.candidateNames.length > 1 && (
                                            <button
                                                type="button"
                                                className={styles.removeBtn}
                                                onClick={() => removeCandidate(index)}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" className={styles.addBtn} onClick={addCandidate}>
                                    + Add Candidate
                                </button>
                            </div>
                        </div>

                        <div className={styles.formFooter}>
                            {isError && (
                                <span className={styles.error}>
                                    {error?.response?.data || 'Something went wrong'}
                                </span>
                            )}
                            <button type="submit" className={styles.submitBtn} disabled={isPending}>
                                {isPending ? 'Creating...' : 'Create Poll'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className={styles.list}>
                {isLoading && <p className={styles.state}>Loading polls...</p>}
                {!isLoading && Array.isArray(polls) && polls.filter(p => isVisible(p.id)).length === 0 && (
                    <p className={styles.state}>No polls yet.</p>
                )}
                {Array.isArray(polls) && polls.filter(p => isVisible(p.id)).map(poll => (
                    <PollCard
                        key={poll.id}
                        poll={poll}
                        userId={user?.userId}
                        userRole={user?.loginProperty}
                        onDismiss={dismiss}
                    />
                ))}
            </div>
        </main>
    )
}