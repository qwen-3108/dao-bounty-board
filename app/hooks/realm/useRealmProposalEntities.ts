import { useQuery } from "@tanstack/react-query";
import { getRealmProposalEntities } from "../../api/realm";
import { useAnchorContext } from "../useAnchorContext";
import { useRealm } from "./useRealm";

export const useRealmProposalEntities = (realm: string) => {
  const { provider, wallet } = useAnchorContext();
  const { data: realmAccount } = useRealm(realm);

  return useQuery(
    ["realm-proposal-identities", realm],
    async () => {
      console.log("[UseRealmProposalEntities] getRealmProposalEntities run");
      return getRealmProposalEntities(provider.connection, realmAccount);
    },
    {
      enabled: !!wallet && !!realmAccount,
    }
  );
};
