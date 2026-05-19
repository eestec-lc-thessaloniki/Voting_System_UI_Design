import client from './axiosClient'

export const createPoll = async ({ pollData, moderatorId }) => {
    const response = await client.post(`/polls?moderatorId=${moderatorId}`, pollData)
    return response.data
}

export const getAllPolls = async () => {
    const response = await client.get('/polls')
    return response.data
}

export const openPollVoting = async ({ pollId, moderatorId }) => {
    const response = await client.patch(`/polls/${pollId}/open-voting`, null, {
        params: { moderatorId }
    })
    return response.data
}

export const getPollsByMeeting = async (meetingId) => {
    const response = await client.get(`/polls/meeting/${meetingId}`)
    return response.data
}