/**
 * Deploy PayoutDistributor to Hedera Testnet
 *
 * Usage:
 *   npx hardhat run deploy-payout.js --network hederaTestnet
 *
 * Required env vars (in .env):
 *   PAYOUT_WALLET_1  – testnet address for project slot 1
 *   PAYOUT_WALLET_2  – testnet address for project slot 2
 *   PAYOUT_WALLET_3  – testnet address for project slot 3
 *   PRIVATE_KEY_HEDERA – deployer private key
 *   HEDERA_TESTNET_RPC_URL
 *
 * Output:
 *   Writes src/contracts/PayoutDistributorDeployment.json with address + ABI
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const wallet1 = process.env.PAYOUT_WALLET_1;
  const wallet2 = process.env.PAYOUT_WALLET_2;
  const wallet3 = process.env.PAYOUT_WALLET_3;

  if (!wallet1 || !wallet2 || !wallet3) {
    throw new Error(
      "Missing env vars: PAYOUT_WALLET_1, PAYOUT_WALLET_2, PAYOUT_WALLET_3 must all be set"
    );
  }

  console.log("Deploying PayoutDistributor...");
  console.log("  Wallet 1 (project slot 1):", wallet1);
  console.log("  Wallet 2 (project slot 2):", wallet2);
  console.log("  Wallet 3 (project slot 3):", wallet3);

  const [deployer] = await ethers.getSigners();
  console.log("  Deployer:", deployer.address);

  const PayoutDistributor = await ethers.getContractFactory("PayoutDistributor");
  const contract = await PayoutDistributor.deploy(wallet1, wallet2, wallet3);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("PayoutDistributor deployed to:", address);

  // Save deployment info
  const artifact = await hre.artifacts.readArtifact("PayoutDistributor");
  const deployment = {
    address,
    abi: artifact.abi,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    wallets: { wallet1, wallet2, wallet3 },
  };

  const outputPath = path.join(__dirname, "src/contracts/PayoutDistributorDeployment.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
  console.log("Deployment saved to:", outputPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
