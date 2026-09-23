use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, Promise};

/// 5,000 credits per 1 NEAR. Same rate as the ETH ledger, denominated in NEAR.
const CREDITS_PER_NEAR: u128 = 5_000;
/// 1 credit = 1e6 micro-credits.
const MICRO: u128 = 1_000_000;
const YOCTO_PER_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
/// 0.001 NEAR.
const MIN_DEPOSIT_YOCTO: u128 = YOCTO_PER_NEAR / 1_000;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct CreditLedger {
    owner: AccountId,
    treasury: AccountId,
    micro_credits: LookupMap<AccountId, u128>,
}

#[near]
impl CreditLedger {
    #[init]
    pub fn new(treasury: AccountId) -> Self {
        require!(treasury.as_str() != "", "treasury");
        Self {
            owner: env::predecessor_account_id(),
            treasury,
            micro_credits: LookupMap::new(b"m"),
        }
    }

    pub fn set_treasury(&mut self, treasury: AccountId) {
        self.assert_owner();
        require!(treasury.as_str() != "", "treasury");
        self.treasury = treasury;
    }

    /// Attach NEAR. Mints micro-credits to the caller.
    #[payable]
    pub fn deposit(&mut self) {
        let attached = env::attached_deposit().as_yoctonear();
        require!(attached >= MIN_DEPOSIT_YOCTO, "min deposit");
        let micro_added = yocto_to_micro(attached);
        require!(micro_added > 0, "dust");

        let payer = env::predecessor_account_id();
        let next = self
            .micro_credits
            .get(&payer)
            .copied()
            .unwrap_or(0)
            .checked_add(micro_added)
            .unwrap_or_else(|| env::panic_str("overflow"));
        self.micro_credits.insert(payer, next);
    }

    /// Burn micro-credits from the caller.
    pub fn spend(&mut self, micro_cost: u128) {
        require!(micro_cost > 0, "cost");
        let payer = env::predecessor_account_id();
        let balance = self.micro_credits.get(&payer).copied().unwrap_or(0);
        require!(balance >= micro_cost, "insufficient credits");
        self.micro_credits.insert(payer, balance - micro_cost);
    }

    pub fn balance_of(&self, account: AccountId) -> u128 {
        self.micro_credits.get(&account).copied().unwrap_or(0)
    }

    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn treasury(&self) -> AccountId {
        self.treasury.clone()
    }

    /// Pull escrowed NEAR to `to`, or the treasury when `to` is omitted.
    /// `amount` of 0 withdraws everything that is not locked for storage.
    pub fn withdraw(&mut self, to: Option<AccountId>, amount: Option<u128>) -> Promise {
        self.assert_owner();
        let dest = to.unwrap_or_else(|| self.treasury.clone());
        let available = available_yocto();
        let amt = match amount {
            None | Some(0) => available,
            Some(value) => value,
        };
        require!(amt > 0, "zero");
        require!(amt <= available, "balance");
        Promise::new(dest).transfer(NearToken::from_yoctonear(amt))
    }
}

impl CreditLedger {
    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "not owner");
    }
}

fn yocto_to_micro(yocto: u128) -> u128 {
    yocto
        .checked_mul(CREDITS_PER_NEAR)
        .and_then(|value| value.checked_mul(MICRO))
        .and_then(|value| value.checked_div(YOCTO_PER_NEAR))
        .unwrap_or_else(|| env::panic_str("dust"))
}

fn available_yocto() -> u128 {
    let balance = env::account_balance().as_yoctonear();
    let locked = env::storage_byte_cost().as_yoctonear() * u128::from(env::storage_usage());
    balance.saturating_sub(locked)
}
