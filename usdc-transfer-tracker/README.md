<img width="2000rem" src="https://raw.githubusercontent.com/SamirPaulb/SamirPaulb/main/assets/rainbow-superthin.webp"><br>

<!-- Futuristic Header -->
<div align="center">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:3d85c6,100:00ffff&height=200&section=header&text=Task2%3A%20USDC%20Transfer%20Tracker&fontSize=60&fontColor=fff&animation=fadeIn&fontAlignY=38&desc=Real-time+Monitoring+and+Notification+System&descAlignY=60&descAlign=50" />
</div>

<img width="2000rem" src="https://raw.githubusercontent.com/SamirPaulb/SamirPaulb/main/assets/rainbow-superthin.webp"><br>

# 🛠️ Task 2: USDC Transfer Tracker

## 📄 Overview

The **USDC Transfer Tracker** is a comprehensive system designed to monitor incoming USDC (USD Coin) transfers to a specified Ethereum address on the Sepolia test network. It leverages **The Graph Protocol** for efficient indexing of blockchain data, a **backend service** for polling and push notifications via **Firebase Cloud Messaging (FCM)**, and a **React-based frontend dashboard** to display real-time transfer information.

## 🌟 Features

- **Real-time Monitoring**: Continuously tracks USDC transfers to a specified address.
- **Push Notifications**: Sends instant notifications upon detecting new transfers.
- **User-Friendly Dashboard**: Displays recent transfer details in an intuitive interface.
- **Modular Design**: Easily extendable to support additional features or signature schemes.
- **Scalable Architecture**: Designed to handle increasing volumes of transfer data efficiently.
- **Secure Data Handling**: Ensures sensitive information is protected through environment variables and secure storage practices.

## 🔧 Setup

### Prerequisites

- **Node.js** (v14.x or later)
- **npm** (v6.x or later)
- **Hardhat**: Ethereum development environment
- **The Graph CLI**: For deploying subgraphs
- **Firebase Account**: For push notifications
- **Infura Account**: To access Ethereum nodes
- **MetaMask**: For managing Ethereum accounts

### 1. Clone the Repository

```bash
git clone https://github.com/DeAtHfIrE26/charter-21BCE0216.git
cd charter-21BCE0216/usdc-transfer-tracker
```
2. **Install Dependencies**

    ```bash
    # Root dependencies
    npm install

    # Navigate to each subproject and install dependencies
    cd subgraph && npm install && cd ..
    cd backend && npm install && cd ..
    cd frontend && npm install && cd ..
    ```

3. **Configure Environment Variables**

    - **Subgraph Configuration**: Create a `.env` file in the `subgraph` directory.

      ```env
      GRAPH_ACCESS_TOKEN=your_graph_access_token
      ```

    - **Backend Configuration**: Create a `.env` file in the `backend` directory.

      ```env
      INFURA_PROJECT_ID=your_infura_project_id
      PRIVATE_KEY=your_private_key
      FIREBASE_SERVICE_ACCOUNT=./firebaseServiceAccount.json
      TARGET_ADDRESS=0xYourTargetEthereumAddress
      ```

    - **Frontend Configuration**: Create a `.env` file in the `frontend` directory.

      ```env
      REACT_APP_BACKEND_URL=http://localhost:5000
      ```

4. **Deploy The Graph Subgraph**

    ```bash
    cd subgraph
    graph auth --product hosted-service your_graph_access_token
    graph deploy --product hosted-service your-username/usdc-transfer-tracker ./usdc-transfer-tracker
    ```

5. **Set Up Firebase Cloud Messaging**

    - **Firebase Project**: Create a new project in [Firebase Console](https://console.firebase.google.com/).
    - **Service Account Key**: Generate a private key and save it as `firebaseServiceAccount.json` in the `backend` directory.
    - **Enable FCM**: Ensure Firebase Cloud Messaging is enabled.

6. **Run the Backend Service**

    ```bash
    cd backend
    npm start
    ```

7. **Run the Frontend Dashboard**

    ```bash
    cd frontend
    npm start
    ```

    > Access the frontend at [http://localhost:3000](http://localhost:3000).

---

## 📜 Usage

### Interacting with the System

- **Frontend Dashboard**: Access the real-time dashboard to monitor USDC transfers.
- **API Endpoints**: Retrieve recent transfer data or trigger notifications through API calls.

#### Example: Fetching Recent Transfers

```javascript
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const fetchRecentTransfers = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/transfers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transfers:', error);
    throw error;
  }
};
```
## 🧪 Testing

### 1. Run Unit Tests
bash
```

# Navigate to backend directory
cd backend
npm test
```
Expected Output:
```
  USDCTransferTracker
    ✓ Should fetch transfers successfully (X ms)
    ✓ Should handle API errors gracefully (X ms)

  2 passing (X seconds)

```
### 2. Add More Tests
Extend the test suite to include scenarios like:

Testing with different USDC contract addresses.
Simulating high transfer volumes to test scalability.
Verifying the correctness of push notifications.
Handling edge cases like transfers with zero value or invalid addresses.

## 📂 Project Structure

### plaintext
```
usdc-transfer-tracker/
├── README.md
├── subgraph/
│   ├── abis/
│   │   └── USDC.json
│   ├── src/
│   │   └── mapping.ts
│   ├── subgraph.yaml
│   └── schema.graphql
├── backend/
│   ├── README.md
│   ├── index.js
│   ├── .env
│   ├── firebaseServiceAccount.json
│   ├── package.json
│   └── .gitignore
└── frontend/
    ├── README.md
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   ├── Dashboard.js
    │   ├── api.js
    │   └── index.js
    ├── public/
    │   └── index.html
    ├── package.json
    └── .gitignore
```

## 🔗 Related Links
The Graph Documentation
Firebase Cloud Messaging Documentation
React Documentation
Hardhat Documentation
Ethereum Documentation
Infura
MetaMask

## 📝 Best Practices

Security Audits: Always perform security audits on your backend services and smart contracts.
Scalability Considerations: Design your backend to handle increasing transfer data volumes efficiently.
Comprehensive Testing: Ensure all possible scenarios are tested to maintain system reliability.
Clear Documentation: Maintain thorough documentation for ease of understanding and collaboration.
Version Control: Use Git effectively to manage changes and collaborate with others.
Environment Management: Use environment variables and .gitignore to protect sensitive information.
