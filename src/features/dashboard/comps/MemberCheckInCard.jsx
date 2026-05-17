import { useState, useEffect } from 'react'
import { checkIn, checkOut, getRecordsByRound } from '../../../services/AttendanceApi'
import useAuthStore from '../../../services/authStore'
import styles from './MemberCheckInCard.module.css'

export default function MemberCheckInCard({ round }) {
    const { user } = useAuthStore()
    const [status, setStatus] = useState('loading') // 'loading' | 'absent' | 'in' | 'out'
    const [actionLoading, setActionLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetchStatus = async () => {
        try {
            const records = await getRecordsByRound(round.id)
            const mine = records.find(r => r.user?.id === user.userId)
            if (!mine) setStatus('absent')
            else if (mine.checkOutTime) setStatus('out')
            else setStatus('in')
        } catch {
            setStatus('absent')
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [round.id])

    const handleCheckIn = async () => {
        setActionLoading(true)
        setError(null)
        try {
            await checkIn({ roundId: round.id, userId: user.userId })
            setStatus('in')
        } catch (err) {
            if (err?.response?.status === 409) {
                setStatus('in')
            } else {
                setError('Check-in failed. Try again.')
            }
        } finally {
            setActionLoading(false)
        }
    }

    const handleCheckOut = async () => {
        setActionLoading(true)
        setError(null)
        try {
            await checkOut({ roundId: round.id, userId: user.userId })
            setStatus('out')
        } catch {
            setError('Check-out failed. Try again.')
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className={styles.card}>
            <div className={styles.inner}>
                <div className={styles.statusRow}>
                    <span className={styles.roundLabel}>Round {round.roundNumber}</span>
                    {status === 'loading' && <span className={styles.statusNeutral}>Loading...</span>}
                    {status === 'absent' && <span className={styles.statusAbsent}>Not checked in</span>}
                    {status === 'in'     && <span className={styles.statusIn}>✓ Present</span>}
                    {status === 'out'    && <span className={styles.statusOut}>Checked out</span>}
                </div>

                <div className={styles.actions}>
                    {status === 'absent' && (
                        <button
                            className={styles.btnIn}
                            onClick={handleCheckIn}
                            disabled={actionLoading}
                        >
                            {actionLoading ? '...' : 'Check In'}
                        </button>
                    )}
                    {status === 'in' && (
                        <button
                            className={styles.btnOut}
                            onClick={handleCheckOut}
                            disabled={actionLoading}
                        >
                            {actionLoading ? '...' : 'Check Out'}
                        </button>
                    )}
                    {status === 'out' && (
                        <span className={styles.doneNote}>Attendance recorded.</span>
                    )}
                </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}
        </div>
    )
}
