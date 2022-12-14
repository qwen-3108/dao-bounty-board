import { useRealms } from "./useRealms";
import { useSelector } from "../useSelector";
import { useQuery } from "@tanstack/react-query";
import { useAnchorContext } from "../useAnchorContext";
import { getUserRealms } from "../../api/realm";
import { UIRealmsItem } from "../../model/realm.model";

export const useUserRealms = () => {
  const { connection, wallet } = useAnchorContext();
  const { data: realms } = useRealms();

  // return useSelector({
  //   data: realms,
  //   selector: (r) => r.userIdentities?.length !== 0,
  //   sorts: [
  //     { field: "bountyBoard", order: "desc" },
  //     { field: "meta", order: "desc" },
  //   ],
  // });

  return useQuery(
    ["realms", "isMember", wallet?.publicKey + ""],
    async () => {
      const userRealms = await getUserRealms(connection, wallet.publicKey);

      const uiRealms: UIRealmsItem[] = [];
      for (const [realmPkStr, userVotingIdentities] of Object.entries(
        userRealms
      )) {
        const relevantRealm = realms.find(
          (r) => r.pubkey.toString() === realmPkStr
        );
        relevantRealm.userIdentities = userVotingIdentities;
        // push to uiRealms
        uiRealms.push(relevantRealm);
      }

      return uiRealms;
    },
    {
      enabled: !!wallet && !!realms && !!connection,
    }
  );
};

// pub struct TokenOwnerRecordV2 {
//     /// Governance account type
//     pub account_type: GovernanceAccountType,

//     /// The Realm the TokenOwnerRecord belongs to
//     pub realm: Pubkey,

//     /// Governing Token Mint the TokenOwnerRecord holds deposit for
//     pub governing_token_mint: Pubkey,

//     /// The owner (either single or multisig) of the deposited governing SPL Tokens
//     /// This is who can authorize a withdrawal of the tokens
//     pub governing_token_owner: Pubkey,

//     /// The amount of governing tokens deposited into the Realm
//     /// This amount is the voter weight used when voting on proposals
//     pub governing_token_deposit_amount: u64,

//     /// The number of votes cast by TokenOwner but not relinquished yet
//     /// Every time a vote is cast this number is increased and it's always decreased when relinquishing a vote regardless of the vote state
//     pub unrelinquished_votes_count: u32,

//     /// The total number of votes cast by the TokenOwner
//     /// If TokenOwner withdraws vote while voting is still in progress total_votes_count is decreased  and the vote doesn't count towards the total
//     pub total_votes_count: u32,

//     /// The number of outstanding proposals the TokenOwner currently owns
//     /// The count is increased when TokenOwner creates a proposal
//     /// and decreased  once it's either voted on (Succeeded or Defeated) or Cancelled
//     /// By default it's restricted to 1 outstanding Proposal per token owner
//     pub outstanding_proposal_count: u8,

//     /// Reserved space for future versions
//     pub reserved: [u8; 7],

//     /// A single account that is allowed to operate governance with the deposited governing tokens
//     /// It can be delegated to by the governing_token_owner or current governance_delegate
//     pub governance_delegate: Option<Pubkey>,

//     /// Reserved space for versions v2 and onwards
//     /// Note: This space won't be available to v1 accounts until runtime supports resizing
//     pub reserved_v2: [u8; 128],
// }
