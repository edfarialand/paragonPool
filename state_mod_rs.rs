use anchor_lang::prelude::*;

#[account]
pub struct HookConfig {
    pub authority: Pubkey,
    pub winner_wallet: Pubkey,
    pub bump: u8,
}

impl HookConfig {
    pub const LEN: usize = 8 + 32 + 32 + 1; // discriminator + authority + winner_wallet + bump
}