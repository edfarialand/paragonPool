use anchor_lang::prelude::*;
use crate::state::HookConfig;

#[derive(Accounts)]
pub struct UpdateWinnerWallet<'info> {
    #[account(
        mut,
        seeds = [b"hook-config"],
        bump = hook_config.bump,
        has_one = authority
    )]
    pub hook_config: Account<'info, HookConfig>,
    
    pub authority: Signer<'info>,
}

pub fn update_winner_wallet(
    ctx: Context<UpdateWinnerWallet>,
    new_winner: Pubkey,
) -> Result<()> {
    let hook_config = &mut ctx.accounts.hook_config;
    let old_winner = hook_config.winner_wallet;
    hook_config.winner_wallet = new_winner;
    
    msg!("Winner wallet updated from {} to {}", old_winner, new_winner);
    Ok(())
}