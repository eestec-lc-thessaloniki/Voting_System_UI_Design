import client from './AxiosClient'

export const getActive = async () => {
    const response = await client.get('/general_meetings/active')
    return response.data
}

export const getAll = async () => {
    const response = await client.get('/general_meetings')
    return response.data
}

export const getMeetingById = async (meetingId) => {
    const response = await client.get(`/general_meetings/${meetingId}`)
    return response.data
}

export const createMeeting = async (meeting, moderatorId) => {
    const response = await client.post(`/general_meetings?moderatorId=${moderatorId}`, meeting)
    return response.data
}

export const patchMeeting = async (meetingId, updates, moderatorId) => {
    const response = await client.patch(
        `/general_meetings/${meetingId}?moderatorId=${moderatorId}`,
        updates
    )
    return response.data
}

export const deleteMeeting = async (meetingId, adminId) => {
    const response = await client.delete(`/general_meetings/${meetingId}?adminId=${adminId}`)
    return response.data
}