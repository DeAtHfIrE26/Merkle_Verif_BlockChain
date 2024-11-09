// frontend/src/api.js
import axios from 'axios'

const BACKEND_URL = 'http://localhost:3001' // Update if backend is hosted elsewhere

export const fetchTransfers = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/transfers`)
    return response.data
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return []
  }
}
