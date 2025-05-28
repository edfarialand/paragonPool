# Paragon Pool (PRPL) Token

A Solana SPL Token 2022 with an upgradable transfer hook that automatically sends 1% of all transfers to a designated weekly winner wallet.

## Features

- **SPL Token 2022** with newest metadata format
- **Upgradable Transfer Hook** that takes 1% fee from all transfers
- **Winner Wallet Management** - Authority can update the winner anytime
- **Fully Functional** - Ready to deploy and use

## Token Details

- **Name**: Paragon Pool
- **Symbol**: PRPL  
- **Decimals**: 6
- **Transfer Fee**: 1% of each transfer goes to current winner
- **Upgradable**: Winner wallet can be changed by authority

## Quick Start

### 1. Setup in GitHub Codespace

Create a new repository and open in Codespace, then run:

```bash
# Install Rust and Solana tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
export PATH="/home/codespace/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install dependencies  
npm install

# Configure Solana
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2
```

### 2. Configure Your Token

Edit `scripts/setup-token.ts` and fill in:

```typescript
// 1. Upload your PNG and metadata.json to Arweave first, then paste the JSON URI
const METADATA_URI = "YOUR_ARWEAVE_METADATA_URI_HERE";

// 2. Your wallet address (token authority)
const AUTHORITY_WALLET = "YOUR_WALLET_ADDRESS_HERE"; 

// 3. Initial winner wallet address
const INITIAL_WINNER_WALLET = "WINNER_WALLET_ADDRESS_HERE";
```

### 3. Deploy and Setup

```bash
# Build the transfer hook program
anchor build

# Deploy to devnet
anchor deploy

# Create your token
npm run setup-token

# Mint initial supply
npm run mint-tokens

# Update winner anytime
npm run update-winner
```

## Scripts

### setup-token.ts
Creates the token mint with transfer hook functionality. Run this once to set up everything.

**What it does:**
- Creates Token 2022 mint with metadata
- Deploys transfer hook configuration
- Sets up extra account metadata for hooks
- Creates your token account

### mint-tokens.ts  
Mints tokens to a specified address (defaults to your wallet).

**Configuration:**
```typescript
const MINT_ADDRESS = "YOUR_MINT_ADDRESS_HERE"; // From setup output
const MINT_AMOUNT = 1000000; // Number of tokens to mint
```

### update-winner.ts
Updates the winner wallet that receives 1% of transfers.

**Configuration:**
```typescript
const NEW_WINNER_ADDRESS = "NEW_WINNER_WALLET_ADDRESS_HERE";
```

## How the Transfer Hook Works

Every time someone transfers PRPL tokens:

1. **Normal Transfer**: Tokens move from sender to recipient
2. **Automatic Fee**: 1% goes to the current winner wallet  
3. **Winner Gets Paid**: Winner accumulates tokens from all transfers

The hook is built into the token itself, so it works with any wallet or program that transfers PRPL tokens.

## File Structure

```
paragon-pool-token/
├── programs/transfer-hook/          # Rust program for transfer hook
│   ├── src/
│   │   ├── lib.rs                   # Main program entry
│   │   ├── instructions/            # Program instructions
│   │   └── state/                   # Account state definitions
│   └── Cargo.toml                   # Rust dependencies
├── scripts/                         # TypeScript deployment scripts
│   ├── setup-token.ts              # Initial token setup
│   ├── mint-tokens.ts              # Mint tokens
│   └── update-winner.ts            # Update winner wallet
├── package.json                    # Node.js dependencies
├── tsconfig.json                   # TypeScript config
├── Anchor.toml                     # Anchor framework config
└── README.md                       # This file
```

## Deployment to Mainnet

1. Update `Anchor.toml` cluster to `"Mainnet"`
2. Change RPC endpoint in scripts to mainnet
3. Fund your mainnet wallet
4. Run the same setup process

```toml
[provider]
cluster = "Mainnet"
wallet = "~/.config/solana/id.json"
```

## Security Notes

- **Authority Control**: Only the authority wallet can update the winner
- **Transfer Hook**: Built into the token, cannot be bypassed
- **Fee Rate**: 1% is hardcoded in the program for security
- **Upgradable**: Winner wallet can be changed, but fee rate cannot

## Troubleshooting

### "Insufficient SOL balance"
You need at least 0.1 SOL for token creation. Request more from faucet:
```bash
solana airdrop 2
```

### "Token account not found"
Run `setup-token.ts` first before minting tokens.

### "Not the authority"
Only the wallet that created the token can update the winner.

### Program deployment fails
Make sure you have enough SOL and the program ID in `Anchor.toml` matches your keypair.

## Support

This is a complete, production-ready token implementation. All files are included and functional.

For Solana/Anchor specific issues, refer to:
- [Solana Documentation](https://docs.solana.com)
- [Anchor Documentation](https://anchor-lang.com)
- [SPL Token 2022 Guide](https://spl.solana.com/token-2022)