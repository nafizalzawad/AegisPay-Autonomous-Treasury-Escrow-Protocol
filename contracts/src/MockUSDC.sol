// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Standard 6-decimal ERC20 token simulating USDC for institutional escrow & smart treasury testing.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    event FaucetDispensed(address indexed to, uint256 amount);

    constructor() ERC20("USD Coin Mock", "USDC") Ownable(msg.sender) {
        // Mint initial supply of 1,000,000 USDC to deployer
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mint arbitrary amount (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Public faucet for sandbox testing (up to 5,000 USDC per call)
     */
    function faucet(address to, uint256 amount) external {
        require(amount <= 5_000 * 10 ** DECIMALS, "Faucet limit exceeded (max 5,000 USDC)");
        _mint(to, amount);
        emit FaucetDispensed(to, amount);
    }
}
