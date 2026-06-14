// Application Logic with Global Day Filter
const ATTENDANCE_CATEGORIES = {
    'Attended in My Jamaat': { label: 'W', color: '#28a745' },
    x: { label: 'Mehmaan (Guest) in My Jamaat', color: '#17a2b8' },
    y: { label: 'Late in My Jamaat', color: '#ffc107' },
    z: { label: 'Late in Other Jamaat', color: '#fd7e14' },
    a: { label: 'Absent', color: '#dc3545' }
};

// Column indices (0-based)
const COLUMNS = {
    name: 4,           // Column A
    email: 14,          // Column E
    phone: 13,          // Column I
    address: 16,        // Column J
    city: 18,          // Column K
    gender: 9,         // Column N
    sector: 20,        // Column U
    inCharge: 23,      // Column X
    attendanceStart: 30 // Column AE
};

let sheetData = null;
let attendanceDays = [];
let selectedDay = null;
let selectedCategory = null;
let charts = {};

// Initialize app
window.addEventListener('load', () => {
    loadData();
});

// Switch between pages
function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(page).classList.add('active');
    event.target.classList.add('active');
}

// Fetch data from Google Sheets
async function loadData() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&gid=${CONFIG.SHEET_GID}`;
        
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of row) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });

        sheetData = rows.filter(row => row.some(cell => cell.length > 0));

        if (sheetData.length < 2) {
            throw new Error('Sheet appears to be empty');
        }

        // Extract attendance days (columns AE-AM = 9 columns for Day 2-10)
        const headers = sheetData[0];
        attendanceDays = [];

        for (let i = COLUMNS.attendanceStart; i <= COLUMNS.attendanceStart + 8; i++) {
            if (i < headers.length) {
                attendanceDays.push({
                    index: i,
                    date: headers[i],
                    value: i - COLUMNS.attendanceStart + 2 // Day number 2-10
                });
            }
        }

        // Render global day selector
        renderGlobalDaySelector();
        
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        document.getElementById('message').innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
    }
}

// Render Global Day Selector
function renderGlobalDaySelector() {
    const selector = document.getElementById('globalDaySelector');
    selector.innerHTML = '';

    attendanceDays.forEach((day, idx) => {
        const btn = document.createElement('button');
        btn.className = 'day-btn';
        btn.textContent = `Day ${day.value}`;
        btn.onclick = () => selectDay(idx);
        if (idx === 0) btn.classList.add('active');
        selector.appendChild(btn);
    });

    // Select first day by default
    selectDay(0);
}

// Select Day (Master Filter)
function selectDay(dayIdx) {
    selectedDay = dayIdx;
    selectedCategory = null; // Reset category selection
    
    // Update button states
    document.querySelectorAll('.day-btn').forEach((btn, idx) => {
        if (idx === dayIdx) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const dayLabel = `Day ${attendanceDays[dayIdx].value}`;
    document.getElementById('dashboardDayLabel').textContent = dayLabel;
    document.getElementById('detailDayLabel').textContent = dayLabel;

    // Re-render both pages with new day
    renderDashboard();
    renderCategories();
}

// Get data for selected day
function getDataForDay(dayIdx) {
    const day = attendanceDays[dayIdx];
    const dayData = { w: 0, x: 0, y: 0, z: 0, a: 0 };
    const sectorData = {};
    const categoryData = {};

    for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
        const row = sheetData[rowIdx];
        if (!row[0] || row[0].trim() === '') continue;

        const value = row[day.index] ? row[day.index].trim().toLowerCase() : '';
        if (!Object.keys(ATTENDANCE_CATEGORIES).includes(value)) continue;

        dayData[value]++;

        const sector = row[COLUMNS.sector] || 'Unassigned';
        if (!sectorData[sector]) {
            sectorData[sector] = {
                inCharge: row[COLUMNS.inCharge] || 'N/A',
                total: 0,
                categories: { w: 0, x: 0, y: 0, z: 0, a: 0 }
            };
        }
        sectorData[sector].total++;
        sectorData[sector].categories[value]++;

        if (!categoryData[value]) {
            categoryData[value] = [];
        }
        categoryData[value].push({
            name: row[COLUMNS.name],
            email: row[COLUMNS.email] || 'N/A',
            phone: row[COLUMNS.phone] || 'N/A',
            address: row[COLUMNS.address] || 'N/A',
            city: row[COLUMNS.city] || 'N/A',
            gender: row[COLUMNS.gender] || 'N/A',
            sector: sector,
            inCharge: row[COLUMNS.inCharge] || 'N/A'
        });
    }

    return { dayData, sectorData, categoryData };
}

// Render Dashboard for Selected Day
function renderDashboard() {
    const { dayData, sectorData } = getDataForDay(selectedDay);
    
    renderDashboardStats(dayData);
    renderDashboardChart(dayData);
    renderDashboardSectorSummary(sectorData);
}

// Render Dashboard Statistics
function renderDashboardStats(dayData) {
    const statsDiv = document.getElementById('overallStats');
    const totalAttendance = Object.values(dayData).reduce((a, b) => a + b, 0);

    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Attendance</div>
            <div class="stat-value">${totalAttendance}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Attended (w)</div>
            <div class="stat-value">${dayData.w}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Guest (x)</div>
            <div class="stat-value">${dayData.x}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Late (y)</div>
            <div class="stat-value">${dayData.y}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Late Other (z)</div>
            <div class="stat-value">${dayData.z}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Absent (a)</div>
            <div class="stat-value">${dayData.a}</div>
        </div>
    `;
}

// Render Dashboard Chart
function renderDashboardChart(dayData) {
    if (charts.categoryChart) {
        charts.categoryChart.destroy();
    }
    
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    charts.categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: ['Attended (w)', 'Guest (x)', 'Late (y)', 'Late Other (z)', 'Absent (a)'],
            datasets: [{
                data: [dayData.w, dayData.x, dayData.y, dayData.z, dayData.a],
                backgroundColor: ['#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#dc3545']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Render Dashboard Sector Summary
function renderDashboardSectorSummary(sectorData) {
    let html = '';
    Object.keys(sectorData).sort().forEach(sector => {
        const data = sectorData[sector];
        html += `
            <div class="sector-item">
                <div>
                    <div class="sector-name">📍 ${sector}</div>
                    <div class="sector-info">In Charge: <strong>${data.inCharge}</strong></div>
                </div>
                <div class="sector-details">
                    <div class="sector-detail">Total: <strong>${data.total}</strong></div>
                    <div class="sector-detail">Attended: <strong>${data.categories.w}</strong></div>
                    <div class="sector-detail">Guest: <strong>${data.categories.x}</strong></div>
                    <div class="sector-detail">Late: <strong>${data.categories.y}</strong></div>
                </div>
            </div>
        `;
    });

    document.getElementById('sectorSummary').innerHTML = html;
}

// Render Category Cards
function renderCategories() {
    const { dayData } = getDataForDay(selectedDay);
    const container = document.getElementById('categories');
    container.innerHTML = '';

    Object.keys(ATTENDANCE_CATEGORIES).forEach(code => {
        const count = dayData[code] || 0;
        const category = ATTENDANCE_CATEGORIES[code];
        
        const card = document.createElement('div');
        card.className = 'category-card';
        if (selectedCategory === code) card.classList.add('active');
        
        card.innerHTML = `
            <div class="category-code">${code.toUpperCase()}</div>
            <div class="category-label">${category.label}</div>
            <div class="category-count">${count}</div>
        `;
        
        card.addEventListener('click', () => selectCategory(code, card));
        container.appendChild(card);
    });
}

// Select Category and Display Data
function selectCategory(code, element) {
    // Remove active state from all cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active state to selected card
    element.classList.add('active');
    
    selectedCategory = code;
    renderDetailData(code);
}

// Render Detail Data for Selected Category
function renderDetailData(categoryCode) {
    const { categoryData } = getDataForDay(selectedDay);
    const container = document.getElementById('dataContainer');
    const contentDiv = document.getElementById('dataContent');
    const title = document.getElementById('dataTitle');
    
    const category = ATTENDANCE_CATEGORIES[categoryCode];
    const filteredData = categoryData[categoryCode] || [];
    
    title.textContent = `${category.label} (${filteredData.length} records)`;
    
    if (filteredData.length === 0) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>No records found for this category</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }

    // Group by sector
    const bySector = {};
    filteredData.forEach(person => {
        const sector = person.sector || 'Unassigned';
        if (!bySector[sector]) {
            bySector[sector] = [];
        }
        bySector[sector].push(person);
    });

    // Render sectors
    let sectorHTML = '<div class="sectors">';
    
    Object.keys(bySector).sort().forEach((sector, idx) => {
        const people = bySector[sector];
        const inCharge = people[0].inCharge;
        const sectorId = `sector-${idx}`;
        
        sectorHTML += `
            <div class="sector">
                <div class="sector-header" onclick="toggleSector('${sectorId}')">
                    <div>
                        <div class="sector-title">📍 ${sector}</div>
                        <div class="sector-info">In Charge: <strong>${inCharge}</strong> | People: <strong>${people.length}</strong></div>
                    </div>
                    <div class="sector-toggle" id="${sectorId}-toggle">▼</div>
                </div>
                <div class="sector-content" id="${sectorId}">
                    <ul class="person-list">
        `;
        
        people.forEach(person => {
            sectorHTML += `
                <li class="person-item">
                    <div class="person-name">👤 ${person.name}</div>
                    <div class="person-details">
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${person.email}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Phone:</span>
                            <span class="detail-value">${person.phone}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Address:</span>
                            <span class="detail-value">${person.address}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">City:</span>
                            <span class="detail-value">${person.city}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">gender:</span>
                            <span class="detail-value">${person.gender}</span>
                        </div>
                    </div>
                </li>
            `;
        });
        
        sectorHTML += `
                    </ul>
                </div>
            </div>
        `;
    });
    
    sectorHTML += '</div>';
    contentDiv.innerHTML = sectorHTML;
    container.style.display = 'block';
    
    // Expand first sector by default
    const firstSector = Object.keys(bySector)[0];
    if (firstSector) {
        expandSector(`sector-0`);
    }
}

// Toggle sector expansion
function toggleSector(sectorId) {
    const content = document.getElementById(sectorId);
    const toggle = document.getElementById(sectorId + '-toggle');
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        toggle.textContent = '▼';
    } else {
        content.classList.add('expanded');
        toggle.textContent = '▲';
    }
}

// Expand sector
function expandSector(sectorId) {
    const content = document.getElementById(sectorId);
    const toggle = document.getElementById(sectorId + '-toggle');
    content.classList.add('expanded');
    toggle.textContent = '▲';
}
