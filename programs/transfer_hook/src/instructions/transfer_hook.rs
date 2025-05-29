use anchor_lang::prelude::*;
use std::collections::{BTreeMap, BTreeSet};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};
use spl_tlv_account_resolution::{account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList};
use crate::state::HookConfig;

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(
        token::mint = mint,
        token::authority = owner,
    )]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        token::mint = mint,
    )]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: source token account owner, can be SystemAccount or PDA owned by another program
    pub owner: UncheckedAccount<'info>,
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    /// CHECK: ExtraAccountMetaList Account,
    pub extra_account_meta_list: UncheckedAccount<'info>,
    #[account(
        seeds = [b"hook-config"],
        bump = hook_config.bump
    )]
    pub hook_config: Account<'info, HookConfig>,
    #[account(
        mut,
        token::mint = mint,
        address = hook_config.winner_wallet
    )]
    pub winner_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> TransferHook<'info> {
    pub fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let cpi_accounts = TransferChecked {
            from: self.source_token.to_account_info(),
            to: self.winner_token_account.to_account_info(),
            authority: self.owner.to_account_info(),
            mint: self.mint.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
    // Calculate 1% fee
    let fee_amount = amount.checked_div(100).unwrap_or(0);

    if fee_amount > 0 {
        // Use transfer_checked for SPL Token 2022
        anchor_spl::token_interface::transfer_checked(
            ctx.accounts.transfer_ctx(),
            fee_amount,
            ctx.accounts.mint.decimals,
        )?;
        msg!("Transfer hook executed: {} tokens sent to winner wallet", fee_amount);
    }

    Ok(())
}

// fallback function - for other programs to invoke the transfer hook
pub fn fallback<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> Result<()> {
    use anchor_lang::prelude::borsh::BorshDeserialize;
    use anchor_lang::prelude::ProgramError;
    use anchor_lang::AccountsClose;
    use anchor_lang::prelude::ToAccountInfos;

    // Anchor's `try_accounts` needs these
    use anchor_lang::prelude::Pubkey;
    use crate::instructions::transfer_hook::TransferHookBumps;

    let instruction = TransferHookInstruction::unpack(data)?;

    match instruction {
        TransferHookInstruction::Execute { amount } => {
            let mut bumps = TransferHookBumps::default();
            let mut seeds = BTreeSet::new();
            let mut data_slice = data;
            let mut account_infos = accounts;
            let accounts = TransferHook::try_accounts(
                program_id,
                &mut account_infos,
                &mut data_slice,
                &mut bumps,
                &mut seeds,
            )?;
            let ctx = Context::new(program_id, &mut *Box::new(accounts), &[], BTreeMap::new());
            return transfer_hook(ctx, amount);
        }
    }
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: ExtraAccountMetaList Account, must use these exact seeds
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()], 
        bump
    )]
    pub extra_account_meta_list: AccountInfo<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [b"hook-config"],
        bump
    )]
    pub hook_config: Account<'info, HookConfig>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_extra_account_meta_list(
    ctx: Context<InitializeExtraAccountMetaList>,
) -> Result<()> {
    let account_metas = vec![
        ExtraAccountMeta::new_with_seeds(
            &[Seed::Literal {
                bytes: "hook-config".as_bytes().to_vec(),
            }],
            false, // is_signer
            true,  // is_writable
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: "winner-token".as_bytes().to_vec(),
                },
                Seed::AccountKey { index: 2 }, // mint
            ],
            false, // is_signer
            true,  // is_writable
        )?,
    ];

    let account_size = ExtraAccountMetaList::size_of(account_metas.len())? as u64;
    let lamports = Rent::get()?.minimum_balance(account_size as usize);

    let mint = ctx.accounts.mint.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"extra-account-metas", 
        mint.as_ref(), 
        &[ctx.bumps.extra_account_meta_list],
    ]];

    anchor_lang::system_program::create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.extra_account_meta_list.to_account_info(),
            },
        )
        .with_signer(signer_seeds),
        lamports,
        account_size,
        ctx.program_id,
    )?;

    ExtraAccountMetaList::init::<ExecuteInstruction>(
        &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
        &account_metas,
    )?;

    Ok(())
}
