// frontend/src/App.js
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import './App.css';
import MerkleVerifierABI from './MerkleVerifierABI.json';

function App() {
  const [txHash, setTxHash] = useState('');
  const [proof, setProof] = useState('');
  const [result, setResult] = useState('');
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        setAccount(userAddress);

        const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
        const merkleVerifier = new ethers.Contract(contractAddress, MerkleVerifierABI, signer);
        setContract(merkleVerifier);
      } else {
        alert('Please install MetaMask!');
      }
    };
    init();
  }, []);

  const handleVerify = async () => {
    if (!ethers.utils.isHexString(txHash) || txHash.length !== 66) {
      alert('Invalid Transaction Hash.');
      return;
    }

    const proofArray = proof.split(',').map(p => p.trim());
    for (let p of proofArray) {
      if (!ethers.utils.isHexString(p) || p.length !== 66) {
        alert('Invalid proof element.');
        return;
      }
    }

    try {
      const leaf = ethers.utils.keccak256(txHash);
      const isValid = await contract.verify(leaf, proofArray);
      setResult(isValid ? '✅ Valid Proof!' : '❌ Invalid Proof!');
    } catch (error) {
      console.error(error);
      setResult('❌ Verification Error.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Merkle Proof Verification</h2>
        <p>Connected Account: {account}</p>
        <div className="input-group">
          <label>Transaction Hash:</label><br />
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            size="66"
          />
        </div>
        <div className="input-group">
          <label>Merkle Proof (comma-separated):</label><br />
          <textarea
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            placeholder="0x..., 0x..., ..."
            rows="4"
            cols="60"
          />
        </div>
        <button onClick={handleVerify}>Verify Inclusion</button>
        <div className="result">
          <strong>Result:</strong> {result}
        </div>
      </header>
    </div>
  );
}

export default App;
