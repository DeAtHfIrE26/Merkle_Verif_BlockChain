// frontend/src/App.js
import React from 'react'
import './App.css'
import Dashboard from './Dashboard'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>USDC Transfer Tracker</h1>
        <Dashboard />
      </header>
    </div>
  )
}

export default App
