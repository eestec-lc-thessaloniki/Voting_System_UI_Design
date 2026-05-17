import { useEffect, useState } from 'react'
import { getRecordsByRound, checkIn, checkOut } from '../../../services/AttendanceApi.js'
import useAuthStore from '../../../services/authStore'
import styles from './AttendanceRoundCard.module.css'

export default function AttendanceRoundCard({ round, users, defaultExpanded, onDelete, onClose, closingRound }) {
    const { user } = useAuthStore()

    const [expanded, setExpanded]         = useState(defaultExpanded)
    const [records, setRecords]           = useState([])
    const [actionLoading, setActionLoading] = useState(null)
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [search, setSearch]             = useState('')

    const fetchRecords = async () => {
        setLoadingRecords(true)
        try {
            const data = await getRecordsByRound(round.id)
            setRecords(data)
        } catch (err) {
            console.error('Failed to fetch round records', err)
        } finally {
            setLoadingRecords(false)
        }
    }

    useEffect(() => {
        if (expanded) fetchRecords()
    }, [expanded])

    const getStatus = (userId) => {
        const found = records.find(r => r.user?.id === userId)
        if (!found) return 'absent'
        if (found.checkOutTime) return 'out'
        return 'in'
    }

    const handleCheckIn = async (targetUserId) => {
        setActionLoading(targetUserId + '_in')
        try {
            await checkIn({ roundId: round.id, userId: targetUserId, moderatorId: user.userId })
            await fetchRecords()
        } catch (err) {
            if (err?.response?.status === 409) {
                alert('User is already checked in for this round.')
            } else {
                console.error('Check-in failed:', err)
            }
        } finally {
            setActionLoading(null)
        }
    }

    const handleCheckOut = async (targetUserId) => {
        setActionLoading(targetUserId + '_out')
        try {
            await checkOut({ roundId: round.id, userId: targetUserId, moderatorId: user.userId })
            await fetchRecords()
        } catch (err) {
            console.error('Check-out failed:', err)
        } finally {
            setActionLoading(null)
        }
    }

    const checkedInCount = records.filter(r => !r.checkOutTime).length

    const filteredMembers = search.trim()
        ? users.filter(m => {
            const q = search.toLowerCase()
            return (
                m.username?.toLowerCase().includes(q) ||
                `${m.firstName ?? ''} ${m.lastName ?? ''}`.toLowerCase().includes(q)
            )
        })
        : users

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <button
                    className={styles.headerToggle}
                    onClick={() => setExpanded(e => !e)}
                >
                    <span className={styles.roundLabel}>Round {round.roundNumber}</span>
                    <span className={styles.roundMeta}>
                        {checkedInCount} / {users.length} present
                    </span>
                    <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
                </button>
                {onClose && (
                    <button
                        className={styles.btnClose}
                        onClick={onClose}
                        disabled={closingRound}
                        title="Close round"
                    >
                        {closingRound ? '…' : 'Close Round'}
                    </button>
                )}
                {onDelete && (
                    <button
                        className={styles.btnDelete}
                        onClick={onDelete}
                        title="Delete round"
                    >
                        ✕
                    </button>
                )}
            </div>

            {expanded && (
                <div className={styles.body}>
                    <input
                        className={styles.searchBar}
                        type="text"
                        placeholder="Search by name or username…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />

                    {loadingRecords ? (
                        <p className={styles.state}>Loading…</p>
                    ) : filteredMembers.length === 0 ? (
                        <p className={styles.state}>No members match.</p>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMembers.map(member => {
                                        const status = getStatus(member.id)
                                        const loadingIn  = actionLoading === member.id + '_in'
                                        const loadingOut = actionLoading === member.id + '_out'
                                        return (
                                            <tr
                                                key={member.id}
                                                className={status === 'absent' ? styles.rowAbsent : ''}
                                            >
                                                <td>
                                                    <div className={styles.nameCell}>
                                                        <span className={styles.name}>
                                                            {member.firstName && member.lastName
                                                                ? `${member.firstName} ${member.lastName}`
                                                                : member.username}
                                                        </span>
                                                        <span className={styles.username}>@{member.username}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.status} ${styles[`status_${status}`]}`}>
                                                        {status === 'in'     ? 'Present'
                                                         : status === 'out'  ? 'Checked Out'
                                                         : 'Absent'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.actions}>
                                                        <button
                                                            className={styles.btnIn}
                                                            disabled={status !== 'absent' || actionLoading !== null}
                                                            onClick={() => handleCheckIn(member.id)}
                                                        >
                                                            {loadingIn ? 'Checking in…' : 'Check In'}
                                                        </button>
                                                        <button
                                                            className={styles.btnOut}
                                                            disabled={status !== 'in' || actionLoading !== null}
                                                            onClick={() => handleCheckOut(member.id)}
                                                        >
                                                            {loadingOut ? 'Checking out…' : 'Check Out'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}