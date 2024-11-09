// frontend/src/Dashboard.js
import { ethers } from 'ethers'
import React, { useEffect, useState } from 'react'
import { fetchTransfers } from './api'

const Dashboard = () => {
  const [transfers, setTransfers] = useState([])

  useEffect(() => {
    const getTransfers = async () => {
      const data = await fetchTransfers()
      setTransfers(data)
    }

    getTransfers()

    // Poll every minute
    const interval = setInterval(() => {
      getTransfers()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <h2>Recent USDC Transfers to {process.env.REACT_APP_TARGET_ADDRESS}</h2>
      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>Amount (USDC)</th>
            <th>Timestamp</th>
            <th>Transaction Hash</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id}>
              <td>{transfer.from}</td>
              <td>{ethers.utils.formatUnits(transfer.value, 6)}</td>
              <td>{new Date(transfer.timestamp * 1000).toLocaleString()}</td>
              <td>
                <a
                  href={`https://sepolia.etherscan.io/tx/${transfer.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Dashboard
