import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true, // indispensable pour que le cookie de session soit envoyé/reçu
})

export async function submitLeaveRequest(variables) {
  const { data } = await api.post('/api/start-leave-request', variables)
  return data.processInstanceKey
}

export async function login(identifiant, password) {
  const { data } = await api.post('/api/login', { identifiant, password })
  return data
}
  
export async function logout() {
  await api.post('/api/logout')
}

export async function fetchMe() {
  const { data } = await api.get('/api/me')
  return data
}

export async function fetchEmployes() {
  const { data } = await api.get('/api/employes')
  return data
}

export async function fetchDemandesEnAttente() {
  const { data } = await api.get('/api/demandes-en-attente')
  return data
}

export async function approuverDemande(taskId, processInstanceKey) {
  await api.post(`/api/demandes/${taskId}/approuver`, { process_instance_key: processInstanceKey })
}

export async function refuserDemande(taskId, processInstanceKey) {
  await api.post(`/api/demandes/${taskId}/refuser`, { process_instance_key: processInstanceKey })
}

export async function fetchMesNotifications() {
  const { data } = await api.get('/api/mes-notifications')
  return data
}

export async function marquerNotificationVue(demandeId) {
  await api.post(`/api/notifications/${demandeId}/vu`)
}

export async function register(payload) {
  const { data } = await api.post('/api/register', payload)
  return data
}

export async function fetchInscriptionsEnAttente() {
  const { data } = await api.get('/api/inscriptions-en-attente')
  return data
}

export async function validerInscription(employeId) {
  await api.post(`/api/inscriptions/${employeId}/valider`)
}

export async function refuserInscription(employeId) {
  await api.post(`/api/inscriptions/${employeId}/refuser`)
}

export default api