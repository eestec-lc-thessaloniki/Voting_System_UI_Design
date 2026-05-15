import client from './axiosClient'

export const getMembershipSummary = async () => {
    const response = await client.get('/memberships/summary')
    return response.data
}

export const getCommitteesSummary = async () => {
    const response = await client.get('/committees/summary')
    return response.data
}

export const getUserById = async (id) => {
    const response = await client.get(`/users/${id}`)
    return response.data
}