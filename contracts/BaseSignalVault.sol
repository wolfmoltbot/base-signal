// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BaseSignalVault
 * @notice Vault contract for Base Signal platform token deposits and withdrawals
 * @dev Agents deposit tokens to get platform credits, withdraw to get tokens back
 */
contract BaseSignalVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // The Base Signal token (set once at deployment)
    IERC20 public immutable token;

    // Platform signer address (backend signs withdrawal approvals)
    address public platformSigner;

    // Nonces for replay protection
    mapping(address => uint256) public nonces;

    // Events
    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 nonce, uint256 timestamp);
    event PlatformSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // Errors
    error ZeroAmount();
    error InvalidSignature();
    error InvalidNonce();
    error InsufficientVaultBalance();

    constructor(address _token, address _platformSigner) Ownable(msg.sender) {
        token = IERC20(_token);
        platformSigner = _platformSigner;
    }

    /**
     * @notice Deposit tokens into the vault
     * @param amount Amount of tokens to deposit
     * @dev Emits Deposited event which backend indexes to credit agent balance
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Withdraw tokens from the vault
     * @param amount Amount of tokens to withdraw
     * @param nonce Unique nonce to prevent replay
     * @param signature Platform signature authorizing the withdrawal
     * @dev Backend signs (user, amount, nonce) to authorize withdrawals
     */
    function withdraw(
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (nonce != nonces[msg.sender]) revert InvalidNonce();
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(msg.sender, amount, nonce, block.chainid, address(this)))
        ));
        
        address signer = recoverSigner(messageHash, signature);
        if (signer != platformSigner) revert InvalidSignature();
        
        // Check vault balance
        uint256 vaultBalance = token.balanceOf(address(this));
        if (vaultBalance < amount) revert InsufficientVaultBalance();
        
        // Increment nonce
        nonces[msg.sender]++;
        
        // Transfer tokens
        token.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount, nonce - 1, block.timestamp);
    }

    /**
     * @notice Get current nonce for a user
     * @param user User address
     * @return Current nonce
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /**
     * @notice Get vault token balance
     * @return Total tokens held in vault
     */
    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ─── Admin Functions ───

    /**
     * @notice Update platform signer address
     * @param newSigner New signer address
     */
    function setPlatformSigner(address newSigner) external onlyOwner {
        address oldSigner = platformSigner;
        platformSigner = newSigner;
        emit PlatformSignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Emergency withdraw (only owner, for stuck tokens)
     * @param _token Token address (can be different from main token)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(_token, amount);
    }

    // ─── Internal Functions ───

    function recoverSigner(bytes32 messageHash, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        
        if (v < 27) v += 27;
        
        return ecrecover(messageHash, v, r, s);
    }
}
