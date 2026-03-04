import { keccak256, toUtf8Bytes, getBytes, concat, isHexString } from "ethers";

export interface MerkleProof {
  leaf: string;
  siblings: string[];
  path: number[]; // 0 => current is left, 1 => current is right
}

export interface CampaignTransactionData {
  campaignId: number;
  merkleRoot: string;
  voteHashes: string[];
  totalVotes: number;
  timestamp: number;
  transactionHash?: string;
  proofs?: MerkleProof[];
  originalVotes?: Array<{ id: number;[key: string]: any }>;
}

export class MerkleTreeUtil {
  /** Normalize any input to a 0x-prefixed 32-byte hex leaf.
   *  - If already a 32-byte hex: lowercase + ensure 0x
   *  - Else: keccak256(utf8(input)) to create a 32-byte leaf
   */
  private static toLeaf(input: string): string {
    if (typeof input !== "string") {
      throw new Error("Leaf must be a string");
    }
    let s = input.trim().toLowerCase();
    if (s.startsWith("0x")) {
      // If hex but not 32 bytes, hash its bytes into a 32-byte leaf
      if (isHexString(s)) {
        if ((s.length - 2) === 64) return s; // already 32 bytes
        // hash arbitrary-length hex to 32-byte leaf
        return keccak256(getBytes(s));
      }
      // not valid hex, fall through to utf8 hashing
    }
    // Not hex: hash UTF-8 string to 32-byte leaf
    return keccak256(toUtf8Bytes(s));
  }

  /**
   * Generate a hash for a vote (stable, deterministic)
   */
  static generateVoteHash(voteData: {
    voteId: number;
    userId: number;
    campaignId: number;
    projectId: number;
    reason: string;
    departmentId: number;
    timestamp: string;
  }): string {
    const voteString = JSON.stringify(voteData, Object.keys(voteData).sort());
    return keccak256(toUtf8Bytes(voteString));
  }

  /**
   * Build an ordered Merkle tree (no pair sorting).
   * path[i] = 0 means "current is left, sibling is right"
   * path[i] = 1 means "current is right, sibling is left"
   */
  static buildMerkleTree(voteHashes: string[]): {
    root: string;
    tree: string[][];
    proofs: MerkleProof[];
  } {
    if (!voteHashes.length) {
      throw new Error("Cannot build Merkle tree with empty vote hashes");
    }

    // Leaf level: normalize each value to a 32-byte hex leaf
    const leaves = voteHashes.map(h => this.toLeaf(h));
    const tree: string[][] = [leaves];

    // Build up levels (duplicate last when odd)
    let currentLevel = tree[0];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        // bytes concat then keccak256
        const h = keccak256(concat([getBytes(left), getBytes(right)]));
        nextLevel.push(h);
      }

      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    // Proofs for each leaf
    const proofs: MerkleProof[] = [];
    for (let i = 0; i < leaves.length; i++) {
      proofs.push(this.generateProof(tree, i));
    }

    return {
      root: tree[tree.length - 1][0],
      tree,
      proofs,
    };
  }

  /**
   * Generate ordered proof for leafIndex
   */
  private static generateProof(tree: string[][], leafIndex: number): MerkleProof {
    const siblings: string[] = [];
    const path: number[] = [];
    let idx = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const levelNodes = tree[level];
      const isRight = (idx % 2) === 1;
      const siblingIndex = isRight ? idx - 1 : idx + 1;

      if (siblingIndex < levelNodes.length) {
        siblings.push(levelNodes[siblingIndex]);
      } else {
        // odd count -> sibling is the node itself (duplication rule)
        siblings.push(levelNodes[idx]);
      }

      path.push(isRight ? 1 : 0);
      idx = Math.floor(idx / 2);
    }

    return { leaf: tree[0][leafIndex], siblings, path };
  }

  /**
   * Verify ordered proof against a root
   */
  static verifyProof(proof: MerkleProof, root: string): boolean {
    let cur = this.toLeaf(proof.leaf); // normalize leaf again (defensive)
    const normalizedRoot = this.toLeaf(root); // also normalize root form

    for (let i = 0; i < proof.siblings.length; i++) {
      const sib = this.toLeaf(proof.siblings[i]);
      const isRight = proof.path[i] === 1;

      const bytes = isRight
        ? concat([getBytes(sib), getBytes(cur)])   // current on right
        : concat([getBytes(cur), getBytes(sib)]);  // current on left

      cur = keccak256(bytes);
    }

    return cur.toLowerCase() === normalizedRoot.toLowerCase();
  }

  /**
   * Use Hedera tx hashes (or IDs) directly as leaves.
   * If an item is not a 32-byte 0x hex, we hash it to a leaf first.
   */
  static generateCampaignTransactionDataFromHederaHashes(
    campaignId: number,
    votes: Array<{
      id: number;
      userId: number;
      campaignId: number;
      projectId: number;
      voteData: any;
      createdAt: Date;
      vote_hash: string | null; // Hedera tx hash or tx id
    }>
  ): CampaignTransactionData {
    const votesWithHashes = votes.filter(v => v.vote_hash != null);
    if (votesWithHashes.length === 0) {
      throw new Error("No votes with valid Hedera transaction hashes found");
    }

    // Keep original strings in voteHashes (for auditing),
    // but leaves will be normalized by buildMerkleTree via toLeaf()
    const voteHashes = votesWithHashes.map(v => v.vote_hash!);

    const { root, proofs } = this.buildMerkleTree(voteHashes);

    return {
      campaignId,
      merkleRoot: root,
      voteHashes,
      totalVotes: votesWithHashes.length,
      timestamp: Date.now(),
      proofs,
      originalVotes: votesWithHashes,
    };
  }

  /**
   * Legacy method: compute hashes from structured voteData
   */
  static generateCampaignTransactionData(
    campaignId: number,
    votes: Array<{
      id: number;
      userId: number;
      campaignId: number;
      projectId: number;
      voteData: any;
      createdAt: Date;
    }>
  ): CampaignTransactionData {
    const voteHashes = votes.map(v => {
      const vd = v.voteData as any;
      return this.generateVoteHash({
        voteId: v.id,
        userId: v.userId,
        campaignId: v.campaignId,
        projectId: v.projectId,
        reason: vd?.reason ?? "",
        departmentId: vd?.departmentId ?? 0,
        timestamp: v.createdAt.toISOString(),
      });
    });

    const { root, proofs } = this.buildMerkleTree(voteHashes);

    return {
      campaignId,
      merkleRoot: root,
      voteHashes,
      totalVotes: votes.length,
      timestamp: Date.now(),
      proofs,
      originalVotes: votes,
    };
  }

  /**
   * Create inclusion proofs for a subset of votes by ID
   */
  static createVoteProof(
    campaignData: CampaignTransactionData,
    selectedVoteIds: number[],
    originalVotes?: Array<{ id: number;[key: string]: any }>
  ) {
    if (!selectedVoteIds?.length) {
      throw new Error("No vote IDs selected for proof generation");
    }

    const inclusionProofs: MerkleProof[] = [];
    const selectedVoteHashes: string[] = [];

    const votesToUse = originalVotes || campaignData.originalVotes;
    if (votesToUse) {
      for (const voteId of selectedVoteIds) {
        const idx = votesToUse.findIndex(v => v.id === voteId);
        if (idx >= 0 && idx < campaignData.voteHashes.length) {
          selectedVoteHashes.push(campaignData.voteHashes[idx]);
          if (campaignData.proofs?.[idx]) {
            inclusionProofs.push(campaignData.proofs[idx]);
          }
        }
      }
    } else {
      // Fallback assumes vote IDs are 1..N in same order
      for (const voteId of selectedVoteIds) {
        const idx = voteId - 1;
        if (idx >= 0 && idx < campaignData.voteHashes.length) {
          selectedVoteHashes.push(campaignData.voteHashes[idx]);
          if (campaignData.proofs?.[idx]) {
            inclusionProofs.push(campaignData.proofs[idx]);
          }
        }
      }
    }

    if (!selectedVoteHashes.length) {
      throw new Error("No valid votes found for the selected vote IDs");
    }

    return {
      campaignTxHash: campaignData.transactionHash || "pending",
      merkleRoot: campaignData.merkleRoot,
      selectedVoteHashes,
      inclusionProofs,
      verificationData: {
        originalRoot: campaignData.merkleRoot,
        totalVotes: campaignData.totalVotes,
        selectedCount: selectedVoteHashes.length,
        timestamp: campaignData.timestamp,
      },
    };
  }
}
