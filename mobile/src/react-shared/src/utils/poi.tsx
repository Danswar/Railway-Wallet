import {
  isDefined,
  Network,
  NetworkName,
  POI_SHIELD_PENDING_SEC,
  POI_SHIELD_PENDING_SEC_TEST_NET,
  POI_SHIELD_PENDING_SEC_TEST_NET_TEXT,
  POI_SHIELD_PENDING_SEC_TEXT,
  RailgunWalletBalanceBucket,
  TXIDVersion,
} from "@railgun-community/shared-models";
import { SavedTransaction } from "../models/transaction";
import { FrontendWallet } from "../models/wallet";
import { RailgunWalletBalances } from "../redux-store/reducers/erc20-balance-reducer-railgun";
import { tokenBalancesForWalletAndState } from "../services/wallet/wallet-balance-service";
import { networkForName } from "./networks";
import { isNonSpendableBucket } from "./util";
import { styleguide } from "../styles/styleguide";

export const getShieldingPOIDisclaimerMessage = (network: Network) => {
  const validationTimeText =
    network.isTestnet === true
      ? `${POI_SHIELD_PENDING_SEC_TEST_NET_TEXT} must pass (on testnets)`
      : `${POI_SHIELD_PENDING_SEC_TEXT} must pass`;

  return `
"Shielding" means adding tokens to your hidden 0zk address, where you retain full non-custodial control.

Clicking "Shield" also initiates a Private Proof of Innocence (Private POI). Private POIs help to prevent bad actors from using Railway, keeping the tool hygienic and your tokens safe.

This is the process:

1. ${validationTimeText} before your shielded funds can be used for purposes other than returning to your public address, known as the Unshield-only Standby Period. During this standby period, like any other time with your 0zk address, no person other than yourself can see or control your tokens. If something urgent comes up, you will still be able to unshield them to origin without waiting.

2. The Private POI system creates a zero-knowledge proof (a small piece of data) confirming that your shield is not associated with a list of dangerous addresses. Initially, there is only the free and public OFAC designated list updated by Chainalysis at https://public.chainalysis.com/api/v1/. (To be clear, no data is shared with Chainalysis — they are only giving away a free list.) In the future, knowledgeable community organizations will likely publish and update additional lists to help wallet users avoid bad actors, giving Railway Wallet users the choice of which lists to use. Railway Wallet itself does not create or update these lists. Shields that are associated with any designated lists cannot successfully create a Private POI and will not be able to use Railway Wallet, only having the option to unshield to origin - those tokens will be otherwise unspendable.

3. The Private POI system and Railway Wallet app do not share any transaction history with anyone, including app publishers or contributors. Transactions from 0zk wallets remain impossible to deanonymize, as they are encrypted to all outside viewers. Private POI proofs are blinded, revealing no information about the underlying transaction. Proofs are generated on your device and, as they are zero-knowledge, remain completely private.

Private POI is a groundbreaking system, and Railway Wallet is the first app to ever successfully use it. Help us with our mission of being the best high-tech, non-profit, ad-free, and privacy-respecting wallet app.
      `;
};

export const getTransferPOIDisclaimerMessage = () => {
  return `
Please keep Railway open and active after sending a 0zk-0zk transfer (up to 30 seconds on desktop/web and 1-2 minutes on mobile) until a Private Proof of Innocence is created. This will guarantee that the recipient will be able to use those tokens immediately.

Why?

Private Proofs of Innocence are created after a transaction is confirmed. For the transferred tokens to be spendable by the recipient, a valid Private Proof of Innocence will be auto-generated by the sender whilst the Wallet is open. In the meantime, the transfer will show as "Incomplete" on the recipient's wallet. If the sender closes the app before the Private POI is created, they may simply re-open it and wait for the POI to generate.

Is there any risk to the receiver?

If you use Railway Wallet, there is a guarantee that private transactions can generate a Proof of Innocence. There is no risk that tokens will be unspendable if you give enough time after a transaction to allow a proof to generate.
      `;
};

export const getPOIBalancesDisclaimerMessage = () => {
  return `
There are 4 balance types within Railway Wallet depending on Private POI status. Please note the following.

Spendable: Tokens marked as Spendable have a valid Private POI and can be spent by your 0zk address with no limitations.

Pending: Tokens currently in the Unshield-Only Standby Period. After this period, you will be able to generate a Private POI. You still retain full control over these tokens during the Unshield-Only Standby Period and can unshield them back to the original depositing address.

Incomplete: “Incomplete” tokens have passed the Unshield-Only spending period and are currently waiting on a Private POI. Please wait a few moments for your wallet to generate a Private POI check OR, if you received tokens from another wallet, please ask the sender to open their Railway Wallet app to complete the Private POI process.

Restricted: Tokens that are from known undesirable activity as indicated by a list provider. These tokens will not become Spendable and Unshielding to the original address is the only option.
      `;
};

export const getTokensPendingBalances = (
  activeWallet: Optional<FrontendWallet>,
  railgunWalletBalances: Optional<RailgunWalletBalances>,
  currentTxidVersion: TXIDVersion,
  isRailgun: boolean
): string[] => {
  if (!isRailgun) return [];

  const nonSpendableBalances = tokenBalancesForWalletAndState(
    activeWallet,
    undefined,
    railgunWalletBalances,
    isRailgun,
    currentTxidVersion,
    Object.values(RailgunWalletBalanceBucket).filter((bucket) =>
      isNonSpendableBucket(bucket)
    )
  );

  const nonZeroBalances = Object.entries(nonSpendableBalances)
    .map(([key, value]) => ({
      key,
      value,
    }))
    .filter(
      (tokenBalance) =>
        isDefined(tokenBalance.value) && BigInt(tokenBalance.value) > 0n
    );

  return nonZeroBalances.map((b) => b.key);
};

export const getWaitTimeForShieldPending = (
  networkName: NetworkName
): Optional<number> => {
  const network = networkForName(networkName);

  const buffer = 60;

  if (network) {
    if (network.isTestnet === true) {
      return POI_SHIELD_PENDING_SEC_TEST_NET + buffer;
    }
    return POI_SHIELD_PENDING_SEC + buffer;
  }

  return undefined;
};

export const getMaxShieldPendingTimeText = (network: Network) => {
  let pendingTimeSec = POI_SHIELD_PENDING_SEC;
  if (network.isTestnet ?? false) {
    pendingTimeSec = POI_SHIELD_PENDING_SEC_TEST_NET;
  }

  let timeStr = "";
  if (pendingTimeSec < 60) {
    timeStr = `${Math.round(pendingTimeSec)} seconds`;
  } else if (pendingTimeSec < 60 * 60) {
    timeStr = `${Math.round(pendingTimeSec / 60)} minutes`;
  } else {
    const roundedTime = Math.round(pendingTimeSec / (60 * 60));
    const hourStr = roundedTime === 1 ? "hour" : "hours";
    timeStr = `${roundedTime} ${hourStr}`;
  }

  return timeStr;
};

export const formatBalanceBucketStatus = (
  balanceBucket: RailgunWalletBalanceBucket
): string => {
  switch (balanceBucket) {
    case RailgunWalletBalanceBucket.ShieldPending:
      return "Shield Pending";
    case RailgunWalletBalanceBucket.ProofSubmitted:
      return "Proof Submitted";
    case RailgunWalletBalanceBucket.MissingExternalPOI:
      return "Missing External POI";
    case RailgunWalletBalanceBucket.MissingInternalPOI:
      return "Missing Internal POI";
    case RailgunWalletBalanceBucket.ShieldBlocked:
      return "Shield Restricted";
    case RailgunWalletBalanceBucket.Spendable:
      return "Spendable";
    case RailgunWalletBalanceBucket.Spent:
      return "Spent";
  }
};

export const getShieldPendingCompleteText = (
  txTimestamp: number,
  network: Network
): string => {
  const now = Date.now() / 1000;
  const txSecAgo = now - txTimestamp;

  let pendingTimeSec = POI_SHIELD_PENDING_SEC;
  if (network.isTestnet ?? false) {
    pendingTimeSec = POI_SHIELD_PENDING_SEC_TEST_NET;
  }

  const secLeft = pendingTimeSec - txSecAgo;

  let timeStr = "";
  if (secLeft <= 0) {
    return "Will be available soon";
  } else if (secLeft < 60) {
    timeStr = `${Math.round(secLeft)}s`;
  } else if (secLeft < 60 * 60) {
    timeStr = `${Math.round(secLeft / 60)}m`;
  } else if (secLeft < 60 * 60 * 24) {
    timeStr = `${Math.round(secLeft / (60 * 60))}h`;
  }
  return `Est. ${timeStr} in revert-only standby period`;
};

export const getTransactionPOIStatusInfoText = (
  balanceBucket: RailgunWalletBalanceBucket,
  transaction: SavedTransaction,
  network: Network
): Optional<string> => {
  switch (balanceBucket) {
    case RailgunWalletBalanceBucket.ShieldPending:
      return getShieldPendingCompleteText(transaction.timestamp, network);
    case RailgunWalletBalanceBucket.ProofSubmitted:
      return "Private Proof of Innocence will begin shortly.";
    case RailgunWalletBalanceBucket.MissingExternalPOI: {
      const poiLaunchTimestamp = network.poi?.launchTimestamp;
      const transactionIsBeforePOILaunch =
        isDefined(poiLaunchTimestamp) &&
        (poiLaunchTimestamp === 0 ||
          transaction.timestamp < poiLaunchTimestamp);

      if (transactionIsBeforePOILaunch) {
        return "This transaction occurred before Private Proof of Innocence launched on this network. Please wait. Your wallet will make these funds spendable within a few minutes.";
      }

      return "Please request Private Proof of Innocence from sender. Your sender may simply open Railway Wallet to kick off Private POI generation.";
    }
    case RailgunWalletBalanceBucket.MissingInternalPOI:
      return "This transaction includes a change output. Please wait. Your wallet will make these funds spendable within a few minutes.";
    case RailgunWalletBalanceBucket.ShieldBlocked:
      return "This shield transaction was blocked for use in RAILGUN. You can safely unshield the tokens to the origin address. Public broadcaster functionality will be disabled.";
    case RailgunWalletBalanceBucket.Spendable:
    case RailgunWalletBalanceBucket.Spent:
      return undefined;
  }
};

export const getTransactionPOIStatusColor = (
  balanceBucket: RailgunWalletBalanceBucket
) => {
  switch (balanceBucket) {
    case RailgunWalletBalanceBucket.Spendable:
    case RailgunWalletBalanceBucket.Spent:
      return styleguide.colors.txGreen();
    case RailgunWalletBalanceBucket.ShieldPending:
    case RailgunWalletBalanceBucket.ProofSubmitted:
      return styleguide.colors.txYellow();
    case RailgunWalletBalanceBucket.MissingInternalPOI:
      return styleguide.colors.txOrange();
    case RailgunWalletBalanceBucket.ShieldBlocked:
    case RailgunWalletBalanceBucket.MissingExternalPOI:
      return styleguide.colors.txRed();
  }
};
