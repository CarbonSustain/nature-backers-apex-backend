// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PayoutDistributor
 * @dev Receives HBAR and distributes it proportionally to three project wallets
 *      based on vote percentages. Supports up to 3 projects (matching the max
 *      allowed project selection per campaign).
 */
contract PayoutDistributor {
    address public owner;
    address public projectWallet1;
    address public projectWallet2;
    address public projectWallet3;

    event PayoutDistributed(
        uint256 indexed campaignId,
        uint256 totalAmount,
        uint256 pct1,
        uint256 pct2,
        uint256 pct3
    );

    event WalletsUpdated(
        address wallet1,
        address wallet2,
        address wallet3
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    /**
     * @param _wallet1 Address for project slot 1 (highest vote-getter)
     * @param _wallet2 Address for project slot 2
     * @param _wallet3 Address for project slot 3
     */
    constructor(
        address _wallet1,
        address _wallet2,
        address _wallet3
    ) {
        require(_wallet1 != address(0), "Wallet 1 cannot be zero address");
        require(_wallet2 != address(0), "Wallet 2 cannot be zero address");
        require(_wallet3 != address(0), "Wallet 3 cannot be zero address");
        owner = msg.sender;
        projectWallet1 = _wallet1;
        projectWallet2 = _wallet2;
        projectWallet3 = _wallet3;
    }

    /**
     * @dev Distribute received HBAR proportionally to the 3 project wallets.
     *      Percentages must sum to 100. Wallets with 0% receive nothing.
     *      Integer division dust is added to the last non-zero slot.
     * @param campaignId The campaign ID for event tracking
     * @param pct1 Percentage for wallet 1 (0-100)
     * @param pct2 Percentage for wallet 2 (0-100)
     * @param pct3 Percentage for wallet 3 (0-100)
     */
    function distribute(
        uint256 campaignId,
        uint256 pct1,
        uint256 pct2,
        uint256 pct3
    ) external payable onlyOwner {
        require(msg.value > 0, "Must send HBAR");
        require(pct1 + pct2 + pct3 == 100, "Percentages must sum to 100");

        uint256 total = msg.value;
        uint256 amount1 = (total * pct1) / 100;
        uint256 amount2 = (total * pct2) / 100;
        uint256 amount3 = (total * pct3) / 100;

        // Assign integer-division dust to the last non-zero slot
        uint256 dust = total - amount1 - amount2 - amount3;
        if (dust > 0) {
            if (pct3 > 0) {
                amount3 += dust;
            } else if (pct2 > 0) {
                amount2 += dust;
            } else {
                amount1 += dust;
            }
        }

        if (amount1 > 0) {
            (bool ok1, ) = projectWallet1.call{value: amount1}("");
            require(ok1, "Transfer to wallet 1 failed");
        }
        if (amount2 > 0) {
            (bool ok2, ) = projectWallet2.call{value: amount2}("");
            require(ok2, "Transfer to wallet 2 failed");
        }
        if (amount3 > 0) {
            (bool ok3, ) = projectWallet3.call{value: amount3}("");
            require(ok3, "Transfer to wallet 3 failed");
        }

        emit PayoutDistributed(campaignId, total, pct1, pct2, pct3);
    }

    /**
     * @dev Update project wallet addresses (owner only).
     */
    function setWallets(
        address _wallet1,
        address _wallet2,
        address _wallet3
    ) external onlyOwner {
        require(_wallet1 != address(0), "Wallet 1 cannot be zero address");
        require(_wallet2 != address(0), "Wallet 2 cannot be zero address");
        require(_wallet3 != address(0), "Wallet 3 cannot be zero address");
        projectWallet1 = _wallet1;
        projectWallet2 = _wallet2;
        projectWallet3 = _wallet3;
        emit WalletsUpdated(_wallet1, _wallet2, _wallet3);
    }

    receive() external payable {}
}
