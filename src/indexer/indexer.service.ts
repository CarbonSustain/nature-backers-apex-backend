import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// Types erased at compile time. Infer instance type if the module exposes a class named GlobalIndexer/HederaIndexer/default.
// If not present, fall back to `any` so you can build.
type Mod = typeof import('hedera-global-indexer');
type InferInstance<M> = 'GlobalIndexer' extends keyof M
  ? M['GlobalIndexer'] extends new (...a: any[]) => infer I ? I : any
  : 'HederaIndexer' extends keyof M
  ? M['HederaIndexer'] extends new (...a: any[]) => infer I ? I : any
  : 'default' extends keyof M
  ? M['default'] extends new (...a: any[]) => infer I ? I : any
  : any;
type GlobalIndexer = InferInstance<Mod>;

@Injectable()
export class IndexerService implements OnModuleInit {
  private indexer!: GlobalIndexer;
  private readonly logger = new Logger(IndexerService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor() { }

  async onModuleInit() {
    const { INDEXER_URL, BEARER_TOKEN } = process.env;
    if (!INDEXER_URL || !BEARER_TOKEN) {
      throw new Error('Missing INDEXER_URL or BEARER_TOKEN env vars');
    }

    // Safe dynamic import so TS doesn't rewrite to require() in CJS builds
    const dynamicImport = new Function('s', 'return import(s)') as (s: string) => Promise<Mod | any>;
    const mod = (await dynamicImport('hedera-global-indexer')) as Mod | any;

    const createClient = mod.createClient ?? mod.default?.createClient;
    const IndexerCtor = mod.GlobalIndexer ?? mod.HederaIndexer ?? mod.default;

    if (!createClient || !IndexerCtor) {
      throw new Error(
        'hedera-global-indexer exports not found. Expected createClient and a constructor (GlobalIndexer/HederaIndexer/default).'
      );
    }

    const client = createClient(INDEXER_URL, BEARER_TOKEN);
    this.indexer = new IndexerCtor(client) as GlobalIndexer;

    this.logger.log('GlobalIndexer initialized (via safe dynamic import)');
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
          status: error.response?.status,
          url: error.config?.url
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, 5xx server errors, and rate limiting
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 429; // 5xx errors or rate limiting
  }

  async fullTextSearch(query: string): Promise<any> {
    this.logger.log(`Performing full text search for query: ${query}`);

    return this.retryWithBackoff(async () => {
      const searchResults = await this.indexer.fullTextSearch(query);
      this.logger.log(`Full text search completed, found ${searchResults?.length || 0} results`);
      return searchResults;
    });
  }

  async getDocumentsByKeywords(keywords: any): Promise<any> {
    this.logger.log('IndexerService.getDocumentsByKeywords called with:', keywords);

    // Filter out 'default' values and empty arrays
    const filteredKeywords: any = {};
    for (const [key, value] of Object.entries(keywords)) {
      if (value && Array.isArray(value) && value.length > 0 && !value.includes('default')) {
        filteredKeywords[key] = value;
      }
    }

    this.logger.log('Filtered keywords:', filteredKeywords);

    return this.retryWithBackoff(async () => {
      const results = await this.indexer.getDocumentsByKeywords(
        filteredKeywords.funding_target || [],
        filteredKeywords.timeframe || [],
        filteredKeywords.region || [],
        filteredKeywords.project_type || [],
        filteredKeywords.verification || [],
        filteredKeywords.sdgs || []
      );
      this.logger.log(`Documents by keywords search completed, found ${results?.length || 0} results`);
      return results;
    });
  }

  async getVcByMessageId(consensusTimestamp: string): Promise<any> {
    this.logger.log(`Fetching VC document for consensus timestamp: ${consensusTimestamp}`);

    return this.retryWithBackoff(async () => {
      try {
        const result = await this.indexer.getVcByMessageId(consensusTimestamp);
        this.logger.log(`Successfully retrieved VC document for timestamp: ${consensusTimestamp}`);
        return result;
      } catch (error) {
        this.logger.error(`Failed to retrieve VC document for timestamp: ${consensusTimestamp}`, {
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });

        // Provide more specific error messages
        if (error.response?.status === 404) {
          throw new Error(`VC document not found for consensus timestamp: ${consensusTimestamp}`);
        } else if (error.response?.status === 500) {
          throw new Error(`Guardian Service internal error for consensus timestamp: ${consensusTimestamp}. Please try again later.`);
        } else if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please check your bearer token.');
        } else if (error.response?.status === 403) {
          throw new Error('Access forbidden. Please check your permissions.');
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        throw error;
      }
    });
  }
} 