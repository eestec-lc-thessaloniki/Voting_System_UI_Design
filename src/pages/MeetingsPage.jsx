import { useState, useEffect } from 'react'
import { getAll, createMeeting, deleteMeeting } from '../services/MeetingApi'
import { useAuth } from '../hooks/useAuth'
import styles from './MeetingsPage.module.css'

export default function MeetingsPage() {
    const { user, isPrivileged, isAdmin } = useAuth()

    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Create form state
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({ meetingDate: '', quorumRequired: '' })
    const [formError, setFormError] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    // Delete state
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        fetchMeetings()
    }, [])

    const fetchMeetings = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getAll()
            // Sort: most recent first
            const sorted = [...data].sort(
                (a, b) => new Date(b.meetingDate) - new Date(a.meetingDate)
            )
            setMeetings(sorted)
        } catch (err) {
            setError('Failed to load meetings.')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setFormError(null)

        if (!formData.meetingDate || !formData.quorumRequired) {
            setFormError('All fields are required.')
            return
        }

        const quorumNum = parseInt(formData.quorumRequired, 10)
        if (isNaN(quorumNum) || quorumNum < 1) {
            setFormError('Quorum must be a positive integer.')
            return
        }

        try {
            setSubmitting(true)
            const payload = {
                meetingDate: formData.meetingDate,
                quorumRequired: String(quorumNum),
            }
            await createMeeting(payload, user.id)
            setFormData({ meetingDate: '', quorumRequired: '' })
            setShowForm(false)
            await fetchMeetings()
        } catch (err) {
            setFormError(err?.response?.data || 'Failed to create meeting.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (meetingId) => {
        if (!window.confirm('Delete this meeting? This will also remove all associated polls.')) return
        try {
            setDeletingId(meetingId)
            await deleteMeeting(meetingId, user.id)
            setMeetings((prev) => prev.filter((m) => m.id !== meetingId))
        } catch (err) {
            alert(err?.response?.data || 'Failed to delete meeting.')
        } finally {
            setDeletingId(null)
        }
    }

    const formatDate = (raw) => {
        if (!raw) return '—'
        const d = new Date(raw)
        return d.toLocaleDateString('el-GR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>General Meetings</h1>
                    <p className={styles.subtitle}>
                        {meetings.length} meeting{meetings.length !== 1 ? 's' : ''} recorded
                    </p>
                </div>
                {isPrivileged && (
                    <button
                        className={styles.btnPrimary}
                        onClick={() => setShowForm((v) => !v)}
                    >
                        {showForm ? '✕ Cancel' : '+ New Meeting'}
                    </button>
                )}
            </div>

            {/* Create Form */}
            {showForm && (
                <div className={styles.formCard}>
                    <h2 className={styles.formTitle}>Create Meeting</h2>
                    {formError && <p className={styles.formError}>{formError}</p>}
                    <form onSubmit={handleCreate} className={styles.form}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="meetingDate">
                                Meeting Date
                            </label>
                            <input
                                id="meetingDate"
                                type="date"
                                className={styles.input}
                                value={formData.meetingDate}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, meetingDate: e.target.value }))
                                }
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="quorumRequired">
                                Quorum Required (min. members)
                            </label>
                            <input
                                id="quorumRequired"
                                type="number"
                                min="1"
                                className={styles.input}
                                placeholder="e.g. 15"
                                value={formData.quorumRequired}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, quorumRequired: e.target.value }))
                                }
                            />
                        </div>
                        <div className={styles.formActions}>
                            <button
                                type="submit"
                                className={styles.btnPrimary}
                                disabled={submitting}
                            >
                                {submitting ? 'Creating…' : 'Create Meeting'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Content */}
            {loading && <p className={styles.stateMsg}>Loading meetings…</p>}
            {!loading && error && <p className={styles.stateError}>{error}</p>}
            {!loading && !error && meetings.length === 0 && (
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📋</span>
                    <p>No meetings yet.</p>
                    {isPrivileged && (
                        <p className={styles.emptyHint}>Use "+ New Meeting" to create one.</p>
                    )}
                </div>
            )}

            {!loading && !error && meetings.length > 0 && (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th className={styles.th}>#</th>
                            <th className={styles.th}>Date</th>
                            <th className={styles.th}>Quorum</th>
                            {isAdmin && <th className={styles.th}>Actions</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {meetings.map((m, idx) => (
                            <tr key={m.id} className={styles.tr}>
                                <td className={styles.td}>{idx + 1}</td>
                                <td className={styles.td}>
                                        <span className={styles.dateCell}>
                                            📅 {formatDate(m.meetingDate)}
                                        </span>
                                </td>
                                <td className={styles.td}>
                                        <span className={styles.quorumBadge}>
                                            {m.quorumRequired} members
                                        </span>
                                </td>
                                {isAdmin && (
                                    <td className={styles.td}>
                                        <button
                                            className={styles.btnDanger}
                                            disabled={deletingId === m.id}
                                            onClick={() => handleDelete(m.id)}
                                        >
                                            {deletingId === m.id ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}