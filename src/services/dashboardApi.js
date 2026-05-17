import client from './axiosClient'

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hr ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
}

function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    })
}

const PRIORITY_COLOR = {
    HIGH:   '#C0544A',
    MEDIUM: '#E8B84B',
    LOW:    '#A8D5A2',
}

// ─── Events ─────────────────────────────────────────────────────────────────

export async function fetchEvents() {
    const { data } = await client.get('/events')
    return data.map(e => ({
        id:        e.id ?? e.Id,
        startTime: e.startTime,
        title:     e.title,
        hostingLC: e.hostingLC ?? 'TBD',
        type:      e.type ?? 'OPERATIONAL',
    }))
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function fetchAnnouncements() {
    const { data } = await client.get('/announcements')
    return data.map(a => ({
        id:     a.id,
        bold:   a.title,
        text:   a.content,
        author: a.createdBy?.username ?? 'System',
        time:   relativeTime(a.createdAt),
        color:  PRIORITY_COLOR[a.priority] ?? '#E8B84B',
    }))
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function fetchStats() {
    const { data: d } = await client.get('/stats')
    return [
        {
            id:      'members',
            label:   'Total Members',
            value:   (d.totalMembers ?? 0).toString(),
            delta:   '',
            deltaUp: true,
            sub:     '',
            color:   'g',
            icon:    'users',
        },
        {
            id:      'events',
            label:   'Total Events',
            value:   d.totalEvents.toString(),
            delta:   '',
            deltaUp: true,
            sub:     '',
            color:   'au',
            icon:    'calendar',
        },
        {
            id:      'polls',
            label:   'Poll Participation',
            value:   `${d.pollParticipationPct}%`,
            delta:   '',
            deltaUp: true,
            sub:     '',
            color:   'b',
            icon:    'check',
        },
        {
            id:      'attendance',
            label:   'Avg. Attendance',
            value:   `${d.avgAttendancePct}%`,
            delta:   '',
            deltaUp: d.avgAttendancePct >= 80,
            sub:     'Target: 85% by May',
            color:   d.avgAttendancePct >= 80 ? 'g' : 'r',
            icon:    'activity',
        },
    ]
}

// ─── Polls ───────────────────────────────────────────────────────────────────

export async function fetchPolls() {
    const { data } = await client.get('/polls')
    return data.map(p => ({
        id:       p.id,
        status:   p.isActive ? 'open' : 'closed',
        question: p.title,
        voted:    p.votes?.length ?? 0,
        total:    p.electoralBodyCount,
        options:  p.options?.map(o => o.optionText ?? o.title ?? '') ?? [],
    }))
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function fetchUserById(userId) {
    const { data } = await client.get(`/users/${userId}`)
    return data
}

export async function searchByDiscordTag(tag) {
    try {
        const { data } = await client.get('/users/search/discord', { params: { tag } })
        return data
    } catch (err) {
        if (err.response?.status === 404) return null
        throw err
    }
}

export async function updateProfile(userId, form) {
    const { data } = await client.patch(`/users/${userId}`, {
        username:       form.username,
        email:          form.email,
        discordTag:     form.discordTag,
        user_phone_num: form.phone,
    })
    return data
}

export async function changePassword(userId, currentPassword, newPassword) {
    try {
        const { data } = await client.patch(`/users/${userId}/password`, { currentPassword, newPassword })
        return data
    } catch (err) {
        throw new Error(err.response?.data ?? err.message)
    }
}

export async function updateUserRole(targetUserId, newRole, adminId) {
    const endpoint = newRole === 'MODERATOR'
        ? `/users/${targetUserId}/promote-moderator`
        : `/users/${targetUserId}/demote`
    const { data } = await client.patch(endpoint, null, { params: { adminId } })
    return data
}

// ─── Attendance sessions (dashboard card) ────────────────────────────────────

export async function fetchAttendanceSessions() {
    const { data: meetings } = await client.get('/general_meetings')
    // Take the last 5 meetings that have at least one poll with an attendance check
    const withAttendance = meetings.filter(m => m.polls?.some(p => p.attendanceCheckId))
    const recent = withAttendance.slice(-5)

    return Promise.all(
        recent.map(async (meeting) => {
            const poll = meeting.polls.find(p => p.attendanceCheckId)
            try {
                const { data: summary } = await client.get(`/attendance_records/summary/poll/${poll.id}`)
                const pct = summary.attendanceRate != null
                    ? Math.round(summary.attendanceRate)
                    : summary.totalEligible
                        ? Math.round((summary.checkedIn / summary.totalEligible) * 100)
                        : null
                const color = pct == null ? '#C9993A'
                    : pct >= 80 ? '#6BAE78'
                    : pct >= 60 ? '#E8B84B'
                    : '#C0544A'
                return { label: meeting.title ?? `Meeting #${meeting.id}`, pct, color }
            } catch {
                return { label: meeting.title ?? `Meeting #${meeting.id}`, pct: null, color: '#C9993A' }
            }
        })
    )
}
