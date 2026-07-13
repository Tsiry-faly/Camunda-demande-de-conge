import axios from 'axios'

export async function submitLeaveRequest(variables) {
  const { data } = await axios.post('http://localhost:5000/api/start-leave-request', variables)
  return data.processInstanceKey
}