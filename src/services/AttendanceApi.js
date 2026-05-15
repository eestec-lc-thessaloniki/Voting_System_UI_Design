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

export const openRound = async (checkId) => {
    const response = await client.post(`/attendance_rounds/check/${checkId}`)
    return response.data
}

// Alias — legacy imports
export const createRound = openRound

export const closeRoundAndOpenVoting = async (roundId) => {
    const response = await client.post(`/attendance_rounds/${roundId}/close-and-open-voting`)
    return response.data
}

export const deleteRound = async (roundId, adminId) => {
    await client.delete(`/attendance_rounds/${roundId}`, {
        params: { adminId }
    })
}

// --- User Attendance Records ---

export const checkIn = async ({ roundId, userId }) => {
    const response = await client.post(`/attendance_records/check-in`, { roundId, userId })
    return response.data
}

// checkOut uses roundId + userId (not recordId)
export const checkOut = async ({ roundId, userId }) => {
    const response = await client.post(`/attendance_records/check-out`, { roundId, userId })
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
