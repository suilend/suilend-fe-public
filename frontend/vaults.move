module vaults::vault;

use std::type_name::{Self, TypeName};
use sui::{bag, balance::{Self, Balance}, clock::Clock, coin::{Self, Coin}, event};
use suilend::{
    decimal,
    lending_market::{ObligationOwnerCap, LendingMarket},
    obligation::Obligation,
    reserve
};

// === Errors ===
const EIncorrectVersion: u64 = 1;
const EInvalidManager: u64 = 2;
const EInvalidDepositFeeBps: u64 = 3;
const EInvalidWithdrawalFeeBps: u64 = 4;
const EInvalidPerformanceFeeBps: u64 = 5;
const EInvalidManagementFeeBps: u64 = 6;
const EInvalidDeposit: u64 = 7;
const EInsufficientShares: u64 = 8;
const EInsufficientLiquidity: u64 = 9;
const ENoReserveForAsset: u64 = 10;
const EIncompleteAccumulation: u64 = 11;

// === Constants ===
const CURRENT_VERSION: u64 = 1;
const MAX_DEPOSIT_FEE_BPS: u64 = 1000; // 10% max deposit fee
const MAX_WITHDRAWAL_FEE_BPS: u64 = 1000; // 10% max withdrawal fee
const MAX_PERFORMANCE_FEE_BPS: u64 = 5000; // 50% max performance fee
const MAX_MANAGEMENT_FEE_BPS: u64 = 1000; // 10% max management fee
const MIN_DEPOSIT: u64 = 1000000; // Minimum deposit 0.001 SUI to prevent dust
const BASIS_POINTS: u64 = 10000; // 100%
const NAV_PRECISION: u128 = 1_000_000_000; // 1e9 for NAV per share calculations
const MAX_UTILIZATION_RATE_BPS: u64 = 7000; // 70% max utilization
const SECONDS_PER_YEAR: u64 = 31_536_000; // 365 * 24 * 60 * 60
const OBLIGATION_CAP_BAG_KEY: u8 = 0;

// === Structs ===
public struct Vault<phantom P, phantom T> has key, store {
    id: object::UID,
    version: u64,
    // Keyed by 'L' from LendingMarket<L>
    obligations: sui::vec_map::VecMap<TypeName, vector<ObligationData>>,
    share_supply: balance::Supply<P>,
    deposit_asset: Balance<T>,
    total_shares: u64,
    fee_receiver: address,
    management_fee_bps: u64,
    performance_fee_bps: u64,
    deposit_fee_bps: u64,
    withdrawal_fee_bps: u64,
    utilization_rate_bps: u64, // Current utilization rate in basis points
    // Fee accrual state
    last_nav_per_share: u64, // For tracking performance fee base
    fee_last_update_timestamp_s: u64,
}

public struct ObligationData has store {
    // bag.OBLIGATION_CAP_BAG_KEY = ObligationOwnerCap<L>
    obligation_cap: bag::Bag,
    obligation_id: ID,
}

public struct VaultShare has drop, store {
    vault_id: ID,
}

public struct VaultManagerCap<phantom P> has key, store {
    id: object::UID,
    vault_id: object::ID,
}

/// Used to aggregate the obligation values from all live LendingMarkets
/// Must be consumed in PTB
public struct VaultValueAccumulator {
    // Keyed by 'L' from LendingMarket<L>
    obligation_ids: sui::vec_map::VecMap<TypeName, vector<ID>>,
    lending_market_values: sui::vec_map::VecMap<TypeName, u64>,
}

/// Created from a VaultValueAggregate once it has been fully processed
public struct VaultValueAggregate has drop {
    liquid_asset_value_usd: u64,
    total_obligation_value_usd: u64,
    lending_market_values: sui::vec_map::VecMap<TypeName, u64>,
}

// === Events ===
public struct VaultCreated has copy, drop {
    vault_id: object::ID,
    fee_receiver: address,
    management_fee_bps: u64,
    performance_fee_bps: u64,
    deposit_fee_bps: u64,
    withdrawal_fee_bps: u64,
}

public struct VaultDeposit has copy, drop {
    vault_id: object::ID,
    user: address,
    deposit_amount: u64,
    shares_minted: u64,
    timestamp_ms: u64,
}

public struct VaultWithdraw has copy, drop {
    vault_id: object::ID,
    user: address,
    amount: u64,
    shares_burned: u64,
    timestamp_ms: u64,
}

public struct ManagerAllocate has copy, drop {
    vault_id: object::ID,
    user: address,
    deposit_amount: u64,
    timestamp_ms: u64,
}

public struct ManagerDivest has copy, drop {
    vault_id: object::ID,
    user: address,
    amount: u64,
    timestamp_ms: u64,
}

public enum FeeType has copy, drop {
    DepositFee,
    WithdrawalFee,
    PerformanceFee,
    ManagementFee,
}

public struct FeesAccrued has copy, drop {
    vault_id: object::ID,
    fee_type: FeeType,
    fee_amount: u64,
    fee_receiver: address,
    timestamp_ms: u64,
}

// === Functions ===
public fun create_vault<T>(
    fee_receiver: address,
    management_fee_bps: u64,
    performance_fee_bps: u64,
    deposit_fee_bps: u64,
    withdrawal_fee_bps: u64,
    clock: &Clock,
    ctx: &mut tx_context::TxContext,
): VaultManagerCap<VaultShare> {
    assert!(management_fee_bps <= MAX_MANAGEMENT_FEE_BPS, EInvalidManagementFeeBps);
    assert!(performance_fee_bps <= MAX_PERFORMANCE_FEE_BPS, EInvalidPerformanceFeeBps);
    assert!(deposit_fee_bps <= MAX_DEPOSIT_FEE_BPS, EInvalidDepositFeeBps);
    assert!(withdrawal_fee_bps <= MAX_WITHDRAWAL_FEE_BPS, EInvalidWithdrawalFeeBps);

    let vault_id = object::new(ctx);

    let shares_witness = VaultShare { vault_id: vault_id.uid_to_inner() };

    let supply_obj = balance::create_supply(shares_witness);

    let current_time_s = clock.timestamp_ms() / 1000;

    // Create vault
    let vault = Vault {
        id: vault_id,
        version: CURRENT_VERSION,
        obligations: sui::vec_map::empty(),
        share_supply: supply_obj,
        deposit_asset: balance::zero<T>(),
        total_shares: 0,
        fee_receiver,
        management_fee_bps,
        performance_fee_bps,
        deposit_fee_bps,
        withdrawal_fee_bps,
        utilization_rate_bps: 0,
        // Initialize fee accrual state
        last_nav_per_share: NAV_PRECISION as u64,
        fee_last_update_timestamp_s: current_time_s,
    };

    let vault_manager_cap = VaultManagerCap {
        id: object::new(ctx),
        vault_id: object::id(&vault),
    };

    event::emit(VaultCreated {
        vault_id: object::id(&vault),
        fee_receiver,
        management_fee_bps,
        performance_fee_bps,
        deposit_fee_bps,
        withdrawal_fee_bps,
    });

    transfer::public_share_object(vault);

    vault_manager_cap
}

public fun deposit<P, L, T>(
    vault: &mut Vault<P, T>,
    mut deposit: Coin<T>,
    lending_market: &LendingMarket<L>,
    clock: &Clock,
    agg: VaultValueAggregate,
    ctx: &mut TxContext,
): Coin<P> {
    assert!(vault.version == CURRENT_VERSION, EIncorrectVersion);
    assert!(deposit.value() >= MIN_DEPOSIT, EInvalidDeposit);

    let deposit_amount = deposit.value();
    let current_time = clock.timestamp_ms();
    let user = ctx.sender();

    // Calculate deposit fee
    let deposit_fee = (deposit_amount * vault.deposit_fee_bps) / BASIS_POINTS;
    let net_deposit_amount = deposit_amount - deposit_fee;

    // Split out fee
    let fee_coins = deposit.split(deposit_fee, ctx);

    // Send fee to collector
    sui::transfer::public_transfer(fee_coins, vault.fee_receiver);

    // Add deposited coins to vault's asset balance
    vault.deposit_asset.join(coin::into_balance(deposit));

    // Calculate shares to mint based on current USD NAV
    let nav_per_share = vault.apply_management_fee_to_nav(&agg, clock);
    let deposit_usd_value = decimal::mul(
        decimal::from(net_deposit_amount),
        get_usd_price_for_asset<L, T>(lending_market),
    ).floor();
    let shares_to_mint =
        (((deposit_usd_value as u128) * NAV_PRECISION) / (nav_per_share as u128)) as u64;

    assert!(shares_to_mint > 0, EInvalidDeposit);

    // Mint vault shares
    let vault_shares_balance = balance::increase_supply(&mut vault.share_supply, shares_to_mint);
    let vault_shares = coin::from_balance(vault_shares_balance, ctx);

    vault.total_shares = vault.total_shares + shares_to_mint;
    vault.utilization_rate_bps = vault.calculate_utilization_rate_bps(lending_market, &agg);

    // Emit fee collection event
    if (deposit_fee > 0) {
        event::emit(FeesAccrued {
            vault_id: object::id(vault),
            fee_type: FeeType::DepositFee,
            fee_amount: deposit_fee,
            fee_receiver: vault.fee_receiver,
            timestamp_ms: current_time,
        });
    };

    // Emit deposit event
    event::emit(VaultDeposit {
        vault_id: object::id(vault),
        user: user,
        deposit_amount: deposit_amount,
        shares_minted: shares_to_mint,
        timestamp_ms: current_time,
    });

    vault_shares
}

/// User burns shares and withdraws proportional assets with performance fees on realized gains
public fun withdraw<P, L, T>(
    vault: &mut Vault<P, T>,
    shares: Coin<P>,
    lending_market: &LendingMarket<L>,
    clock: &Clock,
    agg: VaultValueAggregate,
    ctx: &mut TxContext,
): Coin<T> {
    assert!(vault.version == CURRENT_VERSION, EIncorrectVersion);
    assert!(shares.value() > 0, EInsufficientShares);

    let shares_amount = shares.value();
    let user = ctx.sender();
    let current_time = clock.timestamp_ms();

    assert!(vault.total_shares >= shares_amount, EInsufficientShares);

    let current_nav_per_share = vault.apply_management_fee_to_nav(&agg, clock);
    // Calculate withdrawal amount based on current USD NAV
    let withdraw_usd_value = (
        ((shares_amount as u128) * (current_nav_per_share as u128)) / NAV_PRECISION,
    );
    let usd_price = get_usd_price_for_asset<L, T>(lending_market);
    let withdraw_amount = decimal::div(decimal::from(withdraw_usd_value as u64), usd_price).floor();

    // Calculate withdrawal fee on the gross amount
    let withdrawal_fee = (withdraw_amount * vault.withdrawal_fee_bps) / BASIS_POINTS;

    // Check if vault has sufficient liquidity for withdrawal
    let available_amount = vault.deposit_asset.value();
    assert!(withdraw_amount <= available_amount, EInsufficientLiquidity);

    // Net withdrawal amount after withdrawal fee
    let net_withdraw_amount = withdraw_amount - withdrawal_fee;

    assert!(net_withdraw_amount > 0, EInsufficientShares);

    // Burn the shares
    let shares_balance = shares.into_balance();
    balance::decrease_supply(&mut vault.share_supply, shares_balance);

    vault.total_shares = vault.total_shares - shares_amount;
    vault.utilization_rate_bps = vault.calculate_utilization_rate_bps(lending_market, &agg);

    // Withdraw full amount from vault's asset balance
    let mut withdrawn_balance = vault.deposit_asset.split(withdraw_amount);

    // Split out withdrawal fee
    if (withdrawal_fee > 0) {
        let fee_balance = withdrawn_balance.split(withdrawal_fee);
        let fee_coins = coin::from_balance(fee_balance, ctx);

        // Send fees to collector
        sui::transfer::public_transfer(fee_coins, vault.fee_receiver);
    };

    // Return net amount to user
    let coins = coin::from_balance(withdrawn_balance, ctx);

    // Emit withdrawal fee event
    if (withdrawal_fee > 0) {
        event::emit(FeesAccrued {
            vault_id: object::id(vault),
            fee_type: FeeType::WithdrawalFee,
            fee_amount: withdrawal_fee,
            fee_receiver: vault.fee_receiver,
            timestamp_ms: current_time,
        });
    };

    // Emit withdrawal event
    event::emit(VaultWithdraw {
        vault_id: object::id(vault),
        user: user,
        amount: net_withdraw_amount,
        shares_burned: shares_amount,
        timestamp_ms: current_time,
    });

    coins
}

public fun calculate_shares_to_mint<P, L, T>(
    vault: &Vault<P, T>,
    deposit_amount: u64,
    lending_market: &LendingMarket<L>,
    agg: VaultValueAggregate,
): u64 {
    let nav_per_share = vault.calculate_nav_per_share(&agg);
    let deposit_usd_value = decimal::mul(
        decimal::from(deposit_amount),
        get_usd_price_for_asset<L, T>(lending_market),
    ).floor();
    (((deposit_usd_value as u128) * NAV_PRECISION) / (nav_per_share as u128)) as u64
}

public fun calculate_shares_to_burn<P, L, T>(
    vault: &Vault<P, T>,
    withdraw_amount: u64,
    lending_market: &LendingMarket<L>,
    agg: VaultValueAggregate,
): u64 {
    if (vault.total_shares == 0) {
        0
    } else {
        let nav_per_share = vault.calculate_nav_per_share(&agg);
        let withdraw_usd_value = decimal::mul(
            decimal::from(withdraw_amount),
            get_usd_price_for_asset<L, T>(lending_market),
        ).floor();
        (((withdraw_usd_value as u128) * NAV_PRECISION) / (nav_per_share as u128)) as u64
    }
}

public fun calculate_withdraw_amount<P, L, T>(
    vault: &Vault<P, T>,
    shares_amount: u64,
    lending_market: &LendingMarket<L>,
    agg: VaultValueAggregate,
): u64 {
    if (vault.total_shares == 0) {
        0
    } else {
        let nav_per_share = vault.calculate_nav_per_share(&agg);
        let withdraw_usd_value = (
            ((shares_amount as u128) * (nav_per_share as u128)) / NAV_PRECISION,
        );
        let usd_price = get_usd_price_for_asset<L, T>(lending_market);
        decimal::div(decimal::from(withdraw_usd_value as u64), usd_price).floor()
    }
}

public fun calculate_deposit_amount<P, L, T>(
    vault: &Vault<P, T>,
    shares_amount: u64,
    lending_market: &LendingMarket<L>,
    agg: VaultValueAggregate,
): u64 {
    let nav_per_share = vault.calculate_nav_per_share(&agg);
    let deposit_usd_value = (((shares_amount as u128) * (nav_per_share as u128)) / NAV_PRECISION);
    let usd_price = get_usd_price_for_asset<L, T>(lending_market);
    decimal::div(decimal::from(deposit_usd_value as u64), usd_price).floor()
}

/// Check if vault can deploy more funds (under 70% utilization)
public fun can_deploy_funds<P, L, T>(
    vault: &Vault<P, T>,
    lending_market: &LendingMarket<L>,
    agg: &VaultValueAggregate,
    amount: u64,
): bool {
    let liquid_asset_value = vault.deposit_asset.value();
    let usd_price = get_usd_price_for_asset<L, T>(lending_market);
    let liquid_value = decimal::mul(decimal::from(liquid_asset_value), usd_price).floor();

    if (amount > liquid_value) {
        false
    } else {
        let new_liquid_value = liquid_value - amount;
        let total_value = agg.total_obligation_value_usd;
        if (total_value == 0) {
            true
        } else {
            let new_deployed = total_value - new_liquid_value;
            let new_utilization = (new_deployed * BASIS_POINTS) / total_value;
            new_utilization <= MAX_UTILIZATION_RATE_BPS
        }
    }
}

/// Total supply of shares
public fun total_supply<P, T>(vault: &Vault<P, T>): u64 {
    vault.total_shares
}

/// Calculate total lending market value
/// Returns all obligation (assets - liabilities) in base asset T
public fun calculate_lending_market_value<L, T>(
    obligation_ids: vector<ID>,
    lending_market: &LendingMarket<L>,
): u64 {
    let mut total_asset_value = 0;

    // Add value from all lending positions
    obligation_ids.do!(|obligation_id| {
        let obligation = lending_market.obligation(obligation_id);

        // Get net value from this obligation (deposits - borrows in asset terms)
        let net_value = calculate_obligation_net_value<_, T>(obligation, lending_market);
        total_asset_value = total_asset_value + net_value;
    });

    total_asset_value
}

/// Calculate net value of an obligation in asset-native terms
/// This converts all positions back to the base asset T
/// TODO: Should handle all assets, not just T tokens
fun calculate_obligation_net_value<P, T>(
    obligation: &Obligation<P>,
    lending_market: &LendingMarket<P>,
): u64 {
    let mut net_value = 0;

    // Add collateral deposits (converted from cTokens to underlying)
    let deposits = obligation.deposits();
    deposits.do_ref!(|deposit| {
        let reserve_index = deposit.reserve_array_index();
        let reserves = lending_market.reserves();
        let reserve = reserves.borrow(reserve_index);

        // Check if this deposit is in our base asset T
        if (reserve.coin_type() == type_name::with_defining_ids<T>()) {
            let ctoken_amount = deposit.deposited_ctoken_amount();
            let ctoken_ratio = reserve.ctoken_ratio();
            // Convert cTokens to underlying asset amount
            let underlying_amount = decimal::mul(
                decimal::from(ctoken_amount),
                ctoken_ratio,
            ).floor();
            net_value = net_value + underlying_amount;
        };
    });

    // Subtract borrowed amounts (if borrowed in base asset T)
    let borrows = obligation.borrows();
    borrows.do_ref!(|borrow| {
        let reserve_index = borrow.reserve_array_index();
        let reserves = lending_market.reserves();
        let reserve = reserves.borrow(reserve_index);

        // Check if this borrow is in our base asset T
        if (reserve.coin_type() == type_name::with_defining_ids<T>()) {
            let borrowed_amount = borrow.borrowed_amount().floor();
            net_value = if (net_value >= borrowed_amount) {
                net_value - borrowed_amount
            } else {
                0
            };
        };
    });

    net_value
}

/// Get the reserve for the base asset T
fun get_reserve_for_asset<L, T>(lending_market: &LendingMarket<L>): &reserve::Reserve<L> {
    let reserves = lending_market.reserves();
    let asset_type = type_name::with_defining_ids<T>();
    let reserve_index = reserves.find_index!(|reserve| {
        reserve.coin_type() == asset_type
    });
    if (reserve_index.is_some()) {
        reserves.borrow(*reserve_index.borrow())
    } else {
        abort ENoReserveForAsset
    }
}

/// Get USD price for asset T
fun get_usd_price_for_asset<L, T>(lending_market: &LendingMarket<L>): decimal::Decimal {
    let reserve = get_reserve_for_asset<L, T>(lending_market);
    // TODO
    //reserve.assert_price_is_fresh(clock);
    reserve.price_lower_bound()
}

fun calculate_nav_per_share<P, T>(vault: &Vault<P, T>, agg: &VaultValueAggregate): u64 {
    if (vault.total_shares == 0) {
        NAV_PRECISION as u64 // 1.0 scaled
    } else {
        let vault_value = agg.total_obligation_value_usd + agg.liquid_asset_value_usd;
        (((vault_value as u128) * NAV_PRECISION) / (vault.total_shares as u128)) as u64
    }
}

/// Apply management fee to NAV based on time elapsed
/// Returns the fee-adjusted NAV per share
fun apply_management_fee_to_nav<P, T>(
    vault: &mut Vault<P, T>,
    agg: &VaultValueAggregate,
    clock: &Clock,
): u64 {
    let base_nav_per_share = vault.calculate_nav_per_share(agg);

    if (vault.management_fee_bps == 0) {
        return base_nav_per_share
    };

    let current_time_s = clock.timestamp_ms() / 1000;

    let time_elapsed_s = current_time_s - vault.fee_last_update_timestamp_s;
    if (time_elapsed_s == 0) {
        return base_nav_per_share
    };

    // Calculate management fee reduction factor
    // Annual fee rate as decimal (e.g., 100 bps = 0.01)
    let annual_fee_rate = decimal::from_bps(vault.management_fee_bps);

    // Convert to per-second rate: annual_rate / seconds_per_year
    let per_second_rate = decimal::div(annual_fee_rate, decimal::from(SECONDS_PER_YEAR));

    // Fee factor for the elapsed time: elapsed_seconds * per_second_rate
    let fee_factor = decimal::mul(decimal::from(time_elapsed_s), per_second_rate);

    // Ensure fee factor doesn't exceed 100% (shouldn't happen with reasonable rates)
    let fee_factor = if (decimal::gt(fee_factor, decimal::from(1))) {
        decimal::from(1)
    } else {
        fee_factor
    };

    // Apply fee: nav_after_fee = nav_before_fee * (1 - fee_factor)
    let reduction_factor = decimal::sub(decimal::from(1), fee_factor);
    let adjusted_nav = decimal::mul(decimal::from(base_nav_per_share), reduction_factor);

    // Update timestamp
    vault.fee_last_update_timestamp_s = current_time_s;

    decimal::floor(adjusted_nav)
}

/// Calculate utilization rate in basis points
public fun calculate_utilization_rate_bps<P, L, T>(
    _vault: &Vault<P, T>,
    _lending_market: &LendingMarket<L>,
    agg: &VaultValueAggregate,
): u64 {
    let deployed_value = agg.total_obligation_value_usd;
    let liquid_value = agg.liquid_asset_value_usd;

    if (deployed_value == 0) {
        // zero utilization
        0
    } else if (liquid_value == 0) {
        // 100% utilization (shouldn't happen)
        BASIS_POINTS
    } else {
        let total_value = deployed_value + liquid_value;
        ((deployed_value as u128) * (BASIS_POINTS as u128) / (total_value as u128)) as u64
    }
}

/// Applies performance fees based on NAV growth
public fun compound_performance_fees<P, T>(
    vault: &mut Vault<P, T>,
    agg: VaultValueAggregate,
    clock: &Clock,
) {
    if (vault.performance_fee_bps == 0 || vault.total_shares == 0) {
        vault.last_nav_per_share = vault.calculate_nav_per_share(&agg);
        return
    };

    let current_nav_per_share = vault.calculate_nav_per_share(&agg);

    // Apply performance fee only on NAV growth
    if (current_nav_per_share > vault.last_nav_per_share) {
        let nav_growth = current_nav_per_share - vault.last_nav_per_share;
        let nav_growth_decimal = decimal::from(nav_growth);
        let total_shares_decimal = decimal::from(vault.total_shares);

        // Calculate total value of the NAV growth
        let total_growth_value = decimal::mul(
            nav_growth_decimal,
            decimal::div(total_shares_decimal, decimal::from(NAV_PRECISION as u64)),
        );

        // Apply performance fee by reducing NAV per share
        let performance_fee = decimal::mul(
            total_growth_value,
            decimal::from_bps(vault.performance_fee_bps),
        );

        // Calculate fee per share and reduce NAV
        let fee_per_share = decimal::div(
            decimal::mul(performance_fee, decimal::from(NAV_PRECISION as u64)),
            total_shares_decimal,
        );
        let adjusted_nav = decimal::sub(decimal::from(current_nav_per_share), fee_per_share);
        vault.last_nav_per_share = decimal::floor(adjusted_nav);

        // Emit performance fee event
        event::emit(FeesAccrued {
            vault_id: object::id(vault),
            fee_type: FeeType::PerformanceFee,
            fee_amount: decimal::floor(performance_fee),
            fee_receiver: vault.fee_receiver,
            timestamp_ms: clock.timestamp_ms(),
        });
    } else {
        vault.last_nav_per_share = current_nav_per_share;
    };
}

// === Vault Manager Functions ===

/// Validate that a manager cap belongs to a specific vault
public fun validate_manager_cap<P, T>(vault: &Vault<P, T>, manager_cap: &VaultManagerCap<P>) {
    assert!(manager_cap.vault_id == object::id(vault), EInvalidManager);
}

/// Create a new obligation for the vault
public fun create_obligation<P, L, T>(
    vault: &mut Vault<P, T>,
    vault_manager_cap: &VaultManagerCap<P>,
    lending_market: &mut LendingMarket<L>,
    ctx: &mut TxContext,
) {
    assert!(vault.version == CURRENT_VERSION, EIncorrectVersion);
    vault.validate_manager_cap(vault_manager_cap);

    let obligation_cap = lending_market.create_obligation(ctx);
    let obligation_id = obligation_cap.obligation_id();
    let mut obl_bag = bag::new(ctx);
    obl_bag.add(OBLIGATION_CAP_BAG_KEY, obligation_cap);
    let lending_market_type = type_name::with_defining_ids<L>();
    let obl = ObligationData {
        obligation_cap: obl_bag,
        obligation_id,
    };
    if (vault.obligations.contains(&lending_market_type)) {
        let obls = vault.obligations.get_mut(&lending_market_type);
        obls.push_back(obl);
    } else {
        let obls = vector::singleton(obl);
        vault.obligations.insert(lending_market_type, obls);
    };
}

/// Get obligation cap at lending_market_type + index (read-only)
public fun get_obligation_cap<P, L, T>(
    vault: &Vault<P, T>,
    lending_market_type: &TypeName,
    index: u64,
): &ObligationOwnerCap<L> {
    // TODO: access checks + error codes
    let obligations = vault.obligations.get(lending_market_type);
    let obl = obligations.borrow(index);
    obl.obligation_cap.borrow(OBLIGATION_CAP_BAG_KEY)
}

/// Get mutable obligation cap at lending_market_type + index (manager only)
public fun get_obligation_cap_mut<P, L, T>(
    vault_manager_cap: &VaultManagerCap<P>,
    vault: &mut Vault<P, T>,
    lending_market_type: &TypeName,
    index: u64,
): &mut ObligationOwnerCap<L> {
    // TODO: access checks + error codes
    vault.validate_manager_cap(vault_manager_cap);
    let obligations = vault.obligations.get_mut(lending_market_type);
    let obl = obligations.borrow_mut(index);
    obl.obligation_cap.borrow_mut(OBLIGATION_CAP_BAG_KEY)
}

/// Get number of obligations in vault
public fun obligation_count<P, T>(vault: &Vault<P, T>): u64 {
    let keys = vault.obligations.keys();
    let count = keys.fold!(0, |acc, k| {
        let obligations = vault.obligations.get(&k);
        acc + obligations.length()
    });
    count
}

/// Deploy funds from vault to lending market obligation
public fun deploy_funds<P, L, T>(
    vault: &mut Vault<P, T>,
    vault_manager_cap: &VaultManagerCap<P>,
    lending_market: &mut LendingMarket<L>,
    obligation_index: u64,
    amount: u64,
    clock: &Clock,
    agg: VaultValueAggregate,
    ctx: &mut TxContext,
): u64 {
    assert!(vault.version == CURRENT_VERSION, EIncorrectVersion);
    vault.validate_manager_cap(vault_manager_cap);
    assert!(amount > 0, EInvalidDeposit);

    // Check if vault has sufficient liquid assets
    let available_amount = vault.deposit_asset.value();
    assert!(available_amount >= amount, EInsufficientLiquidity);

    // Check if deployment would exceed utilization limits
    assert!(vault.can_deploy_funds(lending_market, &agg, amount), EInsufficientLiquidity);

    // Split funds from vault's deposit asset
    let deploy_balance = vault.deposit_asset.split(amount);
    let deploy_coin = coin::from_balance(deploy_balance, ctx);

    // Get reserve index for the asset type T
    let reserves = lending_market.reserves();
    let reserve_index_opt = reserves.find_index!(|reserve: &reserve::Reserve<L>| {
        reserve.coin_type() == type_name::with_defining_ids<T>()
    });
    assert!(option::is_some(&reserve_index_opt), ENoReserveForAsset);
    let reserve_array_index = *option::borrow(&reserve_index_opt);

    // Deposit liquidity and mint cTokens
    let ctokens = lending_market.deposit_liquidity_and_mint_ctokens<L, T>(
        reserve_array_index,
        clock,
        deploy_coin,
        ctx,
    );

    let ctokens_amount = ctokens.value();

    let lm_type = type_name::with_defining_ids<L>();
    let obligation_cap = vault.get_obligation_cap(&lm_type, obligation_index);

    // Deposit cTokens into the obligation
    lending_market.deposit_ctokens_into_obligation<L, T>(
        reserve_array_index,
        obligation_cap,
        clock,
        ctokens,
        ctx,
    );

    // Update vault utilization
    vault.utilization_rate_bps = vault.calculate_utilization_rate_bps(lending_market, &agg);

    event::emit(ManagerAllocate {
        vault_id: object::id(vault),
        user: ctx.sender(),
        deposit_amount: amount,
        timestamp_ms: clock.timestamp_ms(),
    });

    ctokens_amount
}

/// Withdraw funds from lending market obligation back to vault
public fun withdraw_deployed_funds<P, L, T>(
    vault: &mut Vault<P, T>,
    vault_manager_cap: &VaultManagerCap<P>,
    lending_market: &mut LendingMarket<L>,
    obligation_index: u64,
    ctoken_amount: u64,
    clock: &Clock,
    agg: VaultValueAggregate,
    ctx: &mut TxContext,
) {
    assert!(vault.version == CURRENT_VERSION, EIncorrectVersion);
    vault.validate_manager_cap(vault_manager_cap);
    assert!(ctoken_amount > 0, EInsufficientShares);

    let lm_type = type_name::with_defining_ids<L>();
    let obligation_cap = vault.get_obligation_cap(&lm_type, obligation_index);

    // Get reserve index for the asset type T
    let reserves = lending_market.reserves();
    let reserve_index_opt = reserves.find_index!(|reserve: &reserve::Reserve<L>| {
        reserve.coin_type() == type_name::with_defining_ids<T>()
    });
    assert!(option::is_some(&reserve_index_opt), ENoReserveForAsset);
    let reserve_array_index = *option::borrow(&reserve_index_opt);

    // Withdraw cTokens from obligation
    let ctokens = lending_market.withdraw_ctokens<L, T>(
        reserve_array_index,
        obligation_cap,
        clock,
        ctoken_amount,
        ctx,
    );

    // Redeem cTokens for underlying liquidity
    let withdrawn_coin = lending_market.redeem_ctokens_and_withdraw_liquidity<L, T>(
        reserve_array_index,
        clock,
        ctokens,
        option::none(), // No rate limiter exemption
        ctx,
    );

    let withdrawn_amount = withdrawn_coin.value();

    // Add withdrawn funds back to vault's deposit asset
    vault.deposit_asset.join(coin::into_balance(withdrawn_coin));

    // Update vault utilization
    vault.utilization_rate_bps = vault.calculate_utilization_rate_bps(lending_market, &agg);

    event::emit(ManagerDivest {
        vault_id: object::id(vault),
        user: ctx.sender(),
        amount: withdrawn_amount,
        timestamp_ms: clock.timestamp_ms(),
    });
}

// === Vault Value Aggregation ===

public fun create_vault_value_accumulator<P, T>(vault: &Vault<P, T>): VaultValueAccumulator {
    let keys = vault.obligations.keys();
    let obligation_ids = keys.map_ref!(|k| {
        let obligations = vault.obligations.get(k);
        obligations.map_ref!(|bg| {
            bg.obligation_id
        })
    });
    VaultValueAccumulator {
        obligation_ids: sui::vec_map::from_keys_values(keys, obligation_ids),
        lending_market_values: sui::vec_map::empty(),
    }
}

public fun process_lending_market<L, T>(
    acc: &mut VaultValueAccumulator,
    lending_market: &LendingMarket<L>,
) {
    let lending_market_type = type_name::with_defining_ids<L>();
    let (_, obligation_ids) = acc.obligation_ids.remove(&lending_market_type);
    let lending_market_value = calculate_lending_market_value<_, T>(obligation_ids, lending_market);

    let usd_price_t = get_usd_price_for_asset<L, T>(lending_market);
    let usd_value = decimal::from(lending_market_value).mul(usd_price_t).floor();

    acc.lending_market_values.insert(lending_market_type, usd_value);
}

public fun create_vault_value_aggregate<P, L, T>(
    acc: VaultValueAccumulator,
    vault: &Vault<P, T>,
    lending_market: &LendingMarket<L>,
): VaultValueAggregate {
    assert!(acc.obligation_ids.is_empty(), EIncompleteAccumulation);

    let liquid_asset_value_usd = {
        let liquid_asset_value = vault.deposit_asset.value();
        let usd_price = get_usd_price_for_asset<L, T>(lending_market);
        decimal::from(liquid_asset_value).mul(usd_price).floor()
    };

    let VaultValueAccumulator {
        obligation_ids: _,
        lending_market_values,
    } = acc;
    let ks = lending_market_values.keys();
    let total_obligation_value_usd = ks.fold!(0, |acc, k| {
        let val = *lending_market_values.get(&k);
        acc + val
    });
    VaultValueAggregate {
        liquid_asset_value_usd,
        total_obligation_value_usd,
        lending_market_values,
    }
}

// === Test Functions ===

#[test_only]
public fun create_vault_value_aggregate_for_testing<P, L, T>(
    vault: &Vault<P, T>,
    lending_market: &LendingMarket<L>,
): VaultValueAggregate {
    let mut acc = vault.create_vault_value_accumulator();
    if (!vault.obligations.is_empty()) {
        acc.process_lending_market<_, T>(lending_market);
    };
    let agg = acc.create_vault_value_aggregate(vault, lending_market);
    agg
}