import { Injectable, Logger } from '@nestjs/common';
import { GlobalIndexer, createClient } from 'hedera-global-indexer';

function extractCs(doc: any): any {
  // Primary path: doc.item.documents[0] is a JSON string containing the full VC.
  const documents = doc?.item?.documents;
  if (Array.isArray(documents) && documents.length > 0) {
    try {
      const vcDoc = typeof documents[0] === "string" ? JSON.parse(documents[0]) : documents[0];
      const cs = vcDoc?.credentialSubject;
      if (cs != null) return Array.isArray(cs) ? cs[0] : cs;
    } catch {
      // fall through to other paths
    }
  }

  // Fallback paths for other response shapes
  for (const c of [doc?.document?.credentialSubject, doc?.vc?.credentialSubject, doc?.credentialSubject]) {
    if (c != null) return Array.isArray(c) ? c[0] : c;
  }
  return null;
}

function str(v: any): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

// Returns true when the string looks like a PDD section-header dump rather than
// a human-readable summary (e.g. "2 Project Details\n2.1 Project Goals…").
function isPddStructure(s: string): boolean {
  // Starts with a digit optionally followed by spaces and an uppercase word
  return /^\s*\d[\d.]*\s+[A-Z]/.test(s);
}

// Like str() but rejects PDD template text.
function descStr(v: any): string | null {
  const s = str(v);
  if (!s) return null;
  return isPddStructure(s) ? null : s;
}

/** Parse stringified Python list e.g. "['Energy Efficiency - Domestic']" → "Energy Efficiency - Domestic" */
function parsePythonList(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    const parts = inner.split(',').map(p => p.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return s;
}

/** Returns true if a value is a meaningful string (not empty, UUID, or "Not specified") */
function isUsable(v: any): boolean {
  if (!v || typeof v !== 'string') return false;
  const s = v.trim();
  if (!s || s === 'Not specified' || s === 'Not applicable') return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return false;
  return true;
}

/**
 * Extract project types (CSV string) from credentialSubject.
 * Handles VM0047, VM0033, VM0042/CCB, TPDDTEC/GoldStandard, 1MTN-style schemas.
 */
function extractProjectTypes(cs: any): string | null {
  // 1MTN / custom schemas: cs.category
  if (cs?.category && isUsable(cs.category)) return str(cs.category);
  // Direct array or string field
  if (cs?.projectTypes) {
    return Array.isArray(cs.projectTypes) ? cs.projectTypes.join(', ') : str(cs.projectTypes);
  }
  // TPDDTEC / GoldStandard: cs.projectType (capital T, may be stringified Python list)
  if (cs?.projectType) {
    const raw = Array.isArray(cs.projectType) ? cs.projectType.join(', ') : str(cs.projectType);
    return raw ? parsePythonList(raw) : null;
  }

  const fromG143Block = (block: any): string | null => {
    if (typeof block !== 'object' || block === null) return null;
    const vcsTypes = block?.registry_vcs?.vcs_additional_project_types;
    if (Array.isArray(vcsTypes)) {
      const usable = vcsTypes.filter(isUsable);
      if (usable.length > 0) return usable.join(', ');
    }
    const g143 = block?.G143;
    if (typeof g143 === 'object' && isUsable(g143?.G6)) return str(g143.G6);
    const ccbType = block?.registry_ccb?.ccb_project_type;
    if (isUsable(ccbType)) return str(ccbType);
    return null;
  };

  // VM0047: projectDescription block
  const fromPd = fromG143Block(cs?.projectDescription);
  if (fromPd) return fromPd;

  // VM0033: project_details block (same G-field structure nested one level deeper)
  const fromPdet = fromG143Block(cs?.project_details);
  if (fromPdet) return fromPdet;

  return str(cs?.project_type) ?? str(cs?.type_of_project) ?? null;
}

/**
 * Extract primary sector from credentialSubject.
 */
function extractPrimarySector(cs: any): string | null {
  if (cs?.primarySector) return str(cs.primarySector);
  // 1MTN / custom schemas: cs.scope
  if (cs?.scope && isUsable(cs.scope)) return str(cs.scope);

  const fromG143Sector = (block: any): string | null => {
    if (typeof block !== 'object' || block === null) return null;
    const g143 = block?.G143;
    if (typeof g143 === 'object') {
      const g5 = g143?.G5;
      // Skip bare numbers like "14"
      if (isUsable(g5) && !/^\d+$/.test(g5.trim())) return str(g5);
    }
    return null;
  };

  return fromG143Sector(cs?.projectDescription)
    ?? fromG143Sector(cs?.project_details)
    ?? str(cs?.sector)
    ?? str(cs?.project_sector)
    ?? null;
}

/**
 * Extract impactAndRiskSdgs array from credentialSubject.
 * Returns raw SDG strings in "#N - SDG Type/Name: N" format.
 */
function extractImpactSdgs(cs: any): string[] {
  const raw = cs?.impactAndRiskSdgs;
  if (Array.isArray(raw) && raw.length > 0) return raw;

  for (const block of [cs?.projectDescription, cs?.project_details]) {
    if (typeof block === 'object' && block !== null) {
      const nested = block?.impactAndRiskSdgs;
      if (Array.isArray(nested) && nested.length > 0) return nested;
    }
  }

  // 1MTN / custom schemas: cs.SDGImpact free-text "1 - description…"
  if (cs?.SDGImpact && typeof cs.SDGImpact === 'string') {
    const m = cs.SDGImpact.match(/^\s*(\d+)\s*[-–]/);
    if (m) return [`#${m[1]} - SDG Type/Name: ${m[1]}`];
  }

  return [];
}

function extractNameAndDescription(cs: any): { name: string; description: string } {
  const pd = cs?.projectDescription;    // VM0042/CCB: object with .name, .G12, .G132
  const pdet = cs?.project_details;     // VM0033 / older schemas: object with .G132, .G5

  const name =
    (typeof pd === "object" ? str(pd?.name) : null) ??
    str(cs?.projectTitle) ??            // VM0033 (newer)
    str(cs?.["Project title"]) ??
    str(cs?.vcs_project_title) ??
    str(cs?.projectName) ??
    str(cs?.name) ??
    str(cs?.title) ??
    (typeof pdet === "object" ? str(pdet?.G5) : null) ?? // VM0033 (older, no projectTitle)
    "N/A";

  const description =
    // CCB G1.2 = "Summary Description of the Project" — short, human-readable
    (typeof pd === "object" ? descStr(pd?.G12) : null) ??
    (typeof pd === "object" ? descStr(pd?.G1_2) : null) ??
    // VM0042/CCB G1.3.2 — can contain the full PDD body; filtered by descStr
    (typeof pd === "object" ? descStr(pd?.G132) : null) ??
    // VM0033 / 1MTN
    (typeof pdet === "object" ? descStr(pdet?.G132) : null) ??
    (typeof pdet === "object" ? descStr(pdet?.G12) : null) ??
    descStr(cs?.["Project Description"]) ??
    descStr(cs?.vcs_project_description) ??
    descStr(cs?.description) ??
    descStr(cs?.summary) ??
    "N/A";

  const trimmed = description !== "N/A" && description.length > 300
    ? description.slice(0, 300) + "..."
    : description;

  return { name, description: trimmed };
}

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private readonly baseUrl: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private globalIndexer: GlobalIndexer;

  constructor() {
    this.baseUrl = process.env.INDEXER_API_URL || 'http://localhost:8080';
    this.logger.log(`IndexerService initialized, API URL: ${this.baseUrl}`);

    const globalIndexerUrl = process.env.BASE_URL || "https://indexer.guardianservice.app/api/v1/mainnet";
    const token = process.env.BEARER_TOKEN || "";
    // If token is missing, createClient might throw or log warning depending on implementation.
    // Assuming it's fine for public endpoints or handled inside.
    const client = createClient(globalIndexerUrl, token);
    this.globalIndexer = new GlobalIndexer(client);
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries,
    delay: number = this.retryDelay
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        this.logger.warn(`Operation failed, retrying in ${delay}ms. Retries left: ${retries - 1}`, {
          error: error.message,
          status: error.status,
          url: error.url
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error.status) return true; // Network error
    return error.status >= 500 || error.status === 429;
  }

  private async apiFetch(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });

    if (!res.ok) {
      const err: any = new Error(`Indexer API error: ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.url = url;
      throw err;
    }

    return res.json();
  }

  async getAllDocuments(): Promise<any[]> {
    this.logger.log(`getAllDocuments: calling GET ${this.baseUrl}/projects/all`);
    return this.retryWithBackoff(async () => {
      const results = await this.apiFetch('/projects/all');
      const arr = Array.isArray(results) ? results : [];
      this.logger.log(`getAllDocuments: received ${arr.length} documents`);
      if (arr.length > 0) {
        this.logger.log(`getAllDocuments: sample[0] uuid=${arr[0].uuid} consensusTimestamp=${arr[0].consensusTimestamp}`);
      }
      return arr;
    });
  }

  async fullTextSearch(query: string): Promise<any> {
    this.logger.log(`Performing full text search for query: ${query}`);

    return this.retryWithBackoff(async () => {
      const params = new URLSearchParams({ q: query });
      const results = await this.apiFetch(`/search?${params}`);
      this.logger.log(`Full text search completed, found ${results?.length || 0} results`);
      return results;
    });
  }

  async getDocumentsByKeywords(keywords: any): Promise<any> {
    this.logger.log('IndexerService.getDocumentsByKeywords called with:', keywords);

    const filteredKeywords: any = {};
    for (const [key, value] of Object.entries(keywords)) {
      if (value && Array.isArray(value) && value.length > 0 && !(value as string[]).includes('default')) {
        filteredKeywords[key] = value;
      }
    }

    this.logger.log('Filtered keywords:', filteredKeywords);

    return this.retryWithBackoff(async () => {
      const results = await this.apiFetch('/search/documents', {
        method: 'POST',
        body: JSON.stringify(filteredKeywords)
      });
      this.logger.log(`Documents by keywords search completed, found ${results?.length || 0} results`);
      return results;
    });
  }

  async getVcByMessageId(messageId: string): Promise<any> {
      return this.retryWithBackoff(async () => {
          const results = await this.globalIndexer.getVcByMessageId(messageId);
          return results;
      });
  }

  private async _fetchProjectsByPolicyId(policyId: string): Promise<any[]> {
    const baseUrl = process.env.BASE_URL || "https://indexer.guardianservice.app/api/v1/mainnet";
    const token = process.env.BEARER_TOKEN || process.env.GUARDIAN_BEARER_TOKEN || "";
    
    const allProjects: any[] = [];
    let pageIndex = 0;
    const pageSize = 100;

    while (true) {
        const url = new URL(`${baseUrl}/entities/vc-documents`);
        url.searchParams.append('analytics.policyId', policyId);
        url.searchParams.append('pageSize', pageSize.toString());
        url.searchParams.append('pageIndex', pageIndex.toString());

        try {
            const resp = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!resp.ok) break;
            
            const data = await resp.json();
            const items = data?.items || [];
            if (items.length === 0) break;

            const isProjectSchema = (name: string | undefined) =>
              !!name &&
              !name.includes('Developer Application') &&
              (name.startsWith("Project") || name.startsWith("Parent: Project"));

            const projects = items.filter((i: any) => isProjectSchema(i?.analytics?.schemaName));
            allProjects.push(...projects);

            const total = data?.total;
            if (total != null) {
                if ((pageIndex + 1) * pageSize >= total) break;
            } else if (items.length < pageSize) {
                break;
            }
            pageIndex++;
        } catch (e) {
            this.logger.error(`Error fetching projects by policy ID ${policyId}: ${e}`);
            break;
        }
    }
    return allProjects;
  }

  async fetchUniqueProjects(methodologies: string[] = ["ATEC", "TPDDTEC", "VM0047", "VM0033", "VM0050", "VM0042", "AMS II.C", "BCarbon"]): Promise<any[]> {
    const isProjectSchema = (name: string | undefined) =>
      !!name &&
      !name.includes('Developer Application') &&
      (name.startsWith("Project") || name.startsWith("Parent: Project"));

    const projectKey = (vc: any, fallbackPolicyId?: string) => {
      const rel = (vc?.options?.relationships as string[] | null)?.[0];
      return rel && rel !== fallbackPolicyId ? rel : vc.uuid || vc.consensusTimestamp;
    };

    const globalProjects = new Map<string, any>();

    // Phase 1: Collect stubs — all methodologies in parallel
    await Promise.allSettled(
      methodologies.map(async (methodology) => {
        try {
          const searchResults = await this.globalIndexer.fullTextSearch(methodology, 0, 100);
          const items = Array.isArray(searchResults) ? searchResults : (searchResults?.items || []);

          for (const item of items) {
            if (item?.type === "VC-Document" && isProjectSchema(item?.analytics?.schemaName)) {
              const key = projectKey(item, item.analytics?.policyId);
              if (!globalProjects.has(key)) {
                globalProjects.set(key, { key, methodology, schema: item.analytics?.schemaName || "Project", timestamp: item.consensusTimestamp, policyId: item.analytics?.policyId || null });
              }
            }
          }

          const policyItems = items.filter((i: any) => i?.type === "Instance-Policy");
          await Promise.allSettled(
            policyItems.map(async (policyItem: any) => {
              const policyId = policyItem.consensusTimestamp;
              try {
                const policyProjects = await this._fetchProjectsByPolicyId(policyId);
                for (const vc of policyProjects) {
                  const key = projectKey(vc, policyId);
                  if (!globalProjects.has(key)) {
                    globalProjects.set(key, { key, methodology, schema: vc.analytics?.schemaName || "Project", timestamp: vc.consensusTimestamp, policyId });
                  }
                }
              } catch (e: any) {
                this.logger.warn(`fetchUniqueProjects: policy ${policyId} failed: ${e.message}`);
              }
            })
          );
        } catch (e: any) {
          this.logger.error(`fetchUniqueProjects: methodology ${methodology} failed: ${e.message}`);
        }
      })
    );

    const allStubs = Array.from(globalProjects.values());
    this.logger.log(`fetchUniqueProjects: ${allStubs.length} stubs found, enriching in parallel`);

    // Phase 2: Fetch all VCs in parallel — each stub gets name/desc/status/standards
    const vcResults = await Promise.allSettled(
      allStubs.map(async (p) => {
        const fullDoc = await this.globalIndexer.getVcByMessageId(p.timestamp);
        const cs = extractCs(fullDoc);
        const { name, description } = extractNameAndDescription(cs);

        const status = fullDoc?.item?.status || fullDoc?.item?.options?.documentStatus || null;

        // Verification method: proof.verificationMethod or issuer from the parsed VC doc
        const vcDoc = (() => {
          try {
            const docs = fullDoc?.item?.documents;
            if (Array.isArray(docs) && docs.length > 0) {
              return typeof docs[0] === 'string' ? JSON.parse(docs[0]) : docs[0];
            }
          } catch { /* ignore */ }
          return null;
        })();
        const verificationMethod =
          vcDoc?.proof?.verificationMethod ||
          vcDoc?.issuer ||
          fullDoc?.item?.options?.issuer ||
          null;

        // Build standards — always include carbonStandard + description
        const rawStandards = cs?.standards || cs?.standard || null;
        const carbonStandard =
          (rawStandards && typeof rawStandards === 'object' ? (rawStandards as any).carbonStandard : null) ||
          (typeof rawStandards === 'string' ? rawStandards : null) ||
          cs?.carbonStandard ||
          cs?.['Carbon Standard'] ||
          cs?.['carbon_standard'] ||
          cs?.['projectStandard'] ||
          cs?.projectDescription?.G17 ||
          cs?.project_details?.G17 ||
          null;
        const standards = { carbonStandard };

        const projectTypes = extractProjectTypes(cs);
        const primarySector = extractPrimarySector(cs);
        const impactAndRiskSdgs = extractImpactSdgs(cs);

        return { ...p, name, description, status, standards, projectTypes, primarySector, impactAndRiskSdgs, verificationMethod };
      })
    );

    // Phase 3: Deduplicate by name (same project may appear under multiple policies)
    const seenNames = new Set<string>();
    const detailedProjects: any[] = [];
    for (const result of vcResults) {
      if (result.status !== 'fulfilled') continue;
      const doc = result.value;
      if (!doc.name || doc.name === "N/A" || seenNames.has(doc.name)) continue;
      seenNames.add(doc.name);
      detailedProjects.push(doc);
    }

    this.logger.log(`fetchUniqueProjects: returning ${detailedProjects.length} deduplicated projects`);
    return detailedProjects;
  }

  async getProjectsByMethodology(methodologies?: string[]): Promise<any[]> {
    const param = methodologies?.length
      ? `?methodologies=${encodeURIComponent(methodologies.join(','))}`
      : '';
    this.logger.log(`getProjectsByMethodology: calling GET ${this.baseUrl}/projects/by-methodology${param}`);
    return this.retryWithBackoff(async () => {
      const results = await this.apiFetch(`/projects/by-methodology${param}`);
      const arr = Array.isArray(results) ? results : [];
      this.logger.log(`getProjectsByMethodology: received ${arr.length} unique projects`);
      return arr;
    });
  }
}
