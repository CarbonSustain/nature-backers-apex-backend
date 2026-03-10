import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { IndexerService } from '../indexer/indexer.service';
import * as fs from 'fs';
import * as path from 'path';

// Use a shared Prisma client instance
const prisma = new PrismaClient();

@Injectable()
export class RecommendProjectsService {
  private readonly logger = new Logger(RecommendProjectsService.name);

  constructor(
    private readonly indexerService: IndexerService
  ) {}

  /**
   * Get available filter options for recommendations
   */
  async getFilters() {
    try {
      const filterCategories = await prisma.filterCategory.findMany({
        include: {
          options: {
            orderBy: {
              id: 'asc'
            }
          }
        },
        orderBy: {
          id: 'asc'
        }
      });

      const filters = {};
      filterCategories.forEach(category => {
        filters[category.name] = category.options.map(option => ({
          value: option.value,
          label: option.label
        }));
      });

      return filters;
    } catch (error) {
      this.logger.error('Error getting filter options:', error);
      throw new Error('Failed to get filter options');
    }
  }
  /**
   * Extract SDG names from VC format strings
   */
  private async extractSdgNames(sdgStrings: string[]): Promise<string[]> {
    const sdgNames: string[] = [];
    
    // Get all SDGs from database for lookup
    const allSdgs = await prisma.sDG.findMany();
    this.logger.log(`Loaded ${allSdgs.length} SDGs from database for lookup`);
    
    for (const sdgString of sdgStrings) {
      try {
        this.logger.log(`Processing SDG string: ${sdgString}`);
        
        // Check if string contains "sdg" (case insensitive)
        if (!sdgString.toLowerCase().includes('sdg')) {
          this.logger.log(`String does not contain "sdg", skipping`);
          continue;
        }
        
        // Extract SDG number from the string
        const sdgNumberMatch = sdgString.match(/SDG Type\/Name:\s*(\d+)/i);
        if (!sdgNumberMatch || !sdgNumberMatch[1]) {
          this.logger.warn(`No SDG number found in string: ${sdgString}`);
          continue;
        }
        
        const sdgNumber = parseInt(sdgNumberMatch[1]);
        this.logger.log(`Extracted SDG number: ${sdgNumber}`);
        
        // Find the SDG in database by ID
        const sdg = allSdgs.find(s => s.id === sdgNumber);
        if (!sdg) {
          this.logger.warn(`SDG with ID ${sdgNumber} not found in database`);
          continue;
        }
        
        this.logger.log(`Found SDG in database: ${sdg.name} (ID: ${sdg.id})`);
        
        // Check if the SDG name appears in the string (case insensitive)
        if (sdgString.toLowerCase().includes(sdg.name.toLowerCase())) {
          this.logger.log(`SDG name "${sdg.name}" found in string, adding to list`);
          sdgNames.push(sdg.name);
        } else {
          this.logger.log(`SDG name "${sdg.name}" not found in string, but SDG number ${sdgNumber} was extracted`);
          // Still add the SDG name even if it's not explicitly mentioned in the string
          // since we found the SDG number
          sdgNames.push(sdg.name);
        }
        
      } catch (error) {
        this.logger.warn(`Failed to extract SDG name from: ${sdgString}`, error);
      }
    }
    
    this.logger.log(`Extracted SDG names: ${sdgNames.join(', ')}`);
    return sdgNames;
  }

  /**
   * Find SDG by name with fuzzy matching
   */
  private async findSdgByName(sdgName: string): Promise<number | null> {
    try {
      this.logger.log(`Looking for SDG: "${sdgName}"`);
      
      // First try exact match
      let sdg = await prisma.sDG.findFirst({
        where: {
          name: {
            equals: sdgName,
            mode: 'insensitive'
          }
        }
      });

      if (sdg) {
        this.logger.log(`Found exact match: ${sdg.name} (ID: ${sdg.id})`);
        return sdg.id;
      }

      // Try partial match (SDG name contains the search term)
      sdg = await prisma.sDG.findFirst({
        where: {
          name: {
            contains: sdgName,
            mode: 'insensitive'
          }
        }
      });

      if (sdg) {
        this.logger.log(`Found partial match: ${sdg.name} (ID: ${sdg.id})`);
        return sdg.id;
      }

      // Try reverse partial match (search term contains SDG name) - sliding window approach
      const allSdgs = await prisma.sDG.findMany();
      for (const existingSdg of allSdgs) {
        if (sdgName.toLowerCase().includes(existingSdg.name.toLowerCase())) {
          this.logger.log(`Found reverse match: ${existingSdg.name} (ID: ${existingSdg.id})`);
          return existingSdg.id;
        }
      }

      // Try word-by-word matching for multi-word SDG names
      const sdgWords = sdgName.toLowerCase().split(/\s+/);
      for (const existingSdg of allSdgs) {
        const existingWords = existingSdg.name.toLowerCase().split(/\s+/);
        
        // Check if any word from the search term matches any word from the SDG name
        for (const searchWord of sdgWords) {
          for (const existingWord of existingWords) {
            if (searchWord === existingWord || 
                searchWord.includes(existingWord) || 
                existingWord.includes(searchWord)) {
              this.logger.log(`Found word match: ${existingSdg.name} (ID: ${existingSdg.id}) for search word: ${searchWord}`);
              return existingSdg.id;
            }
          }
        }
      }

      this.logger.warn(`No SDG found for name: ${sdgName}`);
      return null;
    } catch (error) {
      this.logger.error(`Error finding SDG by name ${sdgName}:`, error);
      return null;
    }
  }

  /**
   * Map SDG names to IDs
   */
  private async mapSdgNamesToIds(sdgNames: string[]): Promise<number[]> {
    const sdgIds: number[] = [];
    
    for (const sdgName of sdgNames) {
      const sdgId = await this.findSdgByName(sdgName);
      if (sdgId) {
        sdgIds.push(sdgId);
      }
    }
    
    return sdgIds;
  }

  /**
   * Check if project exists by uniqueId
   */
  private async projectExists(uniqueId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { uniqueId },
      select: { id: true }
    });
    return !!project;
  }

  /**
   * Create project associations with SDGs
   */
  private async createProjectSdgAssociations(projectId: number, sdgIds: number[]): Promise<void> {
    for (const sdgId of sdgIds) {
      await prisma.projectSDG.create({
        data: {
          projectId,
          sdgId
        }
      });
    }
  }

  /**
   * Smart update logic: update if incoming value is non-null, don't update if incoming is null
   */
  private buildSmartUpdateData(currentProject: any, incomingData: any): any {
    const updateData: any = {};
    
    this.logger.log(`🔍 buildSmartUpdateData called for project ${currentProject.uniqueId}`, {
      incomingDataKeys: Object.keys(incomingData),
      incomingDataValues: incomingData,
      currentProjectId: currentProject.id
    });
    
    // Fields to check for smart updates (String fields)
    const stringFieldsToCheck = [
      'projectName', 'primarySector', 'secondarySector', 'projectTypes', 
      'verificationMethod', 'proofPurpose', 'projectMethodology',
      'latitude', 'longitude'
    ];
    
    for (const field of stringFieldsToCheck) {
      const incomingValue = incomingData[field];
      const currentValue = currentProject[field];
      
      // Update if incoming value is non-null (regardless of current value)
      if (incomingValue !== null && incomingValue !== undefined) {
        updateData[field] = incomingValue;
        this.logger.log(`✅ Smart update: ${field} = ${incomingValue} (current: ${currentValue})`);
      } else {
        this.logger.log(`⏭️ Smart update: Skipping ${field} (incoming is null/undefined, current: ${currentValue})`);
      }
    }
    
    // Handle Json fields separately
    if (incomingData.standards !== null && incomingData.standards !== undefined) {
      updateData.standards = incomingData.standards;
      this.logger.log(`✅ Smart update: standards Json field updated`);
    } else {
      this.logger.log(`⏭️ Smart update: Skipping standards (incoming is null/undefined)`);
    }
    
    // Always update these fields as they come from Hedera
    updateData.status = incomingData.status;
    updateData.consensusTimestamp = incomingData.consensusTimestamp;
    
    // Handle Json array fields - update if incoming array has content
    if (incomingData.impactAndRiskSdgs && Array.isArray(incomingData.impactAndRiskSdgs) && 
        incomingData.impactAndRiskSdgs.length > 0) {
      updateData.impactAndRiskSdgs = incomingData.impactAndRiskSdgs;
      this.logger.log(`✅ Smart update: impactAndRiskSdgs Json array updated (${incomingData.impactAndRiskSdgs.length} items)`);
    } else {
      this.logger.log(`⏭️ Smart update: Skipping impactAndRiskSdgs (incoming is null/empty)`);
    }
    
    if (incomingData.impactAndRiskAssessments && Array.isArray(incomingData.impactAndRiskAssessments) && 
        incomingData.impactAndRiskAssessments.length > 0) {
      updateData.impactAndRiskAssessments = incomingData.impactAndRiskAssessments;
      this.logger.log(`✅ Smart update: impactAndRiskAssessments Json array updated (${incomingData.impactAndRiskAssessments.length} items)`);
    } else {
      this.logger.log(`⏭️ Smart update: Skipping impactAndRiskAssessments (incoming is null/empty)`);
    }
    
    this.logger.log(`📊 buildSmartUpdateData result: ${Object.keys(updateData).length} fields to update:`, Object.keys(updateData));
    
    return updateData;
  }

  /**
   * Get final project recommendations - NEW IMPLEMENTATION
   */
  async getFinalRecommendations(criteria: {
    funding_target?: number[];
    timeframe?: string[];
    region?: string[];
    project_type?: string[];
    verification?: string[];
    sdgs?: string[];
  }): Promise<any> {
    try {
      this.logger.log('Starting final recommendations with criteria:', criteria);

      // Step 1: Call getDocumentsByKeywords with the provided criteria
      const keywordParams = {
        funding_target: criteria.funding_target || ['default'],
        timeframe: criteria.timeframe || ['default'],
        region: criteria.region || ['default'],
        project_type: criteria.project_type || ['default'],
        verification: criteria.verification || ['default'],
        sdgs: criteria.sdgs || ['default']
      };

      this.logger.log('Step 1: Calling getDocumentsByKeywords with params:', keywordParams);
      
      let documentsResponse;
      try {
        documentsResponse = await this.indexerService.getDocumentsByKeywords(keywordParams);
        this.logger.log('Documents response received:', documentsResponse?.length || 0, 'documents');
      } catch (indexerError) {
        this.logger.error(`Failed to retrieve documents from indexer for criteria:`, {
          error: indexerError.message,
          criteria: keywordParams
        });
        
        // Return a structured error response instead of throwing
        return {
          success: false,
          error: 'INDEXER_RETRIEVAL_FAILED',
          message: indexerError.message,
          criteria: keywordParams,
          details: {
            status: indexerError.response?.status,
            statusText: indexerError.response?.statusText
          }
        };
      }

      // Step 2: Process all documents from the response
      const processedProjects = [];
      let projectsCreated = 0;
      let projectsUpdated = 0;
      let projectsSkipped = 0;
      
      if (!documentsResponse || !Array.isArray(documentsResponse)) {
        this.logger.warn('No valid documents response received from indexer');
        return {
          success: false,
          error: 'NO_DOCUMENTS_FOUND',
          message: 'No documents found for the provided criteria',
          criteria: keywordParams,
          processedProjects: [],
          summary: {
            projectsCreated: 0,
            projectsUpdated: 0,
            projectsSkipped: 0,
            totalProcessed: 0
          }
        };
      }
      
      if (documentsResponse.length === 0) {
        this.logger.warn('Empty documents response received from indexer');
        return {
          success: false,
          error: 'NO_DOCUMENTS_FOUND',
          message: 'No documents found for the provided criteria',
          criteria: keywordParams,
          processedProjects: [],
          summary: {
            projectsCreated: 0,
            projectsUpdated: 0,
            projectsSkipped: 0,
            totalProcessed: 0
          }
        };
      }
      
      if (documentsResponse && Array.isArray(documentsResponse)) {
        for (const document of documentsResponse) {
          try {
            this.logger.log(`Processing document: ${document.uuid}`);
            
            // Extract basic project info from document
            const uuid = document.uuid;
            const status = document.status;
            const consensusTimestamp = document.consensusTimestamp;
            
            if (!uuid) {
              this.logger.warn(`Skipping document - missing uuid:`, document);
              continue;
            }
            
            // Parse analytics.textSearch to extract structured data
            const textSearch = document.analytics?.textSearch || '';
            const parsedData = this.parseTextSearch(textSearch);
            
            // Extract and map SDG IDs from textSearch
            const sdgIds = await this.extractSdgIdsFromText(textSearch);
            
            // Check if project already exists
            const exists = await this.projectExists(uuid);
            
            let projectData: any = null;
            
            if (exists) {
              // Get current project data for smart update
              const currentProject = await prisma.project.findUnique({
                where: { uniqueId: uuid }
              });
              
              // Check if project already has rich data (non-null values)
              const hasRichData = currentProject.projectName || 
                                 currentProject.primarySector || 
                                 currentProject.secondarySector || 
                                 currentProject.projectTypes || 
                                 currentProject.standards || 
                                 currentProject.projectMethodology ||
                                 (currentProject.impactAndRiskSdgs && Array.isArray(currentProject.impactAndRiskSdgs) && currentProject.impactAndRiskSdgs.length > 0) ||
                                 (currentProject.impactAndRiskAssessments && Array.isArray(currentProject.impactAndRiskAssessments) && currentProject.impactAndRiskAssessments.length > 0);
              
              if (hasRichData) {
                this.logger.log(`Skipping project ${uuid} - already has rich data`);
                projectData = {
                  status: 'skipped',
                  message: 'Project skipped - already has rich data from previous VC update',
                  project: currentProject,
                  sdgIds: [],
                  fieldsUpdated: []
                };
                processedProjects.push(projectData);
                projectsSkipped++;
                continue;
              }
              
              // For getFinalRecommendations, we only update specific fields that we have data for
              const updateData: any = {
                status: status,
                consensusTimestamp: consensusTimestamp
              };
              
              // Only add location if we have valid coordinates
              if (parsedData.latitude !== null && parsedData.longitude !== null) {
                updateData.latitude = parsedData.latitude;
                updateData.longitude = parsedData.longitude;
              }
              
              // Update project in database - only the fields we have data for
              let project = currentProject;
              if (Object.keys(updateData).length > 0) {
                project = await prisma.project.update({
                  where: { uniqueId: uuid },
                  data: updateData
                });
              }
              
              // Update SDG associations
              if (sdgIds.length > 0) {
                await prisma.projectSDG.deleteMany({
                  where: { projectId: project.id }
                });
                await this.createProjectSdgAssociations(project.id, sdgIds);
              }
              
              projectData = {
                status: 'updated',
                message: 'Project updated successfully from Hedera document (basic data only)',
                project,
                sdgIds,
                fieldsUpdated: Object.keys(updateData).filter(key => key !== 'status' && key !== 'consensusTimestamp')
              };
              
              processedProjects.push(projectData);
              projectsUpdated++;
            } else {
              // Create new project
              const projectCreateData = {
                uniqueId: uuid,
                status: status,
                consensusTimestamp: consensusTimestamp,
                latitude: parsedData.latitude,
                longitude: parsedData.longitude,
                // All other fields remain null initially as per requirements
                projectName: null,
                primarySector: null,
                secondarySector: null,
                projectTypes: null,
                standards: null,
                impactAndRiskSdgs: null,
                impactAndRiskAssessments: null,
                verificationMethod: null,
                proofPurpose: null,
                projectMethodology: null
              };
              
              // Create project in database
              const project = await prisma.project.create({
                data: projectCreateData
              });
              
              // Create SDG associations
              if (sdgIds.length > 0) {
                await this.createProjectSdgAssociations(project.id, sdgIds);
              }
              
              projectData = {
                status: 'created',
                message: 'Project created successfully from Hedera document',
                project,
                sdgIds
              };
              
              processedProjects.push(projectData);
              projectsCreated++;
            }
            
          } catch (error) {
            this.logger.error(`Error processing document ${document.uuid}:`, error);
          }
        }
      }

      return {
        message: 'Final recommendations processed successfully',
        criteria,
        documentsResponse,
        processedProjects,
        summary: {
          totalDocumentsFound: documentsResponse?.length || 0,
          projectsCreated: projectsCreated,
          projectsUpdated: projectsUpdated,
          totalProjectsProcessed: projectsCreated + projectsUpdated,
          projectsSkipped: projectsSkipped
        },
        status: 'documents_processed'
      };
    } catch (error) {
      this.logger.error('Error getting final project recommendations:', error);
      throw new Error('Failed to get final project recommendations');
    }
  }

  /**
   * Fetch ALL projects from the indexer (deduplicated) + hardcoded projects and upsert into DB.
   * Used by POST /project/resync after clearing the cache.
   */
  async resyncAllProjects(): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
    this.logger.log('resyncAllProjects: starting full resync (Hardcoded + Blockchain)');

    let created = 0, updated = 0, skipped = 0, errors = 0;

    // --- 1. Blockchain projects first (bulk of the data, fetched in parallel) ---
    let documents: any[] = [];
    try {
      documents = await this.indexerService.fetchUniqueProjects();
    } catch (err) {
      this.logger.error('resyncAllProjects: failed to fetch unique projects from indexer', err.message);
    }

    this.logger.log(`resyncAllProjects: upserting ${documents.length} blockchain projects`);

    // Upsert each project to DB as soon as the list is ready
    await Promise.allSettled(
      documents.map(async (doc) => {
        try {
          const uniqueId = doc.key;
          if (!uniqueId) { skipped++; return; }

          const standards = doc.standards || null;

          const projectData: any = {
            uniqueId,
            projectName: doc.name || null,
            projectMethodology: doc.methodology || null,
            consensusTimestamp: doc.timestamp || null,
            status: doc.status || null,
            standards,
            projectTypes: doc.projectTypes || null,
            primarySector: doc.primarySector || null,
            impactAndRiskSdgs: doc.impactAndRiskSdgs?.length > 0 ? doc.impactAndRiskSdgs : null,
            verificationMethod: doc.verificationMethod || null,
          };

          const upserted = await prisma.project.upsert({
            where: { uniqueId },
            update: projectData,
            create: projectData,
          });

          // Create SDG associations from impactAndRiskSdgs
          if (Array.isArray(doc.impactAndRiskSdgs) && doc.impactAndRiskSdgs.length > 0) {
            const sdgIds = await this.extractSdgIdsFromVc(doc.impactAndRiskSdgs);
            if (sdgIds.length > 0) {
              await prisma.projectSDG.deleteMany({ where: { projectId: upserted.id } });
              await this.createProjectSdgAssociations(upserted.id, sdgIds);
            }
          }

          updated++;
        } catch (e: any) {
          this.logger.error(`resyncAllProjects: error upserting ${doc.key}: ${e.message}`);
          errors++;
        }
      })
    );

    // --- 2. Hardcoded projects last (small number, runs after mainnet is already in DB) ---
    try {
      const hardcodedPath = path.join(process.cwd(), 'src', 'data', 'hardcoded-projects.json');
      if (fs.existsSync(hardcodedPath)) {
        const hardcodedProjects: any[] = JSON.parse(fs.readFileSync(hardcodedPath, 'utf-8'));
        this.logger.log(`resyncAllProjects: upserting ${hardcodedProjects.length} hardcoded projects`);

        for (const hp of hardcodedProjects) {
          try {
            const projectData: any = {
              uniqueId: hp.uniqueId,
              projectName: hp.projectName || null,
              projectMethodology: hp.projectMethodology || null,
              primarySector: hp.primarySector || null,
              projectTypes: hp.projectTypes || null,
              status: hp.status || 'Active',
              latitude: hp.latitude ?? null,
              longitude: hp.longitude ?? null,
              standards: hp.standards || null,
            };

            const upserted = await prisma.project.upsert({
              where: { uniqueId: hp.uniqueId },
              update: projectData,
              create: projectData,
            });

            if (Array.isArray(hp.sdgIds) && hp.sdgIds.length > 0) {
              await prisma.projectSDG.deleteMany({ where: { projectId: upserted.id } });
              for (const sdgId of hp.sdgIds) {
                const exists = await prisma.sDG.findUnique({ where: { id: sdgId } });
                if (exists) {
                  await prisma.projectSDG.create({ data: { projectId: upserted.id, sdgId } });
                }
              }
            }
            created++;
          } catch (e: any) {
            this.logger.error(`resyncAllProjects: error upserting hardcoded ${hp.uniqueId}: ${e.message}`);
            errors++;
          }
        }
      }
    } catch (e: any) {
      this.logger.warn('resyncAllProjects: could not load hardcoded-projects.json', e.message);
    }

    this.logger.log(`resyncAllProjects done — updated=${updated} created=${created} skipped=${skipped} errors=${errors}`);
    return { created, updated, skipped, errors };
  }

  /**
   * Get full VC data by consensusTimestamp and update project
   */
  async getVcByTimestamp(consensusTimestamp: string): Promise<any> {
    try {
      this.logger.log('Getting VC data for consensusTimestamp:', consensusTimestamp);

      // Step 1: Call getVcByMessageId to get full VC data
      let vcResponse;
      try {
        vcResponse = await this.indexerService.getVcByMessageId(consensusTimestamp);
      } catch (indexerError) {
        this.logger.error(`Failed to retrieve VC from indexer for timestamp: ${consensusTimestamp}`, {
          error: indexerError.message,
          timestamp: consensusTimestamp
        });
        
        // Return a structured error response instead of throwing
        return {
          success: false,
          error: 'VC_RETRIEVAL_FAILED',
          message: indexerError.message,
          timestamp: consensusTimestamp,
          details: {
            status: indexerError.response?.status,
            statusText: indexerError.response?.statusText
          }
        };
      }

      if (!vcResponse || !vcResponse.item) {
        this.logger.warn(`No VC data found for consensusTimestamp: ${consensusTimestamp}`);
        return {
          success: false,
          error: 'NO_VC_DATA',
          message: 'No VC data found for the given consensusTimestamp',
          timestamp: consensusTimestamp
        };
      }

      const vcData = vcResponse.item;
      const uuid = vcData.uuid;

      if (!uuid) {
        throw new Error('No UUID found in VC data');
      }

      // Step 2: Check if project exists in database
      const existingProject = await prisma.project.findUnique({
        where: { uniqueId: uuid }
      });

      if (!existingProject) {
        throw new Error(`Project with UUID ${uuid} not found in database`);
      }

      // Step 3: Parse the first document from the documents array
      if (!vcData.documents || !Array.isArray(vcData.documents) || vcData.documents.length === 0) {
        throw new Error('No documents found in VC data');
      }

      const documentString = vcData.documents[0];
      let parsedDocument: any;

      try {
        parsedDocument = typeof documentString === 'string' ? JSON.parse(documentString) : documentString;
      } catch (parseError) {
        throw new Error(`Failed to parse VC document: ${parseError.message}`);
      }

      // Step 4: Extract credentialSubject data (may be an array or a single object)
      const rawCs = parsedDocument.credentialSubject;
      if (rawCs == null) {
        throw new Error('No credentialSubject found in parsed document');
      }
      const credentialSubject = Array.isArray(rawCs) ? rawCs[0] : rawCs;

      // Step 5: Extract and map SDG IDs from impactAndRiskSdgs (direct or nested under projectDescription)
      const rawSdgs: string[] =
        (Array.isArray(credentialSubject.impactAndRiskSdgs) && credentialSubject.impactAndRiskSdgs.length > 0
          ? credentialSubject.impactAndRiskSdgs
          : null) ??
        (Array.isArray(credentialSubject.projectDescription?.impactAndRiskSdgs) &&
         credentialSubject.projectDescription.impactAndRiskSdgs.length > 0
          ? credentialSubject.projectDescription.impactAndRiskSdgs
          : null) ??
        [];
      const sdgIds = await this.extractSdgIdsFromVc(rawSdgs);

      // Step 6: Update project with full VC data
      const incomingData: any = {
        status: vcData.status,
        consensusTimestamp: vcData.consensusTimestamp
      };
      
      // Only add fields that have actual values
      // Multi-schema name extraction: VM0042/CCB uses projectDescription.name,
      // VM0033 uses projectTitle, older schemas use project_details.G5, legacy uses projectName
      const extractedName =
        credentialSubject.projectName ||
        (typeof credentialSubject.projectDescription === 'object'
          ? credentialSubject.projectDescription?.name
          : null) ||
        credentialSubject.projectTitle ||
        (typeof credentialSubject.project_details === 'object'
          ? credentialSubject.project_details?.G5
          : null);
      if (extractedName) {
        incomingData.projectName = extractedName;
      }
      // Primary sector: direct field or VM0047 G143.G5
      const primarySector =
        credentialSubject.primarySector ||
        (typeof credentialSubject.projectDescription?.G143 === 'object'
          ? credentialSubject.projectDescription?.G143?.G5
          : null);
      if (primarySector) incomingData.primarySector = primarySector;

      if (credentialSubject.secondarySector) {
        incomingData.secondarySector = credentialSubject.secondarySector;
      }

      // Project types: multi-schema extraction
      const parsePyList = (s: string) => {
        const t = s?.trim();
        if (!t?.startsWith('[')) return s;
        return t.slice(1, -1).split(',').map(p => p.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).join(', ');
      };
      const rawProjectTypes =
        credentialSubject.projectTypes ||
        credentialSubject.projectType ||
        (() => {
          const pd = credentialSubject.projectDescription;
          if (typeof pd !== 'object' || pd === null) return null;
          const vcsTypes = pd?.registry_vcs?.vcs_additional_project_types;
          if (Array.isArray(vcsTypes) && vcsTypes.length > 0) return vcsTypes.join(', ');
          const g143Type = pd?.G143?.G6;
          if (g143Type && g143Type !== 'Not specified') return g143Type;
          const ccbType = pd?.registry_ccb?.ccb_project_type;
          if (ccbType && ccbType !== 'Not specified') return ccbType;
          return null;
        })() ||
        credentialSubject.project_type ||
        credentialSubject.type_of_project;
      if (rawProjectTypes) {
        const normalized = Array.isArray(rawProjectTypes) ? rawProjectTypes.join(', ') : String(rawProjectTypes);
        incomingData.projectTypes = parsePyList(normalized);
      }
      if (credentialSubject.standards) {
        incomingData.standards = credentialSubject.standards;
      }
      if (credentialSubject.projectMethodology) {
        incomingData.projectMethodology = credentialSubject.projectMethodology;
      }
      if (parsedDocument.proof?.verificationMethod) {
        incomingData.verificationMethod = parsedDocument.proof.verificationMethod;
      }
      if (parsedDocument.proof?.proofPurpose) {
        incomingData.proofPurpose = parsedDocument.proof.proofPurpose;
      }
      
      // Only add arrays if they have content
      if (rawSdgs.length > 0) {
        incomingData.impactAndRiskSdgs = rawSdgs;
      }
      if (credentialSubject.impactAndRiskAssessments && Array.isArray(credentialSubject.impactAndRiskAssessments) && 
          credentialSubject.impactAndRiskAssessments.length > 0) {
        incomingData.impactAndRiskAssessments = credentialSubject.impactAndRiskAssessments;
      }

      // Extract location from centerPointsAddress
      if (credentialSubject.centerPointsAddress && Array.isArray(credentialSubject.centerPointsAddress) && credentialSubject.centerPointsAddress.length > 0) {
        const locationData = this.extractLocationFromCenterPoints(credentialSubject.centerPointsAddress[0]);
        if (locationData.latitude !== null && locationData.longitude !== null) {
          incomingData.latitude = locationData.latitude;
          incomingData.longitude = locationData.longitude;
        }
      }

      // Use smart update logic
      const projectUpdateData = this.buildSmartUpdateData(existingProject, incomingData);
      
      // Only update if there are fields to update
      let updatedProject = existingProject;
      if (Object.keys(projectUpdateData).length > 0) {
        this.logger.log(`💾 Updating project ${existingProject.uniqueId} with ${Object.keys(projectUpdateData).length} fields:`, projectUpdateData);
        updatedProject = await prisma.project.update({
          where: { uniqueId: uuid },
          data: projectUpdateData
        });
        this.logger.log(`✅ Project ${existingProject.uniqueId} updated successfully`);
      } else {
        this.logger.log(`⏭️ No fields to update for project ${existingProject.uniqueId}`);
      }

      // Update SDG associations
      if (sdgIds.length > 0) {
        await prisma.projectSDG.deleteMany({
          where: { projectId: updatedProject.id }
        });
        await this.createProjectSdgAssociations(updatedProject.id, sdgIds);
      }

      return {
        id: vcData.consensusTimestamp,
        uuid: vcData.uuid,
        item: vcData,
        projectUpdated: {
          status: 'updated',
          message: 'Project updated successfully with full VC data',
          project: updatedProject,
          sdgIds: sdgIds,
          fieldsUpdated: Object.keys(projectUpdateData).filter(key => key !== 'status' && key !== 'consensusTimestamp')
        }
      };

    } catch (error) {
      this.logger.error('Error getting VC by timestamp:', error);
      throw new Error(`Failed to get VC by timestamp: ${error.message}`);
    }
  }

  /**
   * Parse textSearch string to extract structured data
   */
  private parseTextSearch(textSearch: string): { latitude: number | null; longitude: number | null } {
    try {
      // Extract latitude and longitude from textSearch
      const locationMatch = textSearch.match(/latitude:\s*([-\d.]+),\s*longitude:\s*([-\d.]+)/);
      
      if (locationMatch) {
        return {
          latitude: parseFloat(locationMatch[1]),
          longitude: parseFloat(locationMatch[2])
        };
      }
      
      return { latitude: null, longitude: null };
    } catch (error) {
      this.logger.warn('Error parsing textSearch for location:', error);
      return { latitude: null, longitude: null };
    }
  }

  /**
   * Extract SDG IDs from textSearch string
   */
  private async extractSdgIdsFromText(textSearch: string): Promise<number[]> {
    try {
      let sdgNumbers: number[] = [];
      
      // Method 1: Find SDG patterns like "#1 - SDG Type/Name: 1, Target: target no poverty"
      const sdgMatches = textSearch.matchAll(/#\d+\s*-\s*SDG Type\/Name:\s*(\d+)/g);
      const method1Sdgs = Array.from(sdgMatches, match => parseInt(match[1]));
      sdgNumbers.push(...method1Sdgs);
      
      // Method 2: Find JSON array format like ["SDG 1: No poverty","SDG 3: Good health and wellbeing"]
      const sdgStrings = textSearch.match(/"SDG \d+:[^"]*"/g);
      if (sdgStrings) {
        for (const sdgString of sdgStrings) {
          const sdgNumberMatch = sdgString.match(/SDG (\d+):/);
          if (sdgNumberMatch) {
            sdgNumbers.push(parseInt(sdgNumberMatch[1]));
          }
        }
      }
      
      // Method 3: Find simple "SDG X" pattern
      const simpleSdgMatches = textSearch.matchAll(/SDG\s*(\d+)/gi);
      const method3Sdgs = Array.from(simpleSdgMatches, match => parseInt(match[1]));
      sdgNumbers.push(...method3Sdgs);
      
      // Remove duplicates
      sdgNumbers = [...new Set(sdgNumbers)];
      
      if (sdgNumbers.length === 0) {
        this.logger.log('No SDG numbers found in textSearch:', textSearch);
        return [];
      }
      
      // Look up SDG names by number
      const allSdgs = await prisma.sDG.findMany();
      const sdgNames: string[] = [];
      
      for (const sdgNumber of sdgNumbers) {
        const sdg = allSdgs.find(s => s.id === sdgNumber);
        if (sdg) {
          sdgNames.push(sdg.name);
          this.logger.log(`Found SDG: ${sdg.name} (ID: ${sdgNumber})`);
        } else {
          this.logger.warn(`SDG with ID ${sdgNumber} not found in database`);
        }
      }
      
      // Map SDG names to IDs
      const sdgIds = await this.mapSdgNamesToIds(sdgNames);
      this.logger.log(`Extracted SDG IDs: ${sdgIds.join(', ')}`);
      return sdgIds;
    } catch (error) {
      this.logger.warn('Error extracting SDG IDs from text:', error);
      return [];
    }
  }

  /**
   * Extract SDG IDs from VC impactAndRiskSdgs array
   */
  private async extractSdgIdsFromVc(sdgStrings: string[]): Promise<number[]> {
    try {
      if (!Array.isArray(sdgStrings) || sdgStrings.length === 0) {
        return [];
      }

      const allSdgs = await prisma.sDG.findMany();
      const sdgNames: string[] = [];

      for (const sdgString of sdgStrings) {
        try {
          if (!sdgString.toLowerCase().includes('sdg')) {
            continue;
          }
          const sdgNumberMatch = sdgString.match(/SDG Type\/Name:\s*(\d+)/i);
          if (!sdgNumberMatch || !sdgNumberMatch[1]) {
            continue;
          }
          const sdgNumber = parseInt(sdgNumberMatch[1]);
          const sdg = allSdgs.find(s => s.id === sdgNumber);
          if (sdg) {
            if (sdgString.toLowerCase().includes(sdg.name.toLowerCase())) {
              sdgNames.push(sdg.name);
            } else {
              sdgNames.push(sdg.name); // Add even if name not explicitly in string
            }
          }
        } catch (error) {
          this.logger.warn('Error processing SDG string:', sdgString, error);
        }
      }

      return await this.mapSdgNamesToIds(sdgNames);
    } catch (error) {
      this.logger.warn('Error extracting SDG IDs from VC:', error);
      return [];
    }
  }

  /**
   * Extract location from centerPointsAddress string
   */
  private extractLocationFromCenterPoints(centerPointsAddress: string): { latitude: number | null; longitude: number | null } {
    try {
      const locationMatch = centerPointsAddress.match(/latitude:\s*([-\d.]+),\s*longitude:\s*([-\d.]+)/);
      
      if (locationMatch) {
        return {
          latitude: parseFloat(locationMatch[1]),
          longitude: parseFloat(locationMatch[2])
        };
      }
      
      return { latitude: null, longitude: null };
    } catch (error) {
      this.logger.warn('Error parsing centerPointsAddress for location:', error);
      return { latitude: null, longitude: null };
    }
  }
} 