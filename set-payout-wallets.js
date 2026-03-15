/**
 * Update the payout wallet addresses on a deployed PayoutDistributor contract.
 *
 * Usage:
 *   npx hardhat run set-payout-wallets.js --network hederaTestnet
 *
 * Required env vars:
 *   PAYOUT_WALLET_1, PAYOUT_WALLET_2, PAYOUT_WALLET_3
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const wallet1 = process.env.PAYOUT_WALLET_1;
  const wallet2 = process.env.PAYOUT_WALLET_2;
  const wallet3 = process.env.PAYOUT_WALLET_3;

  if (!wallet1 || !wallet2 || !wallet3) {
    throw new Error("Missing env vars: PAYOUT_WALLET_1, PAYOUT_WALLET_2, PAYOUT_WALLET_3");
  }

  const deploymentPath = path.join(__dirname, "src/contracts/PayoutDistributorDeployment.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("PayoutDistributorDeployment.json not found. Deploy the contract first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [signer] = await ethers.getSigners();

  console.log("Updating wallets on PayoutDistributor at:", deployment.address);
  console.log("  Wallet 1:", wallet1);
  console.log("  Wallet 2:", wallet2);
  console.log("  Wallet 3:", wallet3);

  const contract = new ethers.Contract(deployment.address, deployment.abi, signer);
  const tx = await contract.setWallets(wallet1, wallet2, wallet3);
  await tx.wait();

  console.log("Wallets updated. TX:", tx.hash);

  // Update deployment JSON
  deployment.wallets = { wallet1, wallet2, wallet3 };
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("PayoutDistributorDeployment.json updated.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
