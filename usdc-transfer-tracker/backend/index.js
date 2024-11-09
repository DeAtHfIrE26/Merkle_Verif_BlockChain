// backend/index.js
const axios = require('axios')
const cron = require('node-cron')
const admin = require('firebase-admin')
const dotenv = require('dotenv')
const express = require('express')
const cors = require('cors')
const ethers = require('ethers')

dotenv.config()

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_CREDENTIALS
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const fcm = admin.messaging()

// Subgraph URL
const SUBGRAPH_URL = process.env.SUBGRAPH_URL

// Target Address
const TARGET_ADDRESS = process.env.TARGET_ADDRESS.toLowerCase()

// To keep track of the last processed transfer
let lastTransferId = ''

// Store transfers in memory (for simplicity)
let transferHistory = []

// Function to query the subgraph
const queryTransfers = async () => {
  const query = `
    {
      transfers(
        first: 5,
        orderBy: blockNumber,
        orderDirection: desc,
        where: { to: "${TARGET_ADDRESS}" }
      ) {
        id
        from
        to
        value
        timestamp
        blockNumber
        transactionHash
      }
    }
  `

  try {
    const response = await axios.post(SUBGRAPH_URL, { query })
    const transfers = response.data.data.transfers

    // Reverse to process oldest first
    transfers.reverse()

    for (const transfer of transfers) {
      if (transfer.id === lastTransferId) {
        // Already processed
        continue
      }

      // Send notification
      await sendNotification(transfer)

      // Add to history
      transferHistory.unshift(transfer)
      if (transferHistory.length > 100) {
        transferHistory.pop()
      }

      // Update lastTransferId
      lastTransferId = transfer.id
    }
  } catch (error) {
    console.error('Error querying subgraph:', error.message)
  }
}

// Function to send push notification via FCM
const sendNotification = async (transfer) => {
  const payload = {
    notification: {
      title: 'New USDC Transfer',
      body: `From: ${transfer.from}\nAmount: ${ethers.utils.formatUnits(transfer.value, 6)} USDC`,
    },
  }

  try {
    // Replace with your FCM device tokens
    const tokens = ['dummytoken1234567890abcdef'] // Replace with actual FCM tokens

    const response = await fcm.sendToDevice(tokens, payload)
    console.log('Notification sent:', response)
  } catch (error) {
    console.error('Error sending notification:', error.message)
  }
}

// Initialize Express App
const app = express()
app.use(cors())
app.use(express.json())

// Endpoint to get recent transfers
app.get('/transfers', (req, res) => {
  res.json(transferHistory)
})

// Start Express Server
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`)
})

// Schedule the polling every minute
cron.schedule('* * * * *', () => {
  console.log('Polling for new transfers...')
  queryTransfers()
})

console.log('USDC Transfer Tracker Backend is running...')
