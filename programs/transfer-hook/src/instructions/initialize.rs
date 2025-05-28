use anchor_lang::prelude::*;
use crate::state::HookConfig;

#[derive(Accounts)]
pub struct InitializeHookConfig<'info> {
    #[account(
        init,
        payer = payer,
        space = HookConfig::LEN,
        seeds = [b"hook-config"],
        bump
    )]
    pub hook_config: Account<'info, HookConfig>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_hook_config(
    ctx: Context<InitializeHookConfig>,
    authority: Pubkey,
    winner_wallet: Pubkey,
) -> Result<()> {
    let hook_config = &mut ctx.accounts.hook_config;
    hook_config.authority = authority;
    hook_config.winner_wallet = winner_wallet;
    hook_config.bump = ctx.bumps.hook_config;
    
    msg!("Hook config initialized with authority: {} and winner: {}", authority, winner_wallet);
    Ok(())
}