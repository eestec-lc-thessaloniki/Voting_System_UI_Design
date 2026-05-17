import { useEffect, useRef, useState } from 'react'
import Icon from '../../../components/ui/Icon'
import styles from './ClosedPoll.module.css'

function ResultBar({ result, animate }) {
    return (
        <div className={styles.resultRow}>
            <div className={styles.resultLabel}>
        <span className={result.winner ? styles.resultWinner : styles.resultOption}>
          {result.winner && '🏆 '}{result.label}
        </span>
                <span className={result.winner ? styles.pct : styles.pctGrey}>
          {result.pct}%
        </span>
            </div>
            <div className={styles.barBg}>
                <div
                    className={styles.barFill}
                    style={{
                        width: animate ? `${result.pct}%` : '0%',
                        background: result.winner ? 'var(--green2)' : 'var(--muted)'
                    }}
                />
            </div>
        </div>
    )
}

export default function ClosedPoll({ poll }) {
    const [animate, setAnimate] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setAnimate(true) },
            { threshold: 0.2 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={ref} className={styles.poll}>
            <div className={styles.header}>
                <p className={styles.question}>{poll.question}</p>
                <span className={styles.statusClosed}>Closed · {poll.closedDate}</span>
            </div>
            <p className={styles.meta}>
                <Icon name="users" size={11} /> {poll.voted} / {poll.total} voted · {Math.round(poll.voted / (poll.total || 1) * 100)}% turnout
            </p>
            <div className={styles.results}>
                {(poll.results ?? []).map(r => (
                    <ResultBar key={r.label} result={r} animate={animate} />
                ))}
            </div>
            {poll.outcomeNote && (
                <div className={styles.note}>
                    <Icon name="checkCircle" size={11} /> {poll.outcomeNote}
                </div>
            )}
        </div>
    )
}
