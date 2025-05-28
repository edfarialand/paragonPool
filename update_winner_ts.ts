import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// ========================================
// CONFIGURATION - UPDATE THESE
// ========================================

// New winner wallet address
const NEW_WINNER_ADDRESS = "NEW_WINNER_WALLET_ADDRESS_HERE"; // Replace with new winner address

// ========================================
// CONNECTION SETUP
// ========================================

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = anchor.Wallet.local();
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("HookLb6XLcGwzaVWxk9T8yWbmejbLX4xwUxRp1zipNN");

async function updateWinner() {
  try {
    console.log("🏆 Updating winner wallet...");
    console.log("Your wallet (authority):", wallet.publicKey.toString());
    console.log("New winner address:", NEW_WINNER_ADDRESS);
    
    // Validate the new winner address
    let newWinnerPubkey: PublicKey;
    try {
      newWinnerPubkey = new PublicKey(NEW_WINNER_ADDRESS);
    } catch (error) {
      throw new Error("Invalid winner wallet address. Please check the address format.");
    }
    
    // Set up Anchor provider and program
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    
    // Load the transfer hook program
    const idl = await anchor.Program.fetchIdl(TRANSFER_HOOK_PROGRAM_ID, provider);
    const program = new anchor.Program(idl!, TRANSFER_HOOK_PROGRAM_ID, provider);

    // Find hook config PDA
    const [hookConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hook-config")],
      TRANSFER_HOOK_PROGRAM_ID
    );

    console.log("Hook config PDA:", hookConfigPda.toString());

    // Get current hook config to verify authority
    try {
      const hookConfig = await program.account.hookConfig.fetch(hookConfigPda);
      console.log("Current winner:", hookConfig.winnerWallet.toString());
      console.log("Authority:", hookConfig.authority.toString());
      
      // Verify you are the authority
      if (!hookConfig.authority.equals(wallet.publicKey)) {
        throw new Error(`You are not the authority for this hook config. Authority is: ${hookConfig.authority.toString()}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("not the authority")) {
        throw error;
      }
      throw new Error("Could not fetch hook config. Make sure the setup was completed properly.");
    }

    // Update winner wallet
    console.log("📝 Sending update transaction...");
    
    const updateTx = await program.methods
      .updateWinnerWallet(newWinnerPubkey)
      .accounts({
        hookConfig: hookConfigPda,
        authority: wallet.publicKey,
      })
      .rpc();

    console.log("✅ Winner wallet updated successfully!");
    console.log("Transaction signature:", updateTx);

    // Verify the update
    const updatedConfig = await program.account.hookConfig.fetch(hookConfigPda);
    console.log("🎉 New winner wallet:", updatedConfig.winnerWallet.toString());
    
    console.log("\n📋 SUMMARY:");
    console.log("=====================================");
    console.log("Hook Config PDA:", hookConfigPda.toString());
    console.log("Authority:", updatedConfig.authority.toString());
    console.log("New Winner:", updatedConfig.winnerWallet.toString());
    console.log("\n✨ The new winner will now receive 1% of all token transfers!");

  } catch (error) {
    console.error("❌ Error updating winner:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }
}

// Run the update
updateWinner();