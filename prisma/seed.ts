import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. ROLES (Independent)
  console.log('Creating roles...')
  const roles = await prisma.role.createMany({
    data: [
      { name: 'Admin' },
      { name: 'Manager' },
      { name: 'Employee' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Roles created')

  // 2. DEPARTMENTS (Independent)
  console.log('Creating departments...')
  const departments = await prisma.department.createMany({
    data: [
      { name: 'Engineering' },
      { name: 'Marketing' },
      { name: 'Sales' },
      { name: 'Human Resources' },
      { name: 'Finance' },
      { name: 'Operations' },
      { name: 'Product' },
      { name: 'Design' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Departments created')

  // 3. CAMPAIGN STATUSES (Independent)
  console.log('Creating campaign statuses...')
  const campaignStatuses = await prisma.campaignStatus.createMany({
    data: [
      { name: 'Created' },
      { name: 'Active' },
      { name: 'Pending' },
      { name: 'Rejected' },
      { name: 'Approved' },
      { name: 'Cancelled' }
    ],
    skipDuplicates: true
  })
  console.log('✅ Campaign statuses created')

  // 4. SDGs (Independent)
  console.log('Creating SDGs...')
  const sdgs = await prisma.sDG.createMany({
    data: [
      { name: 'No Poverty' },
      { name: 'Zero Hunger' },
      { name: 'Good Health and Well-being' },
      { name: 'Quality Education' },
      { name: 'Gender Equality' },
      { name: 'Clean Water and Sanitation' },
      { name: 'Affordable and Clean Energy' },
      { name: 'Decent Work and Economic Growth' },
      { name: 'Industry, Innovation and Infrastructure' },
      { name: 'Reduced Inequalities' },
      { name: 'Sustainable Cities and Communities' },
      { name: 'Responsible Consumption and Production' },
      { name: 'Climate Action' },
      { name: 'Life Below Water' },
      { name: 'Life on Land' },
      { name: 'Peace, Justice and Strong Institutions' },
      { name: 'Partnerships for the Goals' }
    ],
    skipDuplicates: true
  })
  console.log('✅ SDGs created')

  // 9. PROJECT FILTERS (Independent)
  console.log('Creating project filters...')
  const filterData = [
    {
      name: 'fundingTarget',
      label: 'Funding Target',
      options: [
        { value: '< $10k', label: 'Less than $10k' },
        { value: '$10k–$50k', label: '$10k to $50k' },
        { value: '> $50k', label: 'More than $50k' }
      ]
    },
    {
      name: 'timeframe',
      label: 'Timeframe',
      options: [
        { value: 'short', label: 'Short Term' },
        { value: 'medium', label: 'Medium Term' },
        { value: 'long', label: 'Long Term' }
      ]
    },
    {
      name: 'geographicLocation',
      label: 'Geographic Location',
      options: [
        { value: 'asia', label: 'Asia' },
        { value: 'europe', label: 'Europe' },
        { value: 'africa', label: 'Africa' }
      ]
    },
    {
      name: 'projectType',
      label: 'Project Type',
      options: [
        { value: 'reforestation', label: 'Reforestation' },
        { value: 'mangrove_reforestation', label: 'Mangrove Reforestation' },
        { value: 'watershed_protection', label: 'Watershed protection' },
        { value: 'agroforestry', label: 'Agroforestry' },
        { value: 'biodiversity_corridors', label: 'Biodiversity Corridors' },
        { value: 'ocean_cleanup', label: 'Ocean Cleanup' }
      ]
    },

    {
      name: 'verificationStandard',
      label: 'Verification Standard',
      options: [
        { value: 'verra', label: 'Verra' },
        { value: 'gold_standard', label: 'Gold Standard' }
      ]
    },
    {
      name: 'healthSocialEquity',
      label: 'Health & Social Equity',
      options: [
        { value: 'air_quality', label: 'Air Quality' },
        { value: 'clean_water', label: 'Clean Water' },
        { value: 'heat_resilience', label: 'Heat Resilience' },
        { value: 'disease_prevention', label: 'Disease Prevention' },
        { value: 'health_access', label: 'Health Access' },
        { value: 'local_jobs', label: 'Local Jobs' },
        { value: 'women_youth', label: 'Women & Youth' }
      ]
    }
  ];

  for (const category of filterData) {
    // Check if category already exists
    let existingCategory = await prisma.filterCategory.findUnique({
      where: { name: category.name }
    });

    if (!existingCategory) {
      // Create the filter category
      existingCategory = await prisma.filterCategory.create({
        data: {
          name: category.name,
          label: category.label
        }
      });
      console.log(`✅ Created filter category: ${category.name}`);
    } else {
      console.log(`ℹ️ Filter category already exists: ${category.name}`);
    }

    // Create the options for this category
    for (const option of category.options) {
      const existingOption = await prisma.filterOption.findFirst({
        where: {
          filterCategoryId: existingCategory.id,
          value: option.value
        }
      });

      if (!existingOption) {
        await prisma.filterOption.create({
          data: {
            value: option.value,
            label: option.label,
            filterCategoryId: existingCategory.id
          }
        });
        console.log(`✅ Created filter option: ${option.value} for ${category.name}`);
      } else {
        console.log(`ℹ️ Filter option already exists: ${option.value} for ${category.name}`);
      }
    }
  }
  console.log('✅ Project filters created')

  console.log('🎉 Independent tables seeded successfully!')
  console.log('📝 Projects will be created through the final recommendations API')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 