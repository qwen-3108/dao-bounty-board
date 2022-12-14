import { BN, Program } from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { DaoBountyBoard } from "../../target/types/dao_bounty_board";
import {
  ContributorRecord,
  ContributorRecordItem,
} from "../model/contributor-record.model";
import { BountyBoardProgramAccount } from "../model/util.model";
import { bytesToStr } from "../utils/encoding";
import { _BNtoBigInt } from "../utils/number-transform";

export const getContributorRecord = async (
  program: Program<DaoBountyBoard>,
  contributorRecordPK: PublicKey
): Promise<ContributorRecord | null> => {
  const contributorRecord =
    await program.account.contributorRecord.fetchNullable(contributorRecordPK);
  // @ts-ignore
  return contributorRecord
    ? {
        ...contributorRecord,
        role: bytesToStr(contributorRecord.role),
        // TODO: convert skills pt to UI friendly version
        // skillsPt: contributorRecord.skillsPt
      }
    : null;
};

export const getContributorRecords = async (
  connection: Connection,
  program: Program<DaoBountyBoard>,
  realmPK: PublicKey
): Promise<BountyBoardProgramAccount<ContributorRecordItem>[]> => {
  // filter by realm PK
  const contributorRecords = await connection.getProgramAccounts(
    program.programId,
    {
      dataSlice: { offset: 8 + 32, length: 32 },
      filters: [
        { memcmp: program.coder.accounts.memcmp("contributorRecord") },
        { memcmp: { offset: 8, bytes: realmPK.toString() } },
      ],
    }
  );
  // Example data buffer [67,111,114,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  return contributorRecords.map((c) => ({
    pubkey: c.pubkey.toString(),
    account: {
      role: bytesToStr(c.account.data.subarray(0, 24)),
      reputation: _BNtoBigInt(new BN(c.account.data.subarray(24), "le")),
    },
  }));
};

export const getPagedContributorRecords = async (
  program: Program<DaoBountyBoard>,
  contributorRecordPKs: PublicKey[]
): Promise<BountyBoardProgramAccount<ContributorRecord>[]> => {
  const contributorRecords =
    await program.account.contributorRecord.fetchMultiple(contributorRecordPKs);
  // @ts-ignore, return type is hard asserted
  return contributorRecords.map((acc, i) => ({
    pubkey: contributorRecordPKs[i].toString(),
    account: acc
      ? {
          ...acc,
          // @ts-ignore
          role: bytesToStr(acc.role),
        }
      : null,
  }));
};
