use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HookLb6XLcGwzaVWxk9T8yWbmejbLX4xwWUxRp1zipNN");

#[program]
pub mod transfer_hook {
    use super::*;

    pub fn initialize_hook_config(
        ctx: Context<InitializeHookConfig>,
        authority: Pubkey,
        winner_wallet: Pubkey,
    ) -> Result<()> {
        initialize::initialize_hook_config(ctx, authority, winner_wallet)
    }

    pub fn update_winner_wallet(
        ctx: Context<UpdateWinnerWallet>,
        new_winner: Pubkey,
    ) -> Result<()> {
        update_winner::update_winner_wallet(ctx, new_winner)
    }

    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
        transfer_hook::transfer_hook(ctx, amount)
    }
}