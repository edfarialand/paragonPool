import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

// ========================================
// CONFIGURATION - UPDATE THESE
// ========================================

// Your mint address (from setup-token.ts output)
const MINT_ADDRESS = "YOUR_MINT_ADDRESS_HERE"; // Replace with your mint address

// Amount to mint (in token units, will be multiplied by 10^decimals)
const MINT_AMOUNT = 1000000; // 1 million tokens

// Recipient address (defaults to your wallet, but you can change it)
const RECIPIENT_ADDRESS = ""; // Leave empty to mint to your wallet, or specify an address

// ========================================
// CONNECTION SETUP
// ========================================

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = anchor.Wallet.local();

async function mintTokens() {
  try {
    console.log("🪙 Minting PRPL tokens...");
    console.log("Wallet:", wallet.publicKey.toString());
    
    const mint = new PublicKey(MINT_ADDRESS);
    
    // Determine recipient
    const recipient = RECIPIENT_ADDRESS 
      ? new PublicKey(RECIPIENT_ADDRESS)
      : wallet.publicKey;
    
    console.log("Mint:", mint.toString());
    console.log("Recipient:", recipient.toString());
    
    // Get recipient's token account
    const recipientTokenAccount = await getAssociatedTokenAddress(
      mint,
      recipient,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log("Recipient Token Account:", recipientTokenAccount.toString());
    
    // Check if token account exists
    try {
      await connection.getAccountInfo(recipientTokenAccount);
      console.log("✅ Token account exists");
    } catch (error) {
      console.log("⚠️  Token account doesn't exist yet - it should have been created during setup");
      throw new Error("Token account not found. Run setup-token.ts first or create the token account.");
    }
    
    // Calculate amount with decimals (assuming 6 decimals from setup)
    const DECIMALS = 6;
    const amountToMint = MINT_AMOUNT * Math.pow(10, DECIMALS);
    
    console.log(`💰 Minting ${MINT_AMOUNT} PRPL tokens (${amountToMint} base units)...`);
    
    // Create mint instruction
    const mintInstruction = createMintToInstruction(
      mint,                    // mint
      recipientTokenAccount,   // destination  
      wallet.publicKey,        // mint authority
      amountToMint,           // amount
      [],                     // multiSigners
      TOKEN_2022_PROGRAM_ID   // token program
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(mintInstruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet.payer]
    );
    
    console.log("✅ Tokens minted successfully!");
    console.log("Transaction signature:", signature);
    console.log(`🎉 ${MINT_AMOUNT} PRPL tokens minted to ${recipient.toString()}`);
    
    // Get updated balance
    try {
      const accountInfo = await connection.getTokenAccountBalance(recipientTokenAccount);
      console.log(`💼 New token balance: ${accountInfo.value.uiAmount} PRPL`);
    } catch (error) {
      console.log("Could not fetch updated balance, but minting was successful");
    }

  } catch (error) {
    console.error("❌ Error minting tokens:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }
}

// Run the minting
mintTokens();