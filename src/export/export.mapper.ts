export function mapCampaignForExport(campaign: any) {
  return {
    campaignName: campaign?.name || '',
    startDate: campaign?.startDate || '',
    endDate: campaign?.endDate || '',
    numberOfProjects: Array.isArray(campaign?.CampaignProject) ? campaign.CampaignProject.length : 0,
    mostVotedProject: campaign?.mostVotedProject || '',
    departmentsParticipated: Array.isArray(campaign?.CampaignDepartment)
      ? campaign.CampaignDepartment
        .map((cd: any) => cd?.department?.name)
        .filter(Boolean)
        .join(', ')
      : '',
    topDepartment: campaign?.topDepartment || '',
    totalVotes: Number.isFinite(campaign?.totalVotes) ? campaign.totalVotes : 0,
    sdgAlignment: campaign?.sdgAlignment || '',
    topReasonsForVoting: campaign?.topReasonsForVoting || '',
    guardianVerified: campaign?.guardianVerified ? 'Yes' : 'No',
    methodology: campaign?.methodology || '',
    campaignStatus: campaign?.campaignStatus?.name || '',
  };
}