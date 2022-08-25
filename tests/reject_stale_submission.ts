import { AnchorProvider, Program, setProvider } from "@project-serum/anchor";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { BOUNTY_BOARD_PROGRAM_ID, DUMMY_MINT_PK } from "../app/api/constants";
import idl from "../target/idl/dao_bounty_board.json";
import { DaoBountyBoard } from "../target/types/dao_bounty_board";
import {
  assignBounty,
  cleanUpCreateBounty,
  DEFAULT_BOUNTY_DETAILS,
  createBounty,
  cleanUpAssignBounty,
} from "./setup_fixtures/bounty";
import {
  cleanUpApplyToBounty,
  applyToBounty,
} from "./setup_fixtures/bounty_application";
import {
  addBountyBoardTierConfig,
  cleanUpBountyBoard,
  getTiersInVec,
  seedBountyBoardVault,
  setupBountyBoard,
} from "./setup_fixtures/bounty_board";
import {
  rejectStaleSubmission,
  requestChangesToSubmission,
  submitToBlankSubmission,
  updateSubmission,
} from "./setup_fixtures/bounty_submission";
import {
  cleanUpContributorRecord,
  setupContributorRecord,
} from "./setup_fixtures/contributor_record";
import { assertReject } from "./utils/assert-promise-utils";
import { sleep } from "./utils/common";

describe("reject stale submission", () => {
  // Configure the client to use the local cluster.
  const provider = AnchorProvider.env();
  setProvider(provider);

  const providerWalletPublicKey = provider.wallet.publicKey;
  console.log("Provider wallet public key", providerWalletPublicKey.toString());

  const programId = new PublicKey(BOUNTY_BOARD_PROGRAM_ID);
  const program = new Program(
    JSON.parse(JSON.stringify(idl)),
    programId
  ) as Program<DaoBountyBoard>;

  // accounts involved in this test
  let TEST_REALM_PK = new PublicKey(
    "D7uqCFCYxPQr19ve7hL3x3gUhwtaV45eoRN7iotyeo9U"
  );
  let TEST_REALM_GOVERNANCE = Keypair.fromSeed(TEST_REALM_PK.toBytes());
  const TEST_REALM_TREASURY_USDC_ATA = new PublicKey(
    "EoCo8zx6fZiAmwNxG1xqLKHYtsQapNx39wWTJvGZaZwq"
  ); // my own ATA for the mint

  let TEST_BOUNTY_BOARD_PK;
  let TEST_BOUNTY_BOARD_VAULT_PK;

  let TEST_BOUNTY_PK;
  let TEST_BOUNTY_ESCROW_PK;
  let TEST_CREATOR_CONTRIBUTOR_RECORD_PK;

  let TEST_APPLICANT_WALLET = Keypair.fromSecretKey(
    bs58.decode(
      "61J7rnnjQPWbW6MyRkqFzWRgTSM8RM1KSAr9mB2VbkBojYUerhAR8YRkHC4sxh6y2j54zKezUfSsUruuSaKr1TJ5"
    )
  );
  let TEST_APPLICANT_CONTRIBUTOR_RECORD_PK;
  let TEST_BOUNTY_APPLICATION_PK;
  let TEST_BOUNTY_ACTIVITY_APPLY_PK;

  let TEST_BOUNTY_SUBMISSION_PK;
  let TEST_BOUNTY_ACTIVITY_ASSIGN_PK;

  // Test realm public key D7uqCFCYxPQr19ve7hL3x3gUhwtaV45eoRN7iotyeo9U
  // Test realm governance public key 3DqNuhEXXUj531shswW8RxFq6WDmNf3rgSW6TzCDU9oY
  // Bounty board PDA 9P2gWu3D6AJHiiARrHpVbKG77Z37AjuvQMzz7NfMJZ1h
  // Bounty board vault PDA BQeLW4eqNHuUkEH6QhiXvRFU44U5hEe7RQeyYPgD3stW
  // Test creator contributor record PDA 28XuY117DmcVqvkvmUXWUCDsM5sDoCGSz68GTPksd8u5
  // Bounty PDA AMKvaLdMaj8yBuBt56tshKs94CgVEmgkw4z3VQzMh3RQ
  // Bounty Escrow PDA EGr2Yu5RxJ7mVWdVP376hhR5KoNAtwh16MNrv6xH85Tk
  // Test applicant public key EBPig4UEErUmNc9uuHvCLiJzRqQw2ggdDcjJngVRkJFF
  // Test applicant secret key 61J7rnnjQPWbW6MyRkqFzWRgTSM8RM1KSAr9mB2VbkBojYUerhAR8YRkHC4sxh6y2j54zKezUfSsUruuSaKr1TJ5
  // Test applicant wallet lamport balance 0
  // Applicant contributor record PDA 2NrnRQeYNGbcPttHT9HMVzqNTd8nd74r5fbhF2yEokqY
  // Bounty application PDA Co3hU4ui8DrYARaAvMnMEKGwZBTYqyuKancRWdvd2geL
  // Bounty activity (Apply) PDA DNVDCqdpQSDuXRYAzwoyHGmxTv8xfctWpAnoAT7q8Xje
  // Bounty submission PDA 3xW2WyKheTccjBmrLWm2v4urou9Zmz13rRB8PutCe2du
  // Bounty activity (Assign) PDA CGBwZXHYnKsZdkzQskEYZ7wVmHqzyAKnEvqZqEtgKnpN

  // acc level fields involved in this test
  let TEST_BOUNTY_ASSIGN_COUNT;
  let CURRENT_BOUNTY_ACTIVITY_INDEX;

  // test specific setup fn
  // product a bounty submission with request_change_count = 1
  const testSetupWithVaryingBountyTier = async (tierName: string) => {
    // in this test, Entry tier bounty is set to have task submission window of 1 s to facilitate testing

    // set up bounty
    const { bountyPDA, bountyEscrowPDA, bountyAcc } = await createBounty(
      provider,
      program,
      TEST_BOUNTY_BOARD_PK,
      TEST_BOUNTY_BOARD_VAULT_PK,
      TEST_CREATOR_CONTRIBUTOR_RECORD_PK,
      {
        ...DEFAULT_BOUNTY_DETAILS,
        tier: tierName,
      }
    );
    TEST_BOUNTY_PK = bountyPDA;
    TEST_BOUNTY_ESCROW_PK = bountyEscrowPDA;
    TEST_BOUNTY_ASSIGN_COUNT = bountyAcc.assignCount;
    CURRENT_BOUNTY_ACTIVITY_INDEX = bountyAcc.activityIndex;

    // create bounty application
    console.log(
      "Test applicant public key",
      TEST_APPLICANT_WALLET.publicKey.toString()
    );
    console.log(
      "Test applicant secret key",
      bs58.encode(TEST_APPLICANT_WALLET.secretKey)
    );
    const {
      applicantContributorRecordPDA,
      bountyApplicationPDA,
      bountyActivityApplyPDA,
      updatedBountyAcc,
    } = await applyToBounty(
      provider,
      program,
      TEST_BOUNTY_BOARD_PK,
      TEST_BOUNTY_PK,
      CURRENT_BOUNTY_ACTIVITY_INDEX,
      TEST_APPLICANT_WALLET,
      7 * 24 * 3600 // 1wk
    );
    TEST_APPLICANT_CONTRIBUTOR_RECORD_PK = applicantContributorRecordPDA;
    TEST_BOUNTY_APPLICATION_PK = bountyApplicationPDA;
    TEST_BOUNTY_ACTIVITY_APPLY_PK = bountyActivityApplyPDA;
    CURRENT_BOUNTY_ACTIVITY_INDEX = updatedBountyAcc.activityIndex;

    // assign bounty
    const {
      bountyAccAfterAssign,
      bountySubmissionPDA,
      bountyActivityAssignPDA,
    } = await assignBounty(
      provider,
      program,
      TEST_BOUNTY_PK,
      TEST_BOUNTY_ASSIGN_COUNT,
      CURRENT_BOUNTY_ACTIVITY_INDEX,
      TEST_BOUNTY_APPLICATION_PK
    );
    TEST_BOUNTY_SUBMISSION_PK = bountySubmissionPDA;
    TEST_BOUNTY_ACTIVITY_ASSIGN_PK = bountyActivityAssignPDA;
    CURRENT_BOUNTY_ACTIVITY_INDEX = bountyAccAfterAssign.activityIndex;

    // create submission
    await submitToBlankSubmission(
      provider,
      program,
      TEST_BOUNTY_PK,
      TEST_BOUNTY_SUBMISSION_PK,
      TEST_APPLICANT_CONTRIBUTOR_RECORD_PK,
      TEST_APPLICANT_WALLET
    );

    // request change to submission
    await requestChangesToSubmission(
      provider,
      program,
      TEST_BOUNTY_SUBMISSION_PK,
      TEST_BOUNTY_PK,
      TEST_CREATOR_CONTRIBUTOR_RECORD_PK,
      undefined // sign with provider.wallet
    );
  };

  beforeEach(async () => {
    console.log("Test realm public key", TEST_REALM_PK.toString());
    // set up bounty board
    const { bountyBoardPDA, bountyBoardVaultPDA } = await setupBountyBoard(
      provider,
      program,
      TEST_REALM_PK
    );
    TEST_BOUNTY_BOARD_PK = bountyBoardPDA;
    TEST_BOUNTY_BOARD_VAULT_PK = bountyBoardVaultPDA;

    // add tiers config (with custom/non-default windows for Entry tier)
    await addBountyBoardTierConfig(
      provider,
      program,
      TEST_BOUNTY_BOARD_PK,
      TEST_REALM_GOVERNANCE,
      getTiersInVec(new PublicKey(DUMMY_MINT_PK.USDC)).map((t) => {
        if (t.tierName !== "Entry") return t;
        t.taskSubmissionWindow = 1;
        t.submissionReviewWindow = 1;
        t.addressChangeReqWindow = 1;
        return t;
      })
    );

    // seed bounty board vault
    await seedBountyBoardVault(
      provider,
      bountyBoardVaultPDA,
      TEST_REALM_TREASURY_USDC_ATA,
      provider.wallet.publicKey
    );

    // set up contributor record
    const { contributorRecordPDA } = await setupContributorRecord(
      provider,
      program,
      bountyBoardPDA,
      provider.wallet.publicKey,
      TEST_REALM_GOVERNANCE,
      "Core"
    );
    TEST_CREATOR_CONTRIBUTOR_RECORD_PK = contributorRecordPDA;
  });

  it("update bounty and bounty submission acc correctly after rejecting submission for unaddressed change", async () => {
    await testSetupWithVaryingBountyTier("Entry"); // 1 sec for quick overdue
    await sleep(2000); // sleep 2s to ensure duration rlly overdue
    const TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK =
      TEST_APPLICANT_CONTRIBUTOR_RECORD_PK;

    const {
      updatedBountySubmissionAcc,
      updatedBountyAcc,
      updatedAssigneeContributorRecord,
    } = await rejectStaleSubmission(
      provider,
      program,
      TEST_BOUNTY_PK,
      TEST_BOUNTY_SUBMISSION_PK,
      TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK,
      TEST_CREATOR_CONTRIBUTOR_RECORD_PK,
      undefined // use provider.wallet to sign
    );

    // assert `bounty_submission` acc is updated correctly
    assert.deepEqual(updatedBountySubmissionAcc.state, {
      rejectedForUnaddressedChangeRequest: {},
    });
    assert.closeTo(
      updatedBountySubmissionAcc.rejectedAt.toNumber(),
      new Date().getTime() / 1000,
      60 // 1 min tolerance
    );

    // assert `bounty` acc is updated correctly
    assert.deepEqual(updatedBountyAcc.state, { open: {} });
    assert.equal(updatedBountyAcc.unassignCount, 1);

    // assert reputation is deducted from `contributor_record` of assignee
    assert.equal(
      updatedAssigneeContributorRecord.reputation.toNumber(),
      0 - updatedBountyAcc.rewardReputation
    );
    assert.equal(
      updatedAssigneeContributorRecord.recentRepChange.toNumber(),
      -1 * updatedBountyAcc.rewardReputation
    );

    // assert bounty activity
  });

  it("should not let non-creator reject stale submission", async () => {
    await testSetupWithVaryingBountyTier("Entry"); // duration doesn't matter
    const TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK =
      TEST_APPLICANT_CONTRIBUTOR_RECORD_PK;

    await assertReject(
      () =>
        rejectStaleSubmission(
          provider,
          program,
          TEST_BOUNTY_PK,
          TEST_BOUNTY_SUBMISSION_PK,
          TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK,
          // reject as applicant instead of bounty creator
          TEST_APPLICANT_CONTRIBUTOR_RECORD_PK,
          TEST_APPLICANT_WALLET
        ),
      /NotAuthorizedToRejectSubmission/
    );
  });

  it("should throw if address change req window has not passed", async () => {
    await testSetupWithVaryingBountyTier("A"); // arbitrarily 1wk
    const TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK =
      TEST_APPLICANT_CONTRIBUTOR_RECORD_PK;

    await assertReject(
      () =>
        rejectStaleSubmission(
          provider,
          program,
          TEST_BOUNTY_PK,
          TEST_BOUNTY_SUBMISSION_PK,
          TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK,
          TEST_CREATOR_CONTRIBUTOR_RECORD_PK,
          undefined // use provider.wallet to sign
        ),
      /SubmissionNotStale/
    );
  });

  it("should throw if assignee has already address change requested", async () => {
    await testSetupWithVaryingBountyTier("Entry"); // even though at the time of calling, address change req window has passed
    // update submission to address change
    await updateSubmission(
      provider,
      program,
      TEST_BOUNTY_SUBMISSION_PK,
      TEST_BOUNTY_PK,
      TEST_APPLICANT_CONTRIBUTOR_RECORD_PK,
      TEST_APPLICANT_WALLET
    );
    const TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK =
      TEST_APPLICANT_CONTRIBUTOR_RECORD_PK;

    await assertReject(
      () =>
        rejectStaleSubmission(
          provider,
          program,
          TEST_BOUNTY_PK,
          TEST_BOUNTY_SUBMISSION_PK,
          TEST_ASSIGNEE_CONTRIBUTOR_RECORD_PK,
          TEST_CREATOR_CONTRIBUTOR_RECORD_PK,
          undefined // use provider.wallet to sign
        ),
      /SubmissionNotStale/
    );
  });

  afterEach(async () => {
    console.log("--- Cleanup logs ---");
    // clean up bounty submission created
    // clean up accounts created from assign
    await cleanUpAssignBounty(
      provider,
      program,
      TEST_BOUNTY_ACTIVITY_ASSIGN_PK,
      TEST_BOUNTY_SUBMISSION_PK
    );
    // clean up bounty application created
    await cleanUpApplyToBounty(
      provider,
      program,
      TEST_BOUNTY_APPLICATION_PK,
      TEST_APPLICANT_CONTRIBUTOR_RECORD_PK,
      TEST_BOUNTY_ACTIVITY_APPLY_PK
    );
    // clean up bounty-related accounts
    await cleanUpCreateBounty(
      provider,
      program,
      TEST_BOUNTY_PK,
      TEST_BOUNTY_ESCROW_PK,
      TEST_BOUNTY_BOARD_VAULT_PK
    );
    // clean up creator contributor record
    await cleanUpContributorRecord(
      provider,
      program,
      TEST_CREATOR_CONTRIBUTOR_RECORD_PK
    );
    // clean up bounty board-related accounts
    await cleanUpBountyBoard(
      provider,
      program,
      TEST_BOUNTY_BOARD_PK,
      TEST_BOUNTY_BOARD_VAULT_PK,
      TEST_REALM_TREASURY_USDC_ATA
    );
  });
});
