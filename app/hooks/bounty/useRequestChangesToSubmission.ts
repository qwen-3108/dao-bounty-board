import { PublicKey } from "@solana/web3.js";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { requestChangesToSubmission } from "../../api";
import { CallbacksForUI } from "../../model/util.model";
import { useContributorRecord } from "../contributor-record/useContributorRecord";
import { useAnchorContext } from "../useAnchorContext";
import { useBounty } from "./useBounty";
import { useBountyActivities } from "./useBountyActivities";
import { useBountySubmissions } from "./useBountySubmissions";

export const useRequestChangesToSubmission = (
  // can be symbol or string
  realm: string,
  bountyPK: string,
  callbacks: CallbacksForUI = { onSuccess: undefined, onError: undefined }
) => {
  const { provider, program, wallet, walletConnected } = useAnchorContext();
  const { data: contributorRecord } = useContributorRecord(realm, {
    walletPK: wallet?.publicKey + "",
  });
  const { data: bounty, refetch: refetchBounty } = useBounty(bountyPK);
  const { data: bountySubmissions, refetch: refetchBountySubmissions } =
    useBountySubmissions(bountyPK);
  const { refetch: refetchBountyActivities } = useBountyActivities(bountyPK);

  const { enabled, instructionToEnable } = useMemo(() => {
    if (!walletConnected)
      return {
        enabled: false,
        instructionToEnable: "Connect your wallet first",
      };

    const activeSubmission =
      !!bountySubmissions?.length && bountySubmissions[0];

    if (activeSubmission?.account?.state === "changeRequested")
      return {
        enabled: false,
        instructionToEnable: "Work not pending review",
      };

    if (!activeSubmission || activeSubmission.account.state !== "pendingReview")
      return {
        enabled: false,
        instructionToEnable: "No work pending review",
      };

    if (activeSubmission && activeSubmission.account.requestChangeCount >= 3)
      return {
        enabled: false,
        instructionToEnable: "You can only request changes up to 3 times.",
      };

    return { enabled: true };
  }, [walletConnected, bountySubmissions]);

  const mutationResult = useMutation(
    (comment: string) =>
      requestChangesToSubmission({
        provider,
        program,
        bounty: {
          pubkey: new PublicKey(bountyPK),
          // @ts-ignore
          account: bounty,
        },
        bountySubmissionPK: new PublicKey(bountySubmissions[0].pubkey), // assume latest submission must be the active submission
        reviewerContributorRecordPK: new PublicKey(contributorRecord.pubkey),
        comment,
      }),
    {
      onSuccess: (data, variables, context) => {
        refetchBounty(); // with updated activity index
        refetchBountySubmissions();
        refetchBountyActivities();
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
