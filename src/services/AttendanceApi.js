import client from './axiosClient'

// --- Attendance Check (parent, one per poll) ---

export const createAttendanceCheck = async (pollId) => {
    const response = await client.post(`/attendance_check/poll/${pollId}`)
    return response.data
}

export const closeAttendanceCheck = async (checkId) => {
    const response = await client.post(`/attendance_check/${checkId}/close`)
    return response.data
}

// --- Attendance Rounds ---

export const openRound = async (checkId, moderatorId) => {
    const response = await client.post(`/attendance_rounds/check/${checkId}`, null, {
        params: { moderatorId }
    })
    return response.data
}

// Alias — legacy imports
export const createRound = openRound

export const closeRound = async (roundId, moderatorId) => {
    const response = await client.post(`/attendance_rounds/${roundId}/close`, null, {
        params: { moderatorId }
    })
    return response.data
}

export const closeRoundAndOpenVoting = async (roundId, moderatorId) => {
    const response = await client.post(`/attendance_rounds/${roundId}/close-and-open-voting`, null, {
        params: { moderatorId }
    })
    return response.data
}

export const deleteRound = async (roundId, adminId) => {
    await client.delete(`/attendance_rounds/${roundId}`, {
        params: { adminId }
    })
}

// --- User Attendance Records ---

export const checkIn = async ({ roundId, userId, moderatorId }) => {
    const response = await client.post(
        '/attendance_records/check-in',
        { roundId, userId },
        moderatorId ? { params: { moderatorId } } : {}
    )
    return response.data
}

export const checkOut = async ({ roundId, userId, moderatorId }) => {
    const params = { roundId, userId }
    if (moderatorId) params.moderatorId = moderatorId
    const response = await client.post('/attendance_records/check-out', null, { params })
    return response.data
}

export const getAttendanceSummary = async (pollId) => {
    const response = await client.get(`/attendance_records/summary/poll/${pollId}`)
    return response.data
}

export const getRecordsByRound = async (roundId) => {
    const response = await client.get(`/attendance_records/round/${roundId}`)
    return response.data
}

export const getRoundsByCheckId = async (checkId) => {
    const response = await client.get(`/attendance_rounds/check/${checkId}`)
    return response.data
}

export const getChecksByMeeting = async (meetingId) => {
    const response = await client.get(`/attendance_check/meeting/${meetingId}`)
    return response.data
}

export const createAttendanceCheckForMeeting = async (meetingId, moderatorId) => {
    const response = await client.post(`/attendance_check/meeting/${meetingId}`, null, {
        params: { moderatorId }
    })
    return response.data
}
