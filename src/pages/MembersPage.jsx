import { useState } from 'react'
import { useMemberships, useCommittees, useUserById } from '../hooks/useMembers'
import useAuthStore from '../services/AuthStore'
import styles from './MembersPage.module.css'

// Expanded member card — fetches full user record for extra fields
function MemberCard({ m, isPrivileged }) {
    const [expanded, setExpanded] = useState(false)
    const { data: fullUser } = useUserById(expanded ? m.userId : null)

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                    {m.firstName?.charAt(0).toUpperCase()}
                </div>
                <div className={styles.info}>
                    <h3 className={styles.name}>{m.firstName} {m.lastName}</h3>
                    <p className={styles.username}>@{m.username}</p>
                </div>
                <div className={styles.badges}>
                    <span className={styles.badge}>{m.committeeName}</span>
                    {isPrivileged && m.memberStatus && (
                        <span className={`${styles.badge} ${styles.badgeMuted}`}>
                            {m.memberStatus}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.cardFooter}>
                <div className={styles.footerItem}>
                    <span className={styles.footerLabel}>Role</span>
                    <span className={styles.footerValue}>{m.roleTitle}</span>
                </div>
                {m.discordTag && (
                    <div className={styles.footerItem}>
                        <span className={styles.footerLabel}>Discord</span>
                        <span className={styles.footerValue}>{m.discordTag}</span>
                    </div>
                )}
                <div className={styles.footerItem}>
                    <span className={styles.footerLabel}>Since</span>
                    <span className={styles.footerValue}>
                        {new Date(m.startDate).toLocaleDateString()}
                    </span>
                </div>
                {m.endDate && (
                    <div className={styles.footerItem}>
                        <span className={styles.footerLabel}>Until</span>
                        <span className={styles.footerValue}>
                            {new Date(m.endDate).toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>

            {/* Moderator/Admin only — expanded detail panel */}
            {isPrivileged && (
                <button
                    className={styles.expandBtn}
                    onClick={() => setExpanded(v => !v)}
                >
                    {expanded ? 'Hide Details ▲' : 'Show Details ▼'}
                </button>
            )}

            {expanded && isPrivileged && (
                <div className={styles.detailPanel}>
                    {fullUser ? (
                        <>
                            <div className={styles.detailGrid}>
                                {fullUser.userEmail && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.footerLabel}>Email</span>
                                        <span className={styles.footerValue}>{fullUser.userEmail}</span>
                                    </div>
                                )}
                                {fullUser.userPhoneNum && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.footerLabel}>Phone</span>
                                        <span className={styles.footerValue}>{fullUser.userPhoneNum}</span>
                                    </div>
                                )}
                                {fullUser.university && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.footerLabel}>University</span>
                                        <span className={styles.footerValue}>{fullUser.university}</span>
                                    </div>
                                )}
                                {fullUser.dateOfBirth && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.footerLabel}>Date of Birth</span>
                                        <span className={styles.footerValue}>
                                            {new Date(fullUser.dateOfBirth).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {fullUser.loginProperty && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.footerLabel}>System Role</span>
                                        <span className={`${styles.footerValue} ${styles.roleTag}`}>
                                            {fullUser.loginProperty}
                                        </span>
                                    </div>
                                )}
                                {fullUser.memberStatus && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.footerLabel}>Member Status</span>
                                        <span className={styles.footerValue}>{fullUser.memberStatus}</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className={styles.state}>Loading...</p>
                    )}
                </div>
            )}
        </div>
    )
}

export default function MembersPage() {
    const { user } = useAuthStore()
    const { data: memberships, isLoading: loadingMembers } = useMemberships()
    const { data: committees, isLoading: loadingCommittees } = useCommittees()
    const [activeCommittee, setActiveCommittee] = useState('All')

    const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.loginProperty)
    const isLoading = loadingMembers || loadingCommittees

    const filtered = activeCommittee === 'All'
        ? memberships
        : memberships?.filter(m => m.committeeName === activeCommittee)

    return (
        <main className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Members</h1>
                    <p className={styles.subtitle}>Browse members by committee</p>
                </div>
                {isPrivileged && (
                    <span className={styles.adminBadge}>
                        {user?.loginProperty} VIEW
                    </span>
                )}
            </div>

            <div className={styles.filters}>
                <button
                    className={`${styles.filterBtn} ${activeCommittee === 'All' ? styles.filterActive : ''}`}
                    onClick={() => setActiveCommittee('All')}
                >
                    All
                </button>
                {committees?.map(c => (
                    <button
                        key={c.committeeName}
                        className={`${styles.filterBtn} ${activeCommittee === c.committeeName ? styles.filterActive : ''}`}
                        onClick={() => setActiveCommittee(c.committeeName)}
                    >
                        {c.committeeName}
                    </button>
                ))}
            </div>

            {activeCommittee !== 'All' && (
                <div className={styles.mandateCard}>
                    <span className={styles.mandateLabel}>Mandate</span>
                    <p className={styles.mandateText}>
                        {committees?.find(c => c.committeeName === activeCommittee)?.mandate}
                    </p>
                </div>
            )}

            <div className={styles.grid}>
                {isLoading && <p className={styles.state}>Loading members...</p>}
                {!isLoading && filtered?.length === 0 && (
                    <p className={styles.state}>No members in this committee.</p>
                )}
                {filtered?.map(m => (
                    <MemberCard
                        key={m.membershipId}
                        m={m}
                        isPrivileged={isPrivileged}
                    />
                ))}
            </div>
        </main>
    )
}