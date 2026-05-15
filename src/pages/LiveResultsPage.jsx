import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLiveResults } from '../hooks/useLiveResults'
import { usePolls } from '../hooks/usePolls'
import styles from './LiveResultsPage.module.css'

// --- Helpers ---

function pct(part, total) {
    if (!total || total === 0) return 0
    return Math.min(100, Math.round((part / total) * 100))
}

function QuorumBar({ votes, quorum }) {
    const reached = quorum > 0 && votes >= quorum
    const progress = pct(votes, quorum)

    return (
        <div className={styles.quorumSection}>
            <div className={styles.quorumHeader}>
                <span className={styles.quorumLabel}>Quorum Progress</span>
                <span className={`${styles.quorumCount} ${reached ? styles.quorumReached : ''}`}>
                    {votes} / {quorum > 0 ? quorum : '—'}
                </span>
            </div>
            <div className={styles.quorumTrack}>
                <div
                    className={`${styles.quorumFill} ${reached ? styles.quorumFillReached : ''}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
                {/* Quorum threshold marker at 100% — visual boundary */}
                <div className={styles.quorumMarker} />
            </div>
            {reached && (
                <p className={styles.quorumReachedMsg}>✓ Quorum reached</p>
            )}
        </div>
    )
}

function CandidateRow({ candidate, totalVotes, rank }) {
    const { candidateName, forVotes = 0, againstVotes = 0, blankVotes = 0 } = candidate
    const candidateTotal = forVotes + againstVotes + blankVotes
    const forPct   = pct(forVotes, candidateTotal)
    const againstPct = pct(againstVotes, candidateTotal)
    const blankPct = pct(blankVotes, candidateTotal)

    return (
        <div className={`${styles.candidateCard} ${rank === 1 ? styles.candidateLeader : ''}`}>
            <div className={styles.candidateHeader}>
                {rank === 1 && <span className={styles.leadBadge}>LEADING</span>}
                <span className={styles.candidateName}>{candidateName}</span>
                <span className={styles.candidateTotal}>{candidateTotal} votes</span>
            </div>

            <div className={styles.voteBreakdown}>
                {/* FOR */}
                <div className={styles.voteRow}>
                    <span className={styles.voteLabel}>FOR</span>
                    <div className={styles.barTrack}>
                        <div className={styles.barFillFor} style={{ width: `${forPct}%` }} />
                    </div>
                    <span className={styles.voteNum}>{forVotes} <em>({forPct}%)</em></span>
                </div>
                {/* AGAINST */}
                <div className={styles.voteRow}>
                    <span className={styles.voteLabel}>AGAINST</span>
                    <div className={styles.barTrack}>
                        <div className={styles.barFillAgainst} style={{ width: `${againstPct}%` }} />
                    </div>
                    <span className={styles.voteNum}>{againstVotes} <em>({againstPct}%)</em></span>
                </div>
                {/* BLANK */}
                <div className={styles.voteRow}>
                    <span className={styles.voteLabel}>BLANK</span>
                    <div className={styles.barTrack}>
                        <div className={styles.barFillBlank} style={{ width: `${blankPct}%` }} />
                    </div>
                    <span className={styles.voteNum}>{blankVotes} <em>({blankPct}%)</em></span>
                </div>
            </div>
        </div>
    )
}

// Sort candidates by FOR votes descending to assign rank
function rankCandidates(candidates) {
    if (!candidates?.length) return []
    return [...candidates]
        .sort((a, b) => (b.forVotes ?? 0) - (a.forVotes ?? 0))
        .map((c, i) => ({ ...c, rank: i + 1 }))
}

// --- Page ---

export default function LiveResultsPage() {
    const { pollId } = useParams()
    const navigate   = useNavigate()
    const { data: polls } = usePolls()

    // Find poll from cache — no extra request
    const poll = polls?.find(p => String(p.id) === String(pollId))
    const isVotingOpen = poll?.status === 'VOTING_OPEN'

    const { results, totalVotes, connected, error } = useLiveResults(pollId, isVotingOpen)

    // Auto-disconnect message when voting closes
    const [closedMsg, setClosedMsg] = useState(false)
    useEffect(() => {
        if (poll && !isVotingOpen && poll.status !== undefined) {
            setClosedMsg(true)
        }
    }, [isVotingOpen, poll])

    const ranked     = rankCandidates(results?.candidates)
    const quorum     = results?.electoralBodyCount ?? poll?.electoralBodyCount ?? 0
    const winner     = results?.winner

    return (
        <main className={styles.page}>

            {/* Top bar */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <div className={styles.topBarCenter}>
                    <span className={styles.pageLabel}>Live Results</span>
                    <span className={styles.pollTitle}>{poll?.title ?? `Poll #${pollId}`}</span>
                </div>
                <div className={styles.connStatus}>
                    <span className={`${styles.connDot} ${connected ? styles.connAlive : styles.connDead}`} />
                    <span className={styles.connLabel}>{connected ? 'Live' : 'Disconnected'}</span>
                </div>
            </div>

            {/* Voting closed banner */}
            {closedMsg && (
                <div className={styles.closedBanner}>
                    ⚑ Voting has closed — showing final results
                </div>
            )}

            {/* SSE error */}
            {error && !closedMsg && (
                <div className={styles.errorBanner}>{error}</div>
            )}

            {/* No data yet */}
            {!results && !error && isVotingOpen && (
                <div className={styles.waitingState}>
                    <div className={styles.pulse} />
                    <p>Waiting for votes...</p>
                </div>
            )}

            {/* Poll not found or not started */}
            {!isVotingOpen && !closedMsg && (
                <div className={styles.waitingState}>
                    <p>Voting is not open for this poll yet.</p>
                </div>
            )}

            {results && (
                <div className={styles.content}>

                    {/* Winner banner */}
                    {winner && (
                        <div className={styles.winnerBanner}>
                            🏆 Winner: <strong>{winner}</strong>
                        </div>
                    )}

                    {/* Quorum progress */}
                    <QuorumBar votes={totalVotes} quorum={quorum} />

                    {/* Total vote counter */}
                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Total Votes Cast</span>
                        <span className={styles.totalCount}>{totalVotes}</span>
                    </div>

                    {/* Candidate breakdown */}
                    <div className={styles.candidates}>
                        {ranked.map(c => (
                            <CandidateRow
                                key={c.candidateName}
                                candidate={c}
                                totalVotes={totalVotes}
                                rank={c.rank}
                            />
                        ))}
                    </div>

                </div>
            )}
        </main>
    )
}