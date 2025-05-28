import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMetadataPointerInstruction,
  createInitializeNonTransferableMintInstruction,
  TYPE_SIZE,
  LENGTH_SIZE,
  ExtensionType,
  getMintLen,
  createInitializeTransferHookInstruction,
  getTransferHook,
} from '@solana/spl-token';
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';

// ========================================
// CONFIGURATION - FILL THESE IN
// ========================================

// 1. YOUR METADATA URI (upload PNG and metadata.json to Arweave first)  
const METADATA_URI = "https://arweave.net/-Jzxp64F3K2-K2hOpW9VqU3Vk8jodJCN2l4wcyW-8UY"; // Replace with your Arweave URI

// 2. YOUR WALLET (authority that can update winner)
const AUTHORITY_WALLET = "BgK6YKvDmriwY9p9hBQFmHDc3fnLsrMNxaxHfd1iF4DG"; // Replace with your wallet address

// 3. INITIAL WINNER WALLET (can be updated later via update-winner script)
const INITIAL_WINNER_WALLET = "BgK6YKvDmriwY9p9hBQFmHDc3fnLsrMNxaxHfd1iF4DG"; // Replace with initial winner address

// ========================================
// CONNECTION SETUP
// ========================================

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = anchor.Wallet.local();

// ========================================
// TOKEN CONFIGURATION
// ========================================

const TOKEN_METADATA = {
  name: "Paragon Pool",  
  symbol: "PRPL",
  uri: METADATA_URI,
  additionalMetadata: [
    ["description", "Weekly pool token where 1% of transfers go to the winner"],
    ["website", "https://paragoncrypto.biz], // Replace with your website
  ],
};

const DECIMALS = 6;
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("HookLb6XLcGwzaVWxk9T8yWbmejbLX4xwUxRp1zipNN");

async function setupToken() {
  try {
    console.log("🚀 Setting up Paragon Pool (PRPL) token...");
    console.log("Wallet:", wallet.publicKey.toString());
    
    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log("Wallet balance:", balance / 1e9, "SOL");
    
    if (balance < 0.1 * 1e9) {
      throw new Error("Insufficient SOL balance. Need at least 0.1 SOL for setup.");
    }

    // Generate mint keypair
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    
    console.log("Mint address:", mint.toString());

    // Calculate space needed for mint account with extensions
    const extensions = [
      ExtensionType.MetadataPointer,
      ExtensionType.TransferHook,
    ];
    
    const mintLen = getMintLen(extensions);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(TOKEN_METADATA).length;
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

    // Create mint account
    const createMintAccountInstruction = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    });

    // Initialize transfer hook
    const initializeTransferHookInstruction = createInitializeTransferHookInstruction(
      mint,
      wallet.publicKey, // authority
      TRANSFER_HOOK_PROGRAM_ID, // hook program id
      TOKEN_2022_PROGRAM_ID,
    );

    // Initialize metadata pointer
    const initializeMetadataPointerInstruction = createInitializeMetadataPointerInstruction(
      mint,
      wallet.publicKey, // authority
      mint, // metadata address (same as mint for inline metadata)
      TOKEN_2022_PROGRAM_ID,
    );

    // Initialize mint
    const initializeMintInstruction = createInitializeMintInstruction(
      mint,
      DECIMALS,
      wallet.publicKey, // mint authority
      wallet.publicKey, // freeze authority  
      TOKEN_2022_PROGRAM_ID,
    );

    // Initialize metadata
    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint, // metadata account same as mint
      updateAuthority: wallet.publicKey,
      mint: mint,
      mintAuthority: wallet.publicKey,
      name: TOKEN_METADATA.name,
      symbol: TOKEN_METADATA.symbol,
      uri: TOKEN_METADATA.uri,
    });

    // Create transaction
    const transaction = new Transaction().add(
      createMintAccountInstruction,
      initializeTransferHookInstruction,
      initializeMetadataPointerInstruction,
      initializeMintInstruction,
      initializeMetadataInstruction,
    );

    // Send transaction
    console.log("📄 Creating mint account and initializing token...");
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet.payer, mintKeypair]);
    console.log("✅ Token created! Transaction:", signature);

    // Now set up the transfer hook configuration
    console.log("🔧 Setting up transfer hook configuration...");
    
    // Load the transfer hook program
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    
    const idl = await anchor.Program.fetchIdl(TRANSFER_HOOK_PROGRAM_ID, provider);
    const program = new anchor.Program(idl!, TRANSFER_HOOK_PROGRAM_ID, provider);

    // Find hook config PDA
    const [hookConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hook-config")],
      TRANSFER_HOOK_PROGRAM_ID
    );

    // Initialize hook configuration
    const initHookTx = await program.methods
      .initializeHookConfig(
        new PublicKey(AUTHORITY_WALLET),
        new PublicKey(INITIAL_WINNER_WALLET)
      )
      .accounts({
        hookConfig: hookConfigPda,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Hook config initialized! Transaction:", initHookTx);

    // Initialize extra account meta list for the transfer hook
    const [extraAccountMetaListPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    );

    const initExtraAccountsTx = await program.methods
      .initializeExtraAccountMetaList()
      .accounts({
        payer: wallet.publicKey,
        extraAccountMetaList: extraAccountMetaListPda,
        mint: mint,
        hookConfig: hookConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Extra accounts meta list initialized! Transaction:", initExtraAccountsTx);

    // Create associated token account for the mint authority (you)
    const authorityTokenAccount = await getAssociatedTokenAddress(
      mint,
      wallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const createATAInstruction = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      authorityTokenAccount, // ata
      wallet.publicKey, // owner
      mint, // mint
      TOKEN_2022_PROGRAM_ID
    );

    const ataTransaction = new Transaction().add(createATAInstruction);
    const ataSignature = await sendAndConfirmTransaction(connection, ataTransaction, [wallet.payer]);
    
    console.log("✅ Associated token account created! Transaction:", ataSignature);

    console.log("\n🎉 SETUP COMPLETE!");
    console.log("=====================================");
    console.log("Token Name:", TOKEN_METADATA.name);
    console.log("Token Symbol:", TOKEN_METADATA.symbol);
    console.log("Mint Address:", mint.toString());
    console.log("Your Token Account:", authorityTokenAccount.toString());
    console.log("Hook Config PDA:", hookConfigPda.toString());
    console.log("Extra Accounts Meta List:", extraAccountMetaListPda.toString());
    console.log("Transfer Hook Program:", TRANSFER_HOOK_PROGRAM_ID.toString());
    console.log("Current Winner Wallet:", INITIAL_WINNER_WALLET);
    console.log("Authority (you):", AUTHORITY_WALLET);
    console.log("\n📝 NEXT STEPS:");
    console.log("1. Run 'npm run mint-tokens' to mint initial supply");
    console.log("2. Run 'npm run update-winner' to change winner wallet anytime");
    console.log("3. Update Anchor.toml with your mint address for mainnet deployment");
    console.log("\n💡 SAVE THESE ADDRESSES - YOU'LL NEED THEM!");

  } catch (error) {
    console.error("❌ Error setting up token:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  }
}

// Run the setup
setupToken();