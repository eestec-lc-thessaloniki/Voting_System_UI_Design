import { useState } from 'react'
import { usePolls, useCreatePoll, useOpenPollVoting } from '../hooks/usePolls'
import { useHasVoted, useCastVote, useVoteCount, usePollOptions, useElectionResults, useStartNextRound } from '../hooks/useVoting'
import useAuthStore from '../services/authStore'
import { useDismissed } from '../hooks/useDismissed'
import styles from './PollsPage.module.css'

const MAJORITY_TYPES = ['ABSOLUTE', 'TWO_THIRDS', 'RELATIVE']

const STATUS_STYLES = {
    PENDING:                     { label: 'Pending',          className: 'badgeMuted' },
    VOTING_OPEN:                 { label: 'Voting Open',      className: 'badgeGreen' },
    REQUIRES_NEXT_ROUND:         { label: 'Next Round',       className: 'badgeGold' },
    WINNER_DECLARED:             { label: 'Winner',           className: 'badgeBlue' },
    TIE_REQUIRES_NEW_BOARD_VOTE: { label: 'Tie — Board Vote', className: 'badgeGold' },
}

const ROUND_LABELS = {
    FIRST_ROUND:  '1st Round',
    SECOND_ROUND: '2nd Round',
    THIRD_ROUND:  '3rd Round',
}

const VOTE_OPTIONS = ['FOR', 'AGAINST', 'BLANK']

// --- Poll Card ---
function PollCard({ poll, userId, userRole, onDismiss }) {
    const { user } = useAuthStore()
    const { data: hasVoted } = useHasVoted(userId, poll.id)
    const { data: voteCount } = useVoteCount(poll.id)
    const { data: options } = usePollOptions(poll.id)
    const { data: results } = useElectionResults(poll.id)
    const { mutate: castVote, isPending: voting, error: voteError } = useCastVote()
    const { mutate: openVoting, isPending: openingVoting } = useOpenPollVoting()
    const { mutate: startNextRound, isPending: startingNextRound } = useStartNextRound()

    const [expanded, setExpanded] = useState(false)
    const [selectedVoteType, setSelectedVoteType] = useState('FOR')
    const [_voted, setVoted] = useState(false)

    const alreadyVoted = hasVoted || _voted
    const isModeratorOrAdmin = userRole === 'MODERATOR' || userRole === 'ADMIN'
    const votingOpen = poll.status === 'VOTING_OPEN'
    const winnerDeclared = poll.status === 'WINNER_DECLARED'
    const requiresNextRound = results?.status === 'REQUIRES_NEXT_ROUND'
    const allVotesIn = voteCount != null && poll.electoralBodyCount && voteCount >= poll.electoralBodyCount
    const status = STATUS_STYLES[poll.status] ?? { label: poll.status, className: 'badgeMuted' }
    const firstOptionId = options?.[0]?.id

    const handleStartNextRound = () => {
        const nextRoundIds = options
            ?.filter(o => results?.nextRoundCandidates?.includes(o.optionText))
            .map(o => o.id) ?? []
        startNextRound({ pollId: poll.id, candidateIds: nextRoundIds, moderatorId: user.userId }, {
            onSuccess: () => setVoted(false),
        })
    }

    const handleVote = () => {
        if (!firstOptionId || alreadyVoted) return
        castVote({
            userId,
            pollId: poll.id,
            optionId: firstOptionId,
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
                    <span className={`${styles.badge} ${styles[status.className]}`}>{status.label}</span>
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>
                        {ROUND_LABELS[poll.currentRound] ?? poll.currentRound}
                    </span>
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>{poll.majorityType}</span>
                </div>
                <div className={styles.cardActions}>
                    <span className={styles.date}>{new Date(poll.createdAt).toLocaleDateString()}</span>
                    <button className={styles.dismissBtn} onClick={() => onDismiss(poll.id)}>✕</button>
                </div>
            </div>

            <h2 className={styles.cardTitle}>{poll.title}</h2>
            <p className={styles.cardContent}>{poll.description}</p>

            <div className={styles.cardFooter}>
                <span className={styles.meta}>📅 Meeting #{poll.meetingId}</span>
                <span className={styles.meta}>🗳 {voteCount ?? 0} / {poll.electoralBodyCount ?? '?'} votes</span>
            </div>

            {isModeratorOrAdmin && !votingOpen && !winnerDeclared && (
                <button
                    className={styles.expandBtn}
                    onClick={() => openVoting({ pollId: poll.id, moderatorId: user.userId })}
                    disabled={openingVoting}
                >
                    {openingVoting ? 'Opening...' : 'Open Voting'}
                </button>
            )}

            {votingOpen && !alreadyVoted && (
                <button className={styles.expandBtn} onClick={() => setExpanded(v => !v)}>
                    {expanded ? 'Hide Voting' : 'Cast Vote'}
                </button>
            )}

            {!votingOpen && poll.isActive && !isModeratorOrAdmin && (
                <p className={styles.notEligible}>⏳ Voting not open yet — attendance in progress.</p>
            )}

            {expanded && votingOpen && !alreadyVoted && (
                <div className={styles.votingPanel}>
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
                    <button
                        className={styles.submitVoteBtn}
                        onClick={handleVote}
                        disabled={!firstOptionId || voting}
                    >
                        {voting ? 'Submitting…' : !firstOptionId ? 'No candidates configured' : 'Submit Vote'}
                    </button>
                    {voteError && (
                        <p className={styles.notEligible}>
                            {voteError.response?.data?.message ?? voteError.message}
                        </p>
                    )}
                </div>
            )}

            {(alreadyVoted || winnerDeclared || (allVotesIn && requiresNextRound)) && results && (
                <div className={styles.votingPanel}>
                    {alreadyVoted && !winnerDeclared && !requiresNextRound && (
                        <p className={styles.alreadyVoted}>✓ You have voted. Current tally:</p>
                    )}
                    {requiresNextRound && allVotesIn && (
                        <p className={styles.alreadyVoted}>No majority — next round required.</p>
                    )}
                    <div className={styles.results}>
                        {results.candidates?.map((c, i) => (
                            <div key={i} className={styles.resultRow}>
                                <span className={styles.resultName}>{c.candidateName}</span>
                                <span className={styles.resultVotes}>
                                    FOR {c.forVotes} · AGAINST {c.againstVotes} · BLANK {c.blankVotes}
                                </span>
                            </div>
                        ))}
                    </div>
                    {results.winner && (
                        <p className={styles.winner}>Winner: {results.winner}</p>
                    )}
                    {isModeratorOrAdmin && requiresNextRound && allVotesIn && (
                        <button
                            className={styles.expandBtn}
                            onClick={handleStartNextRound}
                            disabled={startingNextRound}
                        >
                            {startingNextRound ? 'Starting...' : 'Start Next Round'}
                        </button>
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
        electoralBodyCount: '',
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
                electoralBodyCount: Number(form.electoralBodyCount),
                candidateNames: form.candidateNames.filter(n => n.trim() !== ''),
            }
        }, {
            onSuccess: () => {
                setForm({
                    title: '',
                    description: '',
                    meetingId: '',
                    majorityType: 'ABSOLUTE',
                    electoralBodyCount: '',
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

                        <div className={styles.row}>
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
                                <label className={styles.label}>Electoral Body Count</label>
                                <input
                                    className={styles.input}
                                    name="electoralBodyCount"
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 15"
                                    value={form.electoralBodyCount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
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
                                            >✕</button>
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
                        userRole={user?.role}
                        onDismiss={dismiss}
                    />
                ))}
            </div>
        </main>
    )
}