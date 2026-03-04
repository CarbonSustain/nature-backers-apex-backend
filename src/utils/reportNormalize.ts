// utils/reportNormalize.ts
export type ReportData = {
    // Executive Summary
    employeesEngaged: number | string;
    votesCast: number | string;
    verifiedProjects: number | string;
    participationRate: string;          // eg "45%" (pre-formatted)
    estimatedCO2Impact: string;         // eg "12.3 tCO2e"

    // Campaign Details
    campaignName: string;
    departmentsParticipated: string;    // eg "Engineering, Marketing"
    startDate: string;                  // pre-formatted
    endDate: string;                    // pre-formatted
    preparedBy: string;
    reportDate: string;                 // pre-formatted

    // Overview / Mechanics
    campaignPurpose: string;
    campaignMechanics: string;

    // Snapshot
    projectsVotedOn: number | string;
    mostVotedProject: string;
    departmentEngagementRate: string;   // eg "63%"

    // Top projects
    topProjects: Array<{
        title: string;
        location: string;
        type: string;
        votes: number | string;
        description: string;
    }>;

    // Impact metrics
    biodiversityBenefit: string;
    socialImpact: string;
    womenLedProjects: string;

    // SDGs
    sdgGoals: Array<{
        number: string | number;
        name: string;
        description: string;
        projectsAligned: string | number;
    }>;

    // Qualitative
    employeeInsights: Array<{ quote: string; author: string }>;
    lessonsLearned: string[];
    recommendations: string[];

    // Footer
    contactEmail: string;
    platformLink: string;
};

const fmtDate = (d?: string | Date) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

export function normalizeReportData(input: Partial<ReportData>): ReportData {
    return {
        employeesEngaged: input.employeesEngaged ?? '',
        votesCast: input.votesCast ?? '',
        verifiedProjects: input.verifiedProjects ?? '',
        participationRate: input.participationRate ?? '',
        // Use "CO2" to avoid glyph issues with Helvetica subscript
        estimatedCO2Impact: (input.estimatedCO2Impact ?? '').toString().replace('CO₂', 'CO2'),

        campaignName: input.campaignName ?? '',
        departmentsParticipated: input.departmentsParticipated ?? '',
        startDate: input.startDate ? fmtDate(input.startDate) : '',
        endDate: input.endDate ? fmtDate(input.endDate) : '',
        preparedBy: input.preparedBy ?? '',
        reportDate: input.reportDate ? fmtDate(input.reportDate) : fmtDate(new Date()),

        campaignPurpose: input.campaignPurpose ?? '',
        campaignMechanics: input.campaignMechanics ?? '',

        projectsVotedOn: input.projectsVotedOn ?? '',
        mostVotedProject: input.mostVotedProject ?? '',
        departmentEngagementRate: input.departmentEngagementRate ?? '',

        topProjects: (input.topProjects ?? []).slice(0, 3).map((p) => ({
            title: p?.title ?? '',
            location: p?.location ?? '',
            type: p?.type ?? '',
            votes: p?.votes ?? '',
            description: p?.description ?? '',
        })),

        biodiversityBenefit: input.biodiversityBenefit ?? '',
        socialImpact: input.socialImpact ?? '',
        womenLedProjects: input.womenLedProjects ?? '',

        sdgGoals: (input.sdgGoals ?? []).slice(0, 5).map((g) => ({
            number: g?.number ?? '',
            name: g?.name ?? '',
            description: g?.description ?? '',
            projectsAligned: g?.projectsAligned ?? '',
        })),

        employeeInsights: (input.employeeInsights ?? []).map((e) => ({
            quote: e?.quote ?? '',
            author: e?.author ?? '',
        })),
        lessonsLearned: input.lessonsLearned ?? [],
        recommendations: input.recommendations ?? [],

        contactEmail: input.contactEmail ?? '',
        platformLink: input.platformLink ?? '',
    };
}
