import axios from 'axios'

const api = axios.create({
  baseURL: '/v2',
  headers: { 'Content-Type': 'application/json' },
})

// Lit la valeur d'un cookie par son nom
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

// Ajoute automatiquement le jeton CSRF sur chaque requête sortante
api.interceptors.request.use((config) => {
  const csrfToken = getCookie('X-CSRF-TOKEN')
  if (csrfToken) {
    config.headers['X-CSRF-TOKEN'] = csrfToken
  }
  return config
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Récupère un premier cookie CSRF au chargement (via un GET neutre)
export async function initCsrf() {
  await api.get('/topology')
}

export async function submitLeaveRequest(variables) {
  const { data: instance } = await api.post('/process-instances', {
    processDefinitionId: 'Process_0ul30q6',
  })

  await sleep(1000)

  const { data: searchResult } = await api.post('/user-tasks/search', {
    filter: { state: 'CREATED' },
  })

  const task = searchResult.items.find(
    (t) => t.processInstanceKey === instance.processInstanceKey
  )

  if (!task) {
    throw new Error("Impossible de trouver la tâche associée à cette instance.")
  }

  await api.post(`/user-tasks/${task.userTaskKey}/assignment`, {
    assignee: variables.prenom + ' ' + variables.nom,
  })

  await api.post(`/user-tasks/${task.userTaskKey}/completion`, {
    variables,
  })

  return instance.processInstanceKey
}

export default api