import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export type BountySubmissionState =
  | "pendingSubmission"
  | "unassignedForOverdue"
  | "pendingReview"
  | "changeRequested"
  | "rejected"
  | "rejectedForUnaddressedChangeRequest"
  | "accepted"
  | "forceAccepted";

export interface BountySubmission {
  bounty: PublicKey;
  submissionIndex: number;
  assignee: PublicKey;
  assignedAt: BN;
  state: Partial<Record<BountySubmissionState, {}>>;

  linkToSubmission: string;
  firstSubmittedAt: BN;

  requestChangeCount: number;
  changeRequestedAt: BN | null;

  updatedAt: BN | null;
  unassignedAt: BN | null;
  rejectedAt: BN | null;
  acceptedAt: BN | null;
}
