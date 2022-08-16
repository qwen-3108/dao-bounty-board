import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";

export interface BountyBoard {
  realm: PublicKey;
  authority: PublicKey; // to be the council/community mint governance
  config: BountyBoardConfig;
  bountyIndex: BN;
}

export interface BountyBoardConfig {
  tiers: BountyTier[];
  roles: RoleSetting[];
  lastRevised: BN; // date in epoch seconds
}

export type Permission =
  | "createBounty"
  | "updateBounty"
  | "deleteBounty"
  | "assignBounty"
  | "requestChangeToSubmission"
  | "acceptSubmission"
  | "rejectSubmission";

export interface RoleSetting {
  roleName: string;
  default: boolean;
  permissions: Partial<Record<Permission, {}>>[];
}

export interface BountyTier {
  tierName: string;
  difficultyLevel: string;

  minRequiredReputation: BN;
  minRequiredSkillsPt: BN;

  reputationReward: BN;
  skillsPtReward: BN;
  payoutReward: BN;
  payoutMint: PublicKey;
}
