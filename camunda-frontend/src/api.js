import axios from 'axios'

const api = axios.create({
  baseURL: '/v2',
  headers: { 'Content-Type': 'application/json' },
})

// Pause utilitaire (pour laisser le temps à la tâche d'être indexée)
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Démarre une instance ET complète directement la tâche "Remplir la demande"
export async function submitLeaveRequest(variables) {
  // 1. Démarrer l'instance
  const { data: instance } = await api.post('/process-instances', {
    processDefinitionId: 'Process_0ul30q6',
  })

  // 2. Attendre un court instant que la tâche soit indexée
  await sleep(1000)

  // 3. Chercher la tâche correspondant à cette instance précise
  const { data: searchResult } = await api.post('/user-tasks/search', {
    filter: { state: 'CREATED' },
  })

  const task = searchResult.items.find(
    (t) => t.processInstanceKey === instance.processInstanceKey
  )

  if (!task) {
    throw new Error("Impossible de trouver la tâche associée à cette instance.")
  }

  // 4. S'assigner la tâche
  await api.post(`/user-tasks/${task.userTaskKey}/assignment`, {
    assignee: variables.prenom + ' ' + variables.nom,
  })

  // 5. Compléter la tâche avec les données du formulaire
  await api.post(`/user-tasks/${task.userTaskKey}/completion`, {
    variables,
  })

  return instance.processInstanceKey
}

export default api