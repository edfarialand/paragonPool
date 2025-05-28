# Paragon Pool (PRPL) Token - Complete Setup Guide

## Project Structure
```
paragon-pool-token/
├── programs/
│   └── transfer-hook/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── instructions/
│       │   │   ├── mod.rs
│       │   │   ├── initialize.rs
│       │   │   ├── update_winner.rs
│       │   │   └── transfer_hook.rs
│       │   └── state/
│       │       └── mod.rs
│       └── Cargo.toml
├── scripts/
│   ├── setup-token.ts
│   ├── mint-tokens.ts
│   └── update-winner.ts
├── package.json
├── tsconfig.json
├── Anchor.toml
└── README.md
```

## GitHub Codespace Setup Instructions

### Step 1: Create Repository and Open in Codespace
1. Go to GitHub and create a new repository named `paragon-pool-token`
2. Click the green "Code" button and select "Create codespace on main"
3. Wait for the codespace to load

### Step 2: Install Required Tools
In the codespace terminal, run these commands one by one:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Add Solana toolchain
rustup component add rustfmt

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
export PATH="/home/codespace/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node.js dependencies (will be added after we create package.json)
npm install
```

### Step 3: Configure Solana for Development
```bash
# Set up Solana config for devnet
solana config set --url devnet

# Generate a new keypair (save this - it's your deployer wallet)
solana-keygen new --outfile ~/.config/solana/id.json

# Get some SOL for testing
solana airdrop 2

# Check your balance
solana balance
```

### Step 4: Initialize Anchor Project
```bash
# Initialize anchor project (this creates the basic structure)
anchor init paragon-pool-token --no-git
cd paragon-pool-token
```

Now you'll create all the files I'm providing in the artifacts. Let me break this down into manageable pieces.

## What You'll Need to Fill In Later
1. **Token metadata URI** - Upload your PNG and metadata JSON to Arweave, then paste the JSON URI
2. **Winner wallet address** - The address that receives the 1% transfer fee
3. **Your authority wallet** - Your wallet address that can update the winner

## Next Steps After Setup
1. Fill in the metadata URI in `scripts/setup-token.ts`
2. Run the setup script to create your token
3. Mint initial supply
4. Set the winner wallet address
5. Deploy to mainnet when ready