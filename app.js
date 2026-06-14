// Application Logic
const ATTENDANCE_CATEGORIES = {
    w: { label: 'Attended in My Jamaat', color: '#28a745' },
    x: { label: 'Mehmaan (Guest) in My Jamaat', color: '#17a2b8' },
    y: { label: 'Late in My Jamaat', color: '#ffc107' },
    z: { label: 'Late in Other Jamaat', color: '#fd7e14' },
    a: { label: 'Absent', color: '#dc3545' }
};

// Column indices (0-based)
const COLUMNS = {
    name: 0,           // Column A
    email: 4,          // Column E
    phone: 8,          // Column I
    address: 9,        // Column J
    city: 10,          // Column K
    notes: 13,         // Column N
    sector: 20,        // Column U
    inCharge: 23,      // Column X
    attendanceStart: 30 // Column AE
};

let sheetData = null;
let attendanceDays = [];
let selectedDay = null;
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
    
    if (page === 'details' && selectedDay === null && attendanceDays.length > 0) {
        selectDay(0);
    }
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

        // Extract attendance days (columns AE-AM)
        const headers = sheetData[0];
        attendanceDays = [];

        for (let i = COLUMNS.attendanceStart; i <= COLUMNS.attendanceStart + 8; i++) {
            if (i < headers.length) {
                attendanceDays.push({
                    index: i,
                    date: headers[i],
                    value: i - COLUMNS.attendanceStart + 1 // Day number 1-9
                });
            }
        }

        // Render dashboard
        renderDashboard();
        renderDaySelector();
        
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        document.getElementById('message').innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
    }
}

// Render Dashboard
function renderDashboard() {
    renderOverallStats();
    renderCharts();
    renderSectorSummary();
}

// Render overall statistics
function renderOverallStats() {
    const statsDiv = document.getElementById('overallStats');
    let totalPeople = new Set();
    let categoryCounts = { w: 0, x: 0, y: 0, z: 0, a: 0 };
    let dayWiseData = {};

    // Process all records
    for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
        const row = sheetData[rowIdx];
        if (!row[0] || row[0].trim() === '') continue;

        totalPeople.add(row[COLUMNS.name]);

        // Count per category across all days
        attendanceDays.forEach(day => {
            const value = row[day.index] ? row[day.index].trim().toLowerCase() : '';
            if (Object.keys(ATTENDANCE_CATEGORIES).includes(value)) {
                categoryCounts[value]++;
            }
            
            if (!dayWiseData[day.value]) {
                dayWiseData[day.value] = {};
            }
            if (Object.keys(ATTENDANCE_CATEGORIES).includes(value)) {
                dayWiseData[day.value][value] = (dayWiseData[day.value][value] || 0) + 1;
            }
        });
    }

    const totalAttendance = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total People</div>
            <div class="stat-value">${totalPeople.size}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Attendance Records</div>
            <div class="stat-value">${totalAttendance}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Attended (w)</div>
            <div class="stat-value">${categoryCounts.w}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Guest (x)</div>
            <div class="stat-value">${categoryCounts.x}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Late (y)</div>
            <div class="stat-value">${categoryCounts.y}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Late Other (z)</div>
            <div class="stat-value">${categoryCounts.z}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Absent (a)</div>
            <div class="stat-value">${categoryCounts.a}</div>
        </div>
    `;
}

// Render Charts
function renderCharts() {
    const categoryData = { w: 0, x: 0, y: 0, z: 0, a: 0 };
    const trendData = {};

    // Collect data
    for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
        const row = sheetData[rowIdx];
        if (!row[0] || row[0].trim() === '') continue;

        attendanceDays.forEach(day => {
            const value = row[day.index] ? row[day.index].trim().toLowerCase() : '';
            if (Object.keys(ATTENDANCE_CATEGORIES).includes(value)) {
                categoryData[value]++;
                
                if (!trendData[day.value]) {
                    trendData[day.value] = { w: 0, x: 0, y: 0, z: 0, a: 0 };
                }
                trendData[day.value][value]++;
            }
        });
    }

    // Pie Chart
    if (charts.categoryChart) {
        charts.categoryChart.destroy();
    }
    
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    charts.categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: ['Attended (w)', 'Guest (x)', 'Late (y)', 'Late Other (z)', 'Absent (a)'],
            datasets: [{
                data: [categoryData.w, categoryData.x, categoryData.y, categoryData.z, categoryData.a],
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

    // Trend Chart
    if (charts.trendChart) {
        charts.trendChart.destroy();
    }

    const trendCtx = document.getElementById('trendChart').getContext('2d');
    const dayLabels = attendanceDays.map(d => `Day ${d.value}`);
    
    charts.trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [
                {
                    label: 'Attended (w)',
                    data: attendanceDays.map(d => trendData[d.value]?.w || 0),
                    backgroundColor: '#28a745'
                },
                {
                    label: 'Guest (x)',
                    data: attendanceDays.map(d => trendData[d.value]?.x || 0),
                    backgroundColor: '#17a2b8'
                },
                {
                    label: 'Late (y)',
                    data: attendanceDays.map(d => trendData[d.value]?.y || 0),
                    backgroundColor: '#ffc107'
                },
                {
                    label: 'Late Other (z)',
                    data: attendanceDays.map(d => trendData[d.value]?.z || 0),
                    backgroundColor: '#fd7e14'
                },
                {
                    label: 'Absent (a)',
                    data: attendanceDays.map(d => trendData[d.value]?.a || 0),
                    backgroundColor: '#dc3545'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false
                },
                y: {
                    stacked: false
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Render Sector Summary
function renderSectorSummary() {
    const sectorData = {};

    for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
        const row = sheetData[rowIdx];
        if (!row[0] || row[0].trim() === '') continue;

        const sector = row[COLUMNS.sector] || 'Unassigned';
        const inCharge = row[COLUMNS.inCharge] || 'N/A';

        if (!sectorData[sector]) {
            sectorData[sector] = {
                inCharge: inCharge,
                total: 0,
                categories: { w: 0, x: 0, y: 0, z: 0, a: 0 }
            };
        }

        attendanceDays.forEach(day => {
            const value = row[day.index] ? row[day.index].trim().toLowerCase() : '';
            if (Object.keys(ATTENDANCE_CATEGORIES).includes(value)) {
                sectorData[sector].total++;
                sectorData[sector].categories[value]++;
            }
        });
    }

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

// Render Day Selector
function renderDaySelector() {
    const selector = document.getElementById('daySelector');
    selector.innerHTML = '';

    attendanceDays.forEach((day, idx) => {
        const btn = document.createElement('button');
        btn.className = 'day-btn';
        btn.textContent = `Day ${day.value}`;
        btn.onclick = () => selectDay(idx);
        if (idx === 0) btn.classList.add('active');
        selector.appendChild(btn);
    });

    selectDay(0);
}

// Select Day and render details
function selectDay(dayIdx) {
    selectedDay = dayIdx;
    
    // Update button states
    document.querySelectorAll('.day-btn').forEach((btn, idx) => {
        if (idx === dayIdx) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderDetailContent();
}

// Render Detail Content
function renderDetailContent() {
    const day = attendanceDays[selectedDay];
    const contentDiv = document.getElementById('detailContent');

    // Group data by sector
    const bySector = {};

    for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
        const row = sheetData[rowIdx];
        if (!row[0] || row[0].trim() === '') continue;

        const value = row[day.index] ? row[day.index].trim().toLowerCase() : '';
        if (!Object.keys(ATTENDANCE_CATEGORIES).includes(value)) continue;

        const sector = row[COLUMNS.sector] || 'Unassigned';
        if (!bySector[sector]) {
            bySector[sector] = [];
        }

        bySector[sector].push({
            name: row[COLUMNS.name],
            category: value,
            email: row[COLUMNS.email] || 'N/A',
            phone: row[COLUMNS.phone] || 'N/A',
            address: row[COLUMNS.address] || 'N/A',
            city: row[COLUMNS.city] || 'N/A',
            notes: row[COLUMNS.notes] || 'N/A',
            inCharge: row[COLUMNS.inCharge] || 'N/A'
        });
    }

    if (Object.keys(bySector).length === 0) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>No records found for ${day.date}</p>
            </div>
        `;
        return;
    }

    let html = '<div class="sectors">';

    Object.keys(bySector).sort().forEach((sector, idx) => {
        const people = bySector[sector];
        const inCharge = people[0].inCharge;
        const sectorId = `sector-${idx}`;

        html += `
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
            html += `
                <li class="person-item">
                    <div class="person-name">
                        👤 ${person.name}
                        <span class="category-badge">${person.category}</span>
                    </div>
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
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${person.notes}</span>
                        </div>
                    </div>
                </li>
            `;
        });

        html += `
                    </ul>
                </div>
            </div>
        `;
    });

    html += '</div>';
    contentDiv.innerHTML = html;

    // Expand first sector
    expandSector('sector-0');
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