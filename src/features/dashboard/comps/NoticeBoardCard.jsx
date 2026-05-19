import Card from '../../../components/ui/Card'
import NoticeItem from './NoticeItem'
import styles from './NoticedBoardCard.module.css'

// NoticeBoardCard.jsx — same pattern
export default function NoticeBoardCard({ notices, loading, error }) {
    if (loading) return <Card title="Notice Board" subtitle="Latest announcements"><p>Loading...</p></Card>
    if (error)   return <Card title="Notice Board" subtitle="Latest announcements"><p>{error}</p></Card>

    return (
        <Card title="Notice Board" subtitle="Latest announcements" action="Post" animDelay={430}>
            <div className={styles.list}>
                {notices.map((notice, i) => <NoticeItem key={notice.id ?? i} notice={notice} />)}
            </div>
        </Card>
    )
}