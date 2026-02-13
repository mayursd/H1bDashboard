const roleInput = document.getElementById('roleInput');
const roleSuggestions = document.getElementById('roleSuggestions');
const userWageInput = document.getElementById('userWage');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusEl = document.getElementById('loadStatus');
const stats = document.getElementById('stats');

// OFLC disclosure workbooks (edit list as OFLC publishes newer releases).
const OFLC_DATASETS = [
  'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-1B_Disclosure_Data_FY2023_Q1.xlsx',
  'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-1B_Disclosure_Data_FY2023_Q2.xlsx',
  'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-1B_Disclosure_Data_FY2023_Q3.xlsx',
  'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/H-1B_Disclosure_Data_FY2023_Q4.xlsx',
];

const roleCandidates = ['job_title', 'occupation_title', 'soc_title', 'role', 'position_title'];
const fipsCandidates = ['worksite_county_fips', 'county_fips', 'fips', 'county_code'];
const wageCandidates = ['wage_rate_of_pay_from', 'prevailing_wage', 'wage', 'wage_from', 'pw_amount'];

let groupedByRole = new Map();

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function findColumn(headers, candidates) {
  return candidates.find((c) => headers.includes(c)) || null;
}

function toNumber(raw) {
  const parsed = Number(String(raw ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function parseWorkbookFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed ${response.status}: ${url}`);
  const data = await response.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
}

function buildGroupedData(allRows) {
  if (allRows.length === 0) return new Map();

  const headers = Object.keys(allRows[0]).map(normalizeKey);
  const headerMap = new Map(Object.keys(allRows[0]).map((h) => [normalizeKey(h), h]));

  const roleCol = findColumn(headers, roleCandidates);
  const fipsCol = findColumn(headers, fipsCandidates);
  const wageCol = findColumn(headers, wageCandidates);

  if (!roleCol || !fipsCol || !wageCol) {
    throw new Error('Required OFLC columns missing: role, county FIPS, and wage.');
  }

  const grouped = new Map();

  for (const row of allRows) {
    const role = String(row[headerMap.get(roleCol)] || '').trim().toUpperCase();
    const wage = toNumber(row[headerMap.get(wageCol)]);
    const fips = String(row[headerMap.get(fipsCol)] || '').trim().padStart(5, '0');

    if (!role || !wage || wage <= 0 || !/^\d{5}$/.test(fips)) continue;

    if (!grouped.has(role)) grouped.set(role, new Map());
    const countyMap = grouped.get(role);
    if (!countyMap.has(fips)) countyMap.set(fips, []);
    countyMap.get(fips).push(wage);
  }

  return grouped;
}

function updateRoleSuggestions() {
  const roles = [...groupedByRole.keys()].sort((a, b) => a.localeCompare(b));
  roleSuggestions.innerHTML = roles.slice(0, 5000).map((r) => `<option value="${r}"></option>`).join('');
}

function renderStats(role, userWage, countyAvgWages) {
  const values = [...countyAvgWages.values()];
  const above = values.filter((v) => v > userWage).length;
  const below = values.filter((v) => v < userWage).length;

  stats.innerHTML = `
    <article class="stat"><strong>Role</strong><div>${role}</div></article>
    <article class="stat"><strong>Your Wage</strong><div>$${userWage.toLocaleString()}</div></article>
    <article class="stat"><strong>Counties Matched</strong><div>${values.length}</div></article>
    <article class="stat"><strong>Counties Above You</strong><div>${above}</div></article>
    <article class="stat"><strong>Counties Below You</strong><div>${below}</div></article>
  `;
}

function renderMap(role, userWage) {
  const countyMap = groupedByRole.get(role);
  if (!countyMap || countyMap.size === 0) {
    stats.innerHTML = `<article class="stat"><strong>No data</strong><div>No county wages found for role: ${role}</div></article>`;
    Plotly.newPlot('map', [], { title: `No county data found for ${role}` }, { responsive: true });
    return;
  }

  const countyAvg = new Map([...countyMap.entries()].map(([fips, wages]) => [fips, mean(wages)]));
  renderStats(role, userWage, countyAvg);

  const locations = [...countyAvg.keys()];
  const deltaPct = [...countyAvg.values()].map((avg) => ((avg - userWage) / userWage) * 100);

  Plotly.newPlot(
    'map',
    [
      {
        type: 'choropleth',
        geojson: 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json',
        featureidkey: 'id',
        locations,
        z: deltaPct,
        zmid: 0,
        colorscale: [
          [0, '#b91c1c'],
          [0.45, '#fca5a5'],
          [0.5, '#fde68a'],
          [0.55, '#86efac'],
          [1, '#166534'],
        ],
        marker: { line: { color: 'white', width: 0.2 } },
        colorbar: { title: '% vs your wage' },
        hovertemplate: 'FIPS: %{location}<br>Difference: %{z:.1f}%<extra></extra>',
      },
    ],
    {
      title: `County wage comparison for ${role}`,
      geo: { scope: 'usa', projection: { type: 'albers usa' } },
      margin: { t: 50, l: 0, r: 0, b: 0 },
    },
    { responsive: true }
  );
}

async function init() {
  Plotly.newPlot('map', [], { title: 'Loading OFLC data…' }, { responsive: true });

  try {
    let allRows = [];
    for (let i = 0; i < OFLC_DATASETS.length; i += 1) {
      statusEl.textContent = `Loading OFLC dataset ${i + 1}/${OFLC_DATASETS.length}…`;
      const rows = await parseWorkbookFromUrl(OFLC_DATASETS[i]);
      allRows = allRows.concat(rows);
    }

    groupedByRole = buildGroupedData(allRows);
    updateRoleSuggestions();

    statusEl.textContent = `Loaded OFLC data. Roles available: ${groupedByRole.size.toLocaleString()}.`;
    analyzeBtn.disabled = false;
    Plotly.newPlot('map', [], { title: 'Enter role + wage and click Analyze Counties' }, { responsive: true });
  } catch (err) {
    statusEl.textContent = `Could not load OFLC data automatically: ${err.message}`;
    Plotly.newPlot('map', [], { title: 'Unable to load OFLC data' }, { responsive: true });
  }
}

analyzeBtn.addEventListener('click', () => {
  const role = roleInput.value.trim().toUpperCase();
  const userWage = Number(userWageInput.value);

  if (!role) {
    alert('Please enter a role.');
    return;
  }
  if (!Number.isFinite(userWage) || userWage <= 0) {
    alert('Please enter a valid positive wage.');
    return;
  }

  renderMap(role, userWage);
});

init();
