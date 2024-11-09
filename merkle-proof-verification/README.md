<img width="2000rem" src="https://raw.githubusercontent.com/SamirPaulb/SamirPaulb/main/assets/rainbow-superthin.webp"><br>

<img src="https://media2.giphy.com/media/QssGEmpkyEOhBCb7e1/giphy.gif?cid=ecf05e47a0n3gi1bfqntqmob8g9aid1oyj2wr3ds3mg700bl&rid=giphy.gif" width ="25"><b> Projects</b>
<img width="2000rem" src="https://raw.githubusercontent.com/SamirPaulb/SamirPaulb/main/assets/rainbow-superthin.webp"><br>

<!-- Futuristic Header -->
<div align="center">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:3d85c6,100:00ffff&height=200&section=header&text=Task1%3A%20Merkle%20Proof%20Verification&fontSize=60&fontColor=fff&animation=fadeIn&fontAlignY=38&desc=Ensuring+Data+Integrity+with+Merkle+Trees&descAlignY=60&descAlign=50" />
</div>

<img width="2000rem" src="https://raw.githubusercontent.com/SamirPaulb/SamirPaulb/main/assets/rainbow-superthin.webp"><br>

# 🛠️ Task 1: Merkle Proof Verification

## 📄 Overview

The **Merkle Proof Verification** project implements a robust system to verify the integrity and inclusion of data within a Merkle Tree. Merkle Trees are fundamental in blockchain technologies for ensuring data consistency and security. This project leverages smart contracts to perform on-chain verification of Merkle proofs, enhancing trust and transparency in decentralized applications.

## 🌟 Features

- **Efficient Verification**: Quickly verifies whether a given leaf is part of a Merkle Tree.
- **Smart Contract Integration**: Deploys verification logic on the Ethereum blockchain.
- **Flexible Implementation**: Supports various hashing algorithms compatible with Merkle Trees.
- **Comprehensive Testing**: Includes unit tests to ensure reliability and correctness.
- **Gas Optimization**: Optimized for minimal gas consumption during verification.

## 🔧 Setup

### Prerequisites

- **Node.js** (v14.x or later)
- **npm** (v6.x or later)
- **Hardhat**: Ethereum development environment
- **MetaMask**: For managing Ethereum accounts and interacting with the blockchain
- **Infura Account**: To access Ethereum nodes

### 1. Clone the Repository

```bash
git clone https://github.com/DeAtHfIrE26/charter-21BCE0216.git
cd charter-21BCE0216/merkle-proof-verification
```
### 2. Install Dependencies
bash
Copy code
npm install

### 3. Configure Environment Variables
Create a .env file in the merkle-proof-verification directory with the following content:

env
Copy code
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key
Note:

Replace your_infura_project_id with your actual Infura project ID.
Replace your_private_key with your Ethereum account's private key on Sepolia. Never expose your private key publicly.

### 4. Compile the Smart Contract
bash

npx hardhat compile

### 5. Deploy the Smart Contract
Ensure you have some Sepolia ETH for deployment.

bash
npx hardhat run scripts/deploy.js --network sepolia
Expected Output:

vbnet
Deploying contracts with the account: 0xYourDeployerAddress
MerkleProofVerifier deployed to: 0xDeployedContractAddress

## 📜 Usage

### Interacting with the Contract

You can interact with the deployed `MerkleProofVerifier` contract using Hardhat scripts or a frontend interface.

#### Example: Verifying a Merkle Proof

```javascript
const { ethers } = require("hardhat");

async function verifyProof() {
  const [deployer] = await ethers.getSigners();
  const verifier = await ethers.getContractAt("MerkleProofVerifier", "0xDeployedContractAddress");

  const leaf = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Sample Leaf"));
  const proof = [
    "0xProofElement1...",
    "0xProofElement2...",
    // Add all necessary proof elements
  ];
  const root = "0xYourMerkleRoot";

  const isValid = await verifier.verifyProof(leaf, proof, root);
  console.log(`Is the proof valid? ${isValid}`);
}

verifyProof()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```
## 🧪 Testing

### 1. Run Unit Tests

The project includes comprehensive tests to ensure the verification logic works as expected.

```bash
npx hardhat test
```
# Expected Output:
  MerkleProofVerifier
    ✓ Should verify a valid proof (X ms)
    ✓ Should reject an invalid proof (X ms)

  2 passing (X seconds)
## 📂 Project Structure

```plaintext
merkle-proof-verification/
├── contracts/
│   └── MerkleProofVerifier.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── MerkleProofVerifier.test.js
├── hardhat.config.js
├── package.json
├── .env
└── .gitignore
```

### 🔗 Related
Hardhat Documentation
Ethereum Documentation
The Graph Protocol
Merkle Trees Explained
Infura
MetaMask

### 📝 Best Practices
Security Audits: Always perform security audits on your smart contracts to identify and fix vulnerabilities.
Gas Optimization: Optimize your smart contracts to reduce gas costs during deployment and execution.
Comprehensive Testing: Ensure all possible scenarios are tested to maintain contract reliability.
Documentation: Maintain clear and thorough documentation for ease of understanding and collaboration.
Version Control: Use Git effectively to manage changes and collaborate with others.
