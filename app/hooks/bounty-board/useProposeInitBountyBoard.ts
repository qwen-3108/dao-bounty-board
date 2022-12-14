import { PublicKey } from "@solana/web3.js";
import { useMutation } from "@tanstack/react-query";
import { BN } from "@project-serum/anchor";
import { proposeInitBountyBoard } from "../../api";
import { DUMMY_MINT_PK } from "../../api/constants";
import { InitialContributorWithRole } from "../../api/utils";
import { BountyBoardConfig, Permission } from "../../model/bounty-board.model";
import { CallbacksForUI } from "../../model/util.model";
import { useRealm } from "../realm/useRealm";
import {
  UserProposalEntity,
  useUserProposalEntitiesInRealm,
} from "../realm/useUserProposalEntitiesInRealm";
import { useAnchorContext } from "../useAnchorContext";
import { useActiveBountyBoardProposals } from "./useActiveBountyBoardProposals";
import { useMemo } from "react";
import { useBountyBoardByRealm } from "./useBountyBoardByRealm";

export interface ProposeInitBountyBoardArgs {
  userProposalEntity: UserProposalEntity;
  boardConfig: Omit<BountyBoardConfig, "lastRevised">;
  firstVaultMint: PublicKey;
  amountToFundBountyBoardVault: number;
  initialContributorsWithRole: InitialContributorWithRole[];
}

export const useProposeInitBountyBoard = (
  // can be symbol or address
  realm: string,
  callbacks: CallbacksForUI = { onSuccess: undefined, onError: undefined }
) => {
  const { program, walletConnected } = useAnchorContext();
  const { data: realmAccount, isLoading: isLoadingRealmAccount } =
    useRealm(realm);
  const {
    data: userProposalEntitiesInRealm,
    isLoading: isLoadingUserProposalEntities,
  } = useUserProposalEntitiesInRealm(realm);
  const { refetch: refetchActiveProposals } =
    useActiveBountyBoardProposals(realm);
  const { data: bountyBoard, isLoading: isLoadingBountyBoard } =
    useBountyBoardByRealm(realm);

  const { enabled, instructionToEnable } = useMemo(() => {
    if (!walletConnected)
      return {
        enabled: false,
        instructionToEnable: "Connect your wallet first",
      };
    if (
      isLoadingRealmAccount ||
      isLoadingUserProposalEntities ||
      isLoadingBountyBoard
    )
      return {
        enabled: false,
        instructionToEnable: "Loading...",
      };
    if (!userProposalEntitiesInRealm?.length)
      return {
        enabled: false,
        instructionToEnable: "You're a not a member of this DAO",
      };
    if (bountyBoard?.account)
      return {
        enabled: false,
        instructionToEnable: "This realm already has a bounty board",
      };
    return { enabled: true };
  }, [
    walletConnected,
    userProposalEntitiesInRealm?.length,
    !!bountyBoard?.account,
  ]);

  const mutationResult = useMutation(
    ({
      userProposalEntity,
      boardConfig,
      firstVaultMint,
      amountToFundBountyBoardVault,
      initialContributorsWithRole,
    }: ProposeInitBountyBoardArgs) =>
      proposeInitBountyBoard(
        program,
        realmAccount?.pubkey,
        userProposalEntity,
        boardConfig,
        firstVaultMint,
        amountToFundBountyBoardVault,
        initialContributorsWithRole
      ),
    {
      onSuccess: (data, variables, context) => {
        refetchActiveProposals();
        if (callbacks?.onSuccess) {
          callbacks.onSuccess(data, variables, context);
        }
      },
      onError: (err, variables, context) => {
        console.error(err);
        if (callbacks?.onError) {
          callbacks?.onError(err, variables, context);
        }
      },
    }
  );

  return {
    enabled,
    instructionToEnable,
    ...mutationResult,
  };
};

// --- default values

export const getTiersInVec = (PAYOUT_MINT: PublicKey) => [
  {
    tierName: "Entry",
    difficultyLevel: "First contribution",
    minRequiredReputation: 0,
    minRequiredSkillsPt: new BN(0),
    reputationReward: 10,
    skillsPtReward: new BN(10),
    payoutReward: new BN(50 * 1000000), // 50 usdc
    payoutMint: PAYOUT_MINT,
    taskSubmissionWindow: 7 * 24 * 3600, // 7 days
    submissionReviewWindow: 3 * 24 * 3600, // 3 days
    addressChangeReqWindow: 3 * 24 * 3600, // 3 days
  },
  {
    tierName: "A",
    difficultyLevel: "Easy",
    minRequiredReputation: 50,
    minRequiredSkillsPt: new BN(50),
    reputationReward: 20,
    skillsPtReward: new BN(20),
    payoutReward: new BN(200 * 1000000),
    payoutMint: PAYOUT_MINT,
    taskSubmissionWindow: 14 * 24 * 3600, // 14 days
    submissionReviewWindow: 7 * 24 * 3600, // 7 days
    addressChangeReqWindow: 7 * 24 * 3600, // 7 days
  },
  {
    tierName: "AA",
    difficultyLevel: "Moderate",
    minRequiredReputation: 100,
    minRequiredSkillsPt: new BN(100),
    reputationReward: 50,
    skillsPtReward: new BN(50),
    payoutReward: new BN(500 * 1000000),
    payoutMint: PAYOUT_MINT,
    taskSubmissionWindow: 30 * 24 * 3600, // 30 days
    submissionReviewWindow: 7 * 24 * 3600, // 7 days
    addressChangeReqWindow: 7 * 24 * 3600, // 7 days
  },
  {
    tierName: "S",
    difficultyLevel: "Complex",
    minRequiredReputation: 500,
    minRequiredSkillsPt: new BN(500),
    reputationReward: 100,
    skillsPtReward: new BN(100),
    payoutReward: new BN(2000 * 1000000),
    payoutMint: PAYOUT_MINT,
    taskSubmissionWindow: 60 * 24 * 3600, // 60 days
    submissionReviewWindow: 14 * 24 * 3600, // 14 days
    addressChangeReqWindow: 14 * 24 * 3600, // 14 days
  },
];
export const getRolesInVec = () => [
  {
    roleName: "Core",
    permissions: Permission.names().map((p) => ({ [p]: {} })),
    default: false,
  },
  { roleName: "Contributor", permissions: [], default: true },
];

export const DEFAULT_CONFIG = {
  roles: getRolesInVec(),
  tiers: getTiersInVec(new PublicKey(DUMMY_MINT_PK.USDC)),
};
