use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, Promise};

/// 5,000 credits per 1 NEAR. Same rate as the ETH ledger, denominated in NEAR.
const CREDITS_PER_NEAR: u128 = 5_000;
/// 1 credit = 1e6 micro-credits.
const MICRO: u128 = 1_000_000;
const YOCTO_PER_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
/// Exact yoctoNEAR represented by one micro-credit. Divides evenly.
const YOCTO_PER_MICRO: u128 = YOCTO_PER_NEAR / (CREDITS_PER_NEAR * MICRO);
const _: () = assert!(YOCTO_PER_NEAR == YOCTO_PER_MICRO * CREDITS_PER_NEAR * MICRO);
/// 0.001 NEAR must be credited after storage. A new account also pays its own map entry.
const MIN_DEPOSIT_YOCTO: u128 = YOCTO_PER_NEAR / 1_000;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct CreditLedger {
    owner: AccountId,
    treasury: AccountId,
    micro_credits: LookupMap<AccountId, u128>,
    /// Sum of unspent micro-credits. That many credits stay backed by NEAR.
    total_micro: u128,
}

/// State layout of the first deployment, before `total_micro` existed.
#[near(serializers = [borsh])]
struct CreditLedgerV1 {
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
            total_micro: 0,
        }
    }

    /// One-time upgrade from the V1 state. Locks every liquid yoctoNEAR as reserved
    /// so an upgrade cannot withdraw deposits that were already credited.
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        let old: CreditLedgerV1 = env::state_read().unwrap_or_else(|| env::panic_str("state"));
        require!(env::predecessor_account_id() == old.owner, "not owner");
        Self {
            owner: old.owner,
            treasury: old.treasury,
            micro_credits: old.micro_credits,
            total_micro: yocto_to_micro(available_yocto()),
        }
    }

    pub fn set_treasury(&mut self, treasury: AccountId) {
        self.assert_owner();
        require!(treasury.as_str() != "", "treasury");
        self.treasury = treasury;
    }

    pub fn set_owner(&mut self, owner: AccountId) {
        self.assert_owner();
        require!(owner.as_str() != "", "owner");
        self.owner = owner;
    }

    /// Attach NEAR. Storage for a new balance is paid from this deposit.
    /// Credits are minted only on the remainder, which must be at least 0.001 NEAR.
    #[payable]
    pub fn deposit(&mut self) {
        let attached = env::attached_deposit().as_yoctonear();
        let payer = env::predecessor_account_id();
        let before = env::storage_usage();
        let prev = self.micro_credits.get(&payer).copied().unwrap_or(0);
        self.micro_credits.insert(payer.clone(), prev);
        self.micro_credits.flush();
        let storage_cost = storage_increase_cost(before);
        require!(attached > storage_cost, "storage");
        let creditable = attached - storage_cost;
        require!(creditable >= MIN_DEPOSIT_YOCTO, "min deposit");
        let micro_added = yocto_to_micro(creditable);
        require!(micro_added > 0, "dust");

        let next = prev
            .checked_add(micro_added)
            .unwrap_or_else(|| env::panic_str("overflow"));
        self.micro_credits.insert(payer, next);
        self.total_micro = self
            .total_micro
            .checked_add(micro_added)
            .unwrap_or_else(|| env::panic_str("overflow"));
    }

    /// Burn micro-credits from the caller. The matching NEAR becomes owner surplus.
    pub fn spend(&mut self, micro_cost: u128) {
        require!(micro_cost > 0, "cost");
        let payer = env::predecessor_account_id();
        let balance = self.micro_credits.get(&payer).copied().unwrap_or(0);
        require!(balance >= micro_cost, "insufficient credits");
        self.burn(payer, micro_cost);
    }

    /// Return the caller's unspent credits as NEAR, plus the storage stake for their balance entry.
    pub fn redeem(&mut self) -> Promise {
        let payer = env::predecessor_account_id();
        let balance = self.micro_credits.get(&payer).copied().unwrap_or(0);
        require!(balance > 0, "zero");
        let before = env::storage_usage();
        self.burn(payer.clone(), balance);
        self.micro_credits.flush();
        let payout = yocto_from_micro(balance)
            .checked_add(storage_decrease_refund(before))
            .unwrap_or_else(|| env::panic_str("overflow"));
        self.transfer_liquid(payer, payout)
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

    pub fn total_micro(&self) -> u128 {
        self.total_micro
    }

    /// NEAR the owner may withdraw. Outstanding credits stay in the contract.
    pub fn withdrawable(&self) -> u128 {
        surplus_yocto(self.total_micro)
    }

    /// Pull NEAR that is no longer backing unspent credits.
    /// `amount` of 0 withdraws that whole surplus.
    pub fn withdraw(&mut self, to: Option<AccountId>, amount: Option<u128>) -> Promise {
        self.assert_owner();
        let dest = to.unwrap_or_else(|| self.treasury.clone());
        let surplus = surplus_yocto(self.total_micro);
        let amt = match amount {
            None | Some(0) => surplus,
            Some(value) => value,
        };
        require!(amt > 0, "zero");
        require!(amt <= surplus, "reserved");
        self.transfer_liquid(dest, amt)
    }

    fn burn(&mut self, payer: AccountId, micro_cost: u128) {
        let balance = self.micro_credits.get(&payer).copied().unwrap_or(0);
        let next = balance - micro_cost;
        if next == 0 {
            let _ = self.micro_credits.remove(&payer);
        } else {
            self.micro_credits.insert(payer, next);
        }
        self.total_micro = self
            .total_micro
            .checked_sub(micro_cost)
            .unwrap_or_else(|| env::panic_str("outstanding"));
    }

    fn transfer_liquid(&self, dest: AccountId, payout: u128) -> Promise {
        let liquid = available_yocto();
        require!(payout <= liquid, "balance");
        let reserved = yocto_from_micro(self.total_micro);
        require!(liquid - payout >= reserved, "reserved");
        Promise::new(dest).transfer(NearToken::from_yoctonear(payout))
    }

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "not owner");
    }
}

fn yocto_to_micro(yocto: u128) -> u128 {
    yocto / YOCTO_PER_MICRO
}

fn yocto_from_micro(micro: u128) -> u128 {
    micro
        .checked_mul(YOCTO_PER_MICRO)
        .unwrap_or_else(|| env::panic_str("overflow"))
}

fn surplus_yocto(total_micro: u128) -> u128 {
    available_yocto().saturating_sub(yocto_from_micro(total_micro))
}

fn available_yocto() -> u128 {
    let balance = env::account_balance().as_yoctonear();
    let locked = env::storage_byte_cost().as_yoctonear() * u128::from(env::storage_usage());
    balance.saturating_sub(locked)
}

fn storage_increase_cost(before: u64) -> u128 {
    let grown = env::storage_usage().saturating_sub(before);
    env::storage_byte_cost().as_yoctonear() * u128::from(grown)
}

fn storage_decrease_refund(before: u64) -> u128 {
    let freed = before.saturating_sub(env::storage_usage());
    env::storage_byte_cost().as_yoctonear() * u128::from(freed)
}
