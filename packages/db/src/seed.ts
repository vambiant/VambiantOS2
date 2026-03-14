import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from './schema/index';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

function generateUlid(): string {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const now = Date.now();
  let timeStr = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    timeStr = chars[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  let randomStr = '';
  for (let i = 0; i < 16; i++) {
    randomStr += chars[Math.floor(Math.random() * 32)];
  }
  return timeStr + randomStr;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  console.log('Seeding database...');

  // ---- Company ----
  console.log('  Creating company...');
  const [company] = await db
    .insert(schema.companies)
    .values({
      ulid: generateUlid(),
      name: 'Müller Architekten GmbH',
      legalForm: 'GmbH',
      taxId: 'DE123456789',
      vatId: 'DE123456789',
      address: {
        street: 'Schillerstraße 42',
        zip: '80336',
        city: 'München',
        country: 'DE',
        bundesland: 'Bayern',
      },
      contact: {
        phone: '+49 89 123456',
        email: 'info@mueller-architekten.de',
        website: 'https://mueller-architekten.de',
      },
      domain: 'mueller-architekten.de',
      settings: {},
      billingConfig: {
        defaultPaymentTerms: 30,
        defaultVatRate: 19,
      },
      offerNumberPattern: '{YEAR}-A{NUM}',
    })
    .returning();

  console.log(`  Company created: ${company!.name} (id: ${company!.id})`);

  // ---- Admin Role ----
  console.log('  Creating admin role...');
  const [adminRole] = await db
    .insert(schema.roles)
    .values({
      companyId: company!.id,
      name: 'Administrator',
      slug: 'admin',
      permissions: [
        'users.manage',
        'roles.manage',
        'projects.manage',
        'projects.create',
        'projects.delete',
        'organizations.manage',
        'contracts.manage',
        'invoices.manage',
        'costs.manage',
        'procurement.manage',
        'bim.manage',
        'reports.view',
        'settings.manage',
        'company.manage',
      ],
      isSystem: true,
    })
    .returning();

  // ---- User ----
  console.log('  Creating admin user...');
  const passwordHash = await bcrypt.hash('Test1234!', 12);
  const [adminUser] = await db
    .insert(schema.users)
    .values({
      ulid: generateUlid(),
      email: 'admin@vambiant.de',
      passwordHash,
      firstName: 'Max',
      lastName: 'Müller',
      phone: '+49 170 1234567',
      locale: 'de',
      timezone: 'Europe/Berlin',
      isSuperAdmin: true,
      currentCompanyId: company!.id,
      settings: {
        theme: 'system',
        notificationEmail: true,
        notificationPush: true,
      },
    })
    .returning();

  console.log(
    `  Admin user created: ${adminUser!.email} (id: ${adminUser!.id})`,
  );

  // ---- Company-User pivot ----
  await db.insert(schema.companyUser).values({
    companyId: company!.id,
    userId: adminUser!.id,
    roleId: adminRole!.id,
    defaultWorkHoursPerDay: '8',
    vacationDaysPerYear: 30,
    remainingVacationDays: 30,
  });

  // ---- Additional Roles ----
  console.log('  Creating additional roles...');
  await db.insert(schema.roles).values([
    {
      companyId: company!.id,
      name: 'Projektleiter',
      slug: 'project-manager',
      permissions: [
        'projects.manage',
        'projects.create',
        'organizations.manage',
        'contracts.manage',
        'invoices.manage',
        'costs.manage',
        'reports.view',
      ],
      isSystem: true,
    },
    {
      companyId: company!.id,
      name: 'Mitarbeiter',
      slug: 'member',
      permissions: [
        'projects.view',
        'organizations.view',
        'contracts.view',
        'invoices.view',
        'costs.view',
      ],
      isSystem: true,
    },
  ]);

  // ---- Organizations (Clients, Contractors) ----
  console.log('  Creating organizations...');
  const [clientOrg] = await db
    .insert(schema.organizations)
    .values({
      companyId: company!.id,
      type: 'client',
      name: 'Bayerische Staatsbauverwaltung',
      legalForm: 'Behörde',
      address: {
        street: 'Franz-Josef-Strauß-Ring 4',
        zip: '80539',
        city: 'München',
        country: 'DE',
        state: 'Bayern',
      },
      contact: {
        phone: '+49 89 2192-01',
        email: 'poststelle@stmb.bayern.de',
      },
      status: 'active',
      clientNumber: 'K-001',
    })
    .returning();

  const [contractor1] = await db
    .insert(schema.organizations)
    .values({
      companyId: company!.id,
      type: 'contractor',
      name: 'Schmidt Bauunternehmen GmbH',
      legalForm: 'GmbH',
      address: {
        street: 'Industriestraße 15',
        zip: '85764',
        city: 'Oberschleißheim',
        country: 'DE',
        state: 'Bayern',
      },
      contact: {
        phone: '+49 89 315555',
        email: 'info@schmidt-bau.de',
      },
      status: 'active',
      creditorNumber: 'L-001',
    })
    .returning();

  const [contractor2] = await db
    .insert(schema.organizations)
    .values({
      companyId: company!.id,
      type: 'contractor',
      name: 'Weber Haustechnik AG',
      legalForm: 'AG',
      address: {
        street: 'Technikweg 8',
        zip: '80333',
        city: 'München',
        country: 'DE',
        state: 'Bayern',
      },
      contact: {
        phone: '+49 89 442211',
        email: 'kontakt@weber-haustechnik.de',
      },
      status: 'active',
      creditorNumber: 'L-002',
    })
    .returning();

  // ---- Projects ----
  console.log('  Creating projects...');
  const projectsData = [
    {
      ulid: generateUlid(),
      companyId: company!.id,
      clientId: clientOrg!.id,
      projectManagerId: adminUser!.id,
      name: 'Neubau Grundschule Bogenhausen',
      code: '2026-001',
      description:
        'Neubau einer dreizügigen Grundschule mit Sporthalle und Außenanlagen in München-Bogenhausen.',
      status: 'active' as const,
      scope: 'project' as const,
      projectType: 'Schulbau',
      hoaiZone: 3 as const,
      useBim: true,
      bimStandard: 'IFC4',
      timeTrackingEnabled: true,
      estimatedHours: '4500',
      budgetNet: '2800000.00',
      vatRate: '19.0',
      currency: 'EUR',
      address: {
        street: 'Bogenhauser Kirchplatz',
        zip: '81675',
        city: 'München',
        country: 'DE',
        bundesland: 'Bayern',
      },
      buildingType: 'Bildungsbauten',
      buildingTypeL2: 'Grundschulen',
      startDate: '2026-01-15',
      endDate: '2028-06-30',
    },
    {
      ulid: generateUlid(),
      companyId: company!.id,
      clientId: clientOrg!.id,
      projectManagerId: adminUser!.id,
      name: 'Sanierung Rathaus Pasing',
      code: '2026-002',
      description:
        'Energetische Sanierung und Modernisierung des denkmalgeschützten Rathauses in München-Pasing.',
      status: 'active' as const,
      scope: 'project' as const,
      projectType: 'Sanierung',
      hoaiZone: 4 as const,
      useBim: false,
      timeTrackingEnabled: true,
      estimatedHours: '2200',
      budgetNet: '950000.00',
      vatRate: '19.0',
      currency: 'EUR',
      address: {
        street: 'Landsberger Str. 486',
        zip: '81241',
        city: 'München',
        country: 'DE',
        bundesland: 'Bayern',
      },
      buildingType: 'Verwaltungsgebäude',
      buildingTypeL2: 'Rathäuser',
      startDate: '2026-03-01',
      endDate: '2027-12-31',
    },
    {
      ulid: generateUlid(),
      companyId: company!.id,
      projectManagerId: adminUser!.id,
      name: 'Wohnanlage Am Stadtpark',
      code: '2026-003',
      description:
        'Planung einer Wohnanlage mit 48 Wohneinheiten, Tiefgarage und Gemeinschaftsräumen.',
      status: 'draft' as const,
      scope: 'project' as const,
      projectType: 'Neubau',
      hoaiZone: 3 as const,
      useBim: true,
      bimStandard: 'IFC4',
      timeTrackingEnabled: true,
      estimatedHours: '3800',
      budgetNet: '1500000.00',
      vatRate: '19.0',
      currency: 'EUR',
      address: {
        street: 'Am Stadtpark 12',
        zip: '85521',
        city: 'Ottobrunn',
        country: 'DE',
        bundesland: 'Bayern',
      },
      buildingType: 'Wohnungsbau',
      buildingTypeL2: 'Mehrfamilienhäuser',
      startDate: '2026-06-01',
      endDate: '2029-03-31',
    },
  ];

  const insertedProjects = await db
    .insert(schema.projects)
    .values(projectsData)
    .returning();

  for (const p of insertedProjects) {
    console.log(`  Project created: ${p.name} (id: ${p.id})`);
  }

  // Link admin user to all projects
  for (const project of insertedProjects) {
    await db.insert(schema.projectUsers).values({
      projectId: project.id,
      userId: adminUser!.id,
      role: 'project_manager',
      permissions: ['*'],
    });
  }

  // ---- Modules (HOAI Leistungsphasen LP1-LP9) for first project ----
  console.log('  Creating HOAI modules...');
  const hoaiPhases = [
    { phase: 1, name: 'LP1 - Grundlagenermittlung', percentage: '2' },
    { phase: 2, name: 'LP2 - Vorplanung', percentage: '7' },
    { phase: 3, name: 'LP3 - Entwurfsplanung', percentage: '15' },
    { phase: 4, name: 'LP4 - Genehmigungsplanung', percentage: '3' },
    { phase: 5, name: 'LP5 - Ausführungsplanung', percentage: '25' },
    { phase: 6, name: 'LP6 - Vorbereitung der Vergabe', percentage: '10' },
    { phase: 7, name: 'LP7 - Mitwirkung bei der Vergabe', percentage: '4' },
    { phase: 8, name: 'LP8 - Objektüberwachung (Bauüberwachung)', percentage: '32' },
    { phase: 9, name: 'LP9 - Objektbetreuung', percentage: '2' },
  ];

  const project1 = insertedProjects[0]!;

  const insertedModules = [];
  for (let i = 0; i < hoaiPhases.length; i++) {
    const hp = hoaiPhases[i]!;
    const [mod] = await db
      .insert(schema.modules)
      .values({
        projectId: project1.id,
        scope: 'project',
        name: hp.name,
        code: `LP${hp.phase}`,
        hoaiPhase: hp.phase,
        phaseType: 'hoai',
        percentage: hp.percentage,
        sortOrder: i + 1,
        status: hp.phase <= 2 ? 'active' : 'planned',
        startDate:
          hp.phase === 1 ? '2026-01-15' : hp.phase === 2 ? '2026-03-01' : undefined,
        endDate:
          hp.phase === 1 ? '2026-02-28' : hp.phase === 2 ? '2026-05-31' : undefined,
        plannedHours: String(Math.round(4500 * (Number(hp.percentage) / 100))),
      })
      .returning();
    insertedModules.push(mod!);
  }

  // ---- Milestones ----
  console.log('  Creating milestones...');
  const milestonesData = [
    {
      projectId: project1.id,
      moduleId: insertedModules[0]!.id,
      scope: 'project',
      name: 'Grundlagenermittlung abgeschlossen',
      code: 'M-001',
      status: 'completed',
      targetDate: '2026-02-28',
      completedDate: '2026-02-25',
      sortOrder: 1,
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[1]!.id,
      scope: 'project',
      name: 'Vorplanung genehmigt',
      code: 'M-002',
      status: 'pending',
      targetDate: '2026-05-31',
      sortOrder: 2,
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[2]!.id,
      scope: 'project',
      name: 'Entwurf freigegeben',
      code: 'M-003',
      status: 'pending',
      targetDate: '2026-09-30',
      sortOrder: 3,
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[3]!.id,
      scope: 'project',
      name: 'Baugenehmigung erteilt',
      code: 'M-004',
      status: 'pending',
      targetDate: '2026-12-15',
      sortOrder: 4,
    },
  ];

  await db.insert(schema.milestones).values(milestonesData);

  // ---- Tasks ----
  console.log('  Creating tasks...');
  const tasksData = [
    {
      projectId: project1.id,
      moduleId: insertedModules[0]!.id,
      assignedTo: adminUser!.id,
      scope: 'project',
      title: 'Bestandsaufnahme vor Ort',
      code: 'T-001',
      status: 'completed',
      priority: 2,
      estimatedHours: '16',
      hoaiPhase: 1,
      isHoaiBasic: true,
      startDate: '2026-01-15',
      dueDate: '2026-01-20',
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[0]!.id,
      assignedTo: adminUser!.id,
      scope: 'project',
      title: 'Abstimmung mit Auftraggeber',
      code: 'T-002',
      status: 'completed',
      priority: 2,
      estimatedHours: '8',
      hoaiPhase: 1,
      isHoaiBasic: true,
      startDate: '2026-01-22',
      dueDate: '2026-01-25',
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[1]!.id,
      assignedTo: adminUser!.id,
      scope: 'project',
      title: 'Entwurfsskizzen erstellen',
      code: 'T-003',
      status: 'in_progress',
      priority: 2,
      estimatedHours: '40',
      hoaiPhase: 2,
      isHoaiBasic: true,
      startDate: '2026-03-01',
      dueDate: '2026-03-21',
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[1]!.id,
      assignedTo: adminUser!.id,
      scope: 'project',
      title: 'Kostenschätzung LP2',
      code: 'T-004',
      status: 'open',
      priority: 3,
      estimatedHours: '24',
      hoaiPhase: 2,
      isHoaiBasic: true,
      startDate: '2026-03-22',
      dueDate: '2026-04-05',
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[1]!.id,
      scope: 'project',
      title: 'Brandschutzkonzept abstimmen',
      code: 'T-005',
      status: 'open',
      priority: 3,
      estimatedHours: '16',
      hoaiPhase: 2,
      isHoaiSpecial: true,
      startDate: '2026-04-01',
      dueDate: '2026-04-15',
    },
    {
      projectId: project1.id,
      moduleId: insertedModules[2]!.id,
      scope: 'project',
      title: 'Entwurfsplanung M 1:100',
      code: 'T-006',
      status: 'open',
      priority: 2,
      estimatedHours: '120',
      hoaiPhase: 3,
      isHoaiBasic: true,
    },
  ];

  await db.insert(schema.tasks).values(tasksData);

  // ---- VAT Rates ----
  console.log('  Creating VAT rates...');
  await db.insert(schema.vatRates).values([
    {
      companyId: company!.id,
      name: 'Regelsteuersatz',
      rate: '19.00',
      isDefault: true,
      validFrom: '2007-01-01',
    },
    {
      companyId: company!.id,
      name: 'Ermäßigter Steuersatz',
      rate: '7.00',
      isDefault: false,
      validFrom: '2007-01-01',
    },
  ]);

  // ---- DIN 276 Cost Framework ----
  console.log('  Creating DIN 276 cost framework...');
  await db.insert(schema.costFrameworks).values({
    companyId: company!.id,
    name: 'DIN 276 (2018-12)',
    frameworkType: 'din276',
    year: 2018,
    description:
      'Kostengruppen nach DIN 276:2018-12 - Kosten im Bauwesen',
    structure: [
      {
        code: '100',
        name: 'Grundstück',
        children: [
          { code: '110', name: 'Grundstückswert' },
          { code: '120', name: 'Grundstücksnebenkosten' },
          { code: '130', name: 'Freimachen' },
        ],
      },
      {
        code: '200',
        name: 'Vorbereitende Maßnahmen',
        children: [
          { code: '210', name: 'Herrichten' },
          { code: '220', name: 'Öffentliche Erschließung' },
          { code: '230', name: 'Nichtöffentliche Erschließung' },
          { code: '240', name: 'Kompensationsmaßnahmen' },
        ],
      },
      {
        code: '300',
        name: 'Bauwerk - Baukonstruktionen',
        children: [
          { code: '310', name: 'Baugrube / Erdbau' },
          { code: '320', name: 'Gründung, Unterbau' },
          { code: '330', name: 'Außenwände / Vertikale Baukonstruktionen, außen' },
          { code: '340', name: 'Innenwände / Vertikale Baukonstruktionen, innen' },
          { code: '350', name: 'Decken / Horizontale Baukonstruktionen' },
          { code: '360', name: 'Dächer' },
          { code: '370', name: 'Infrastrukturanlagen' },
          { code: '390', name: 'Sonstige Maßnahmen für Baukonstruktionen' },
        ],
      },
      {
        code: '400',
        name: 'Bauwerk - Technische Anlagen',
        children: [
          { code: '410', name: 'Abwasser-, Wasser-, Gasanlagen' },
          { code: '420', name: 'Wärmeversorgungsanlagen' },
          { code: '430', name: 'Raumlufttechnische Anlagen' },
          { code: '440', name: 'Starkstromanlagen' },
          { code: '450', name: 'Fernmelde- und informationstechnische Anlagen' },
          { code: '460', name: 'Förderanlagen' },
          { code: '470', name: 'Nutzungsspezifische und verfahrenstechnische Anlagen' },
          { code: '480', name: 'Gebäude- und Anlagenautomation' },
          { code: '490', name: 'Sonstige Maßnahmen für Technische Anlagen' },
        ],
      },
      {
        code: '500',
        name: 'Außenanlagen und Freiflächen',
        children: [
          { code: '510', name: 'Erdbau' },
          { code: '520', name: 'Gründung, Unterbau' },
          { code: '530', name: 'Oberbau, Deckschichten' },
          { code: '540', name: 'Baukonstruktionen in Außenanlagen' },
          { code: '550', name: 'Technische Anlagen in Außenanlagen' },
          { code: '560', name: 'Einbauten in Außenanlagen' },
          { code: '570', name: 'Vegetationsflächen' },
          { code: '590', name: 'Sonstige Außenanlagen' },
        ],
      },
      {
        code: '600',
        name: 'Ausstattung und Kunstwerke',
        children: [
          { code: '610', name: 'Ausstattung' },
          { code: '620', name: 'Kunstwerke' },
        ],
      },
      {
        code: '700',
        name: 'Baunebenkosten',
        children: [
          { code: '710', name: 'Bauherrenaufgaben' },
          { code: '720', name: 'Vorbereitung der Objektplanung' },
          { code: '730', name: 'Architekten- und Ingenieurleistungen' },
          { code: '740', name: 'Gutachten und Beratung' },
          { code: '750', name: 'Kunst' },
          { code: '760', name: 'Finanzierung' },
          { code: '770', name: 'Allgemeine Baunebenkosten' },
          { code: '790', name: 'Sonstige Baunebenkosten' },
        ],
      },
      {
        code: '800',
        name: 'Finanzierung',
        children: [
          { code: '810', name: 'Finanzierungskosten' },
          { code: '820', name: 'Eigenkapitalkosten' },
        ],
      },
    ],
    metadata: { standard: 'DIN 276:2018-12', country: 'DE' },
  });

  // ---- Cost Estimation for project 1 ----
  console.log('  Creating cost estimation...');
  const [estimation] = await db
    .insert(schema.costEstimations)
    .values({
      projectId: project1.id,
      name: 'Kostenschätzung LP2',
      estimationType: 'kostenschaetzung',
      din276Level: 2,
      status: 'draft',
      baseDate: '2026-03-01',
      totalNet: '12500000.00',
      totalGross: '14875000.00',
      vatRate: '19.0',
    })
    .returning();

  // Add some cost positions
  const [kg300] = await db
    .insert(schema.costPositions)
    .values({
      estimationId: estimation!.id,
      costGroupCode: '300',
      level: 1,
      shortText: 'Bauwerk - Baukonstruktionen',
      isGroup: true,
      totalNet: '7500000.00',
      sortOrder: 3,
    })
    .returning();

  await db.insert(schema.costPositions).values([
    {
      estimationId: estimation!.id,
      parentId: kg300!.id,
      costGroupCode: '330',
      level: 2,
      shortText: 'Außenwände',
      totalNet: '2200000.00',
      sortOrder: 1,
    },
    {
      estimationId: estimation!.id,
      parentId: kg300!.id,
      costGroupCode: '350',
      level: 2,
      shortText: 'Decken',
      totalNet: '1800000.00',
      sortOrder: 2,
    },
    {
      estimationId: estimation!.id,
      parentId: kg300!.id,
      costGroupCode: '360',
      level: 2,
      shortText: 'Dächer',
      totalNet: '1500000.00',
      sortOrder: 3,
    },
  ]);

  const [kg400] = await db
    .insert(schema.costPositions)
    .values({
      estimationId: estimation!.id,
      costGroupCode: '400',
      level: 1,
      shortText: 'Bauwerk - Technische Anlagen',
      isGroup: true,
      totalNet: '3500000.00',
      sortOrder: 4,
    })
    .returning();

  await db.insert(schema.costPositions).values([
    {
      estimationId: estimation!.id,
      parentId: kg400!.id,
      costGroupCode: '420',
      level: 2,
      shortText: 'Wärmeversorgungsanlagen',
      totalNet: '800000.00',
      sortOrder: 1,
    },
    {
      estimationId: estimation!.id,
      parentId: kg400!.id,
      costGroupCode: '440',
      level: 2,
      shortText: 'Starkstromanlagen',
      totalNet: '1200000.00',
      sortOrder: 2,
    },
  ]);

  // ---- Organization Trades ----
  console.log('  Creating organization trades...');
  await db.insert(schema.organizationTrades).values([
    {
      organizationId: contractor1!.id,
      tradeCode: '012',
      tradeName: 'Erd-, Entwässerungs- und Verbauarbeiten',
    },
    {
      organizationId: contractor1!.id,
      tradeCode: '013',
      tradeName: 'Mauerarbeiten',
    },
    {
      organizationId: contractor2!.id,
      tradeCode: '032',
      tradeName: 'Heizungs- und zentrale Wassererwärmungsanlagen',
    },
    {
      organizationId: contractor2!.id,
      tradeCode: '033',
      tradeName: 'Raumlufttechnische Anlagen',
    },
  ]);

  // ---- Contacts ----
  console.log('  Creating contacts...');
  await db.insert(schema.contacts).values([
    {
      companyId: company!.id,
      organizationId: clientOrg!.id,
      salutation: 'Herr',
      title: 'Dr.',
      firstName: 'Thomas',
      lastName: 'Bauer',
      email: 'thomas.bauer@stmb.bayern.de',
      phone: '+49 89 2192-1234',
      position: 'Referatsleiter',
      department: 'Hochbau',
      isPrimary: true,
    },
    {
      companyId: company!.id,
      organizationId: contractor1!.id,
      salutation: 'Herr',
      firstName: 'Hans',
      lastName: 'Schmidt',
      email: 'h.schmidt@schmidt-bau.de',
      phone: '+49 89 315555-10',
      position: 'Geschäftsführer',
      isPrimary: true,
    },
    {
      companyId: company!.id,
      organizationId: contractor2!.id,
      salutation: 'Frau',
      firstName: 'Maria',
      lastName: 'Weber',
      email: 'm.weber@weber-haustechnik.de',
      phone: '+49 89 442211-20',
      position: 'Projektleiterin',
      department: 'Heizung/Sanitär',
      isPrimary: true,
    },
  ]);

  console.log('');
  console.log('Seed completed successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email:    admin@vambiant.de');
  console.log('  Password: Test1234!');
  console.log('');
  console.log(`Company: ${company!.name}`);
  console.log(`Projects: ${insertedProjects.length} created`);
  console.log('');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
