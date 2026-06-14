// Configuration
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
let filteredData = null;
let selectedCategory = null;
let attendanceDays = [];

// Parse Google Sheets URL to get Sheet ID
function getSheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

// Convert column letter to index (A=0, B=1, etc.)
function getColumnIndex(letter) {
    return letter.charCodeAt(0) - 'A'.charCodeAt(0);
}

// Fetch data from Google Sheets using CSV export
async function fetchSheetData(sheetUrl) {
    try {
        showMessage('Loading data from Google Sheets...', 'loading');
        
        const sheetId = getSheetId(sheetUrl);
        if (!sheetId) {
            throw new Error('Invalid Google Sheets URL');
        }

        // Use CSV export URL
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=108774125`;
        
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => {
            // Parse CSV properly, handling quotes
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

        // Remove empty rows
        sheetData = rows.filter(row => row.some(cell => cell.length > 0));

        if (sheetData.length < 2) {
            throw new Error('Sheet appears to be empty');
        }

        // Extract headers and find attendance columns
        const headers = sheetData[0];
        attendanceDays = [];

        // Find columns AE to AM (indices 30-38)
        for (let i = COLUMNS.attendanceStart; i <= COLUMNS.attendanceStart + 8; i++) {
            if (i < headers.length) {
                attendanceDays.push({
                    index: i,
                    date: headers[i],
                    values: {}
                });
            }
        }

        // Populate category counts
        categorizeAttendance();
        
        showMessage('Data loaded successfully!', 'success');
        renderCategories();
        
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Categorize attendance data
function categorizeAttendance() {
    // Initialize categories
    Object.keys(ATTENDANCE_CATEGORIES).forEach(cat => {
        ATTENDANCE_CATEGORIES[cat].data = [];
    });

    // Process each row
    for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
        const row = sheetData[rowIdx];
        if (!row[0] || row[0].trim() === '') continue; // Skip empty rows

        // Check attendance columns for this person
        const personAttendance = {};
        
        attendanceDays.forEach(day => {
            const value = row[day.index] ? row[day.index].trim().toLowerCase() : '';
            if (Object.keys(ATTENDANCE_CATEGORIES).includes(value)) {
                if (!personAttendance[value]) {
                    personAttendance[value] = [];
                }
                personAttendance[value].push(day.date);
            }
        });

        // Add person to appropriate categories
        Object.keys(personAttendance).forEach(category => {
            ATTENDANCE_CATEGORIES[category].data.push({
                rowIndex: rowIdx,
                dates: personAttendance[category],
                name: row[COLUMNS.name] || 'N/A',
                email: row[COLUMNS.email] || 'N/A',
                phone: row[COLUMNS.phone] || 'N/A',
                address: row[COLUMNS.address] || 'N/A',
                city: row[COLUMNS.city] || 'N/A',
                notes: row[COLUMNS.notes] || 'N/A',
                sector: row[COLUMNS.sector] || 'N/A',
                inCharge: row[COLUMNS.inCharge] || 'N/A',
                fullRow: row
            });
        });
    }
}

// Render category cards
function renderCategories() {
    const container = document.getElementById('categories');
    container.innerHTML = '';

    Object.keys(ATTENDANCE_CATEGORIES).forEach(code => {
        const category = ATTENDANCE_CATEGORIES[code];
        const count = category.data ? category.data.length : 0;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-code">${code.toUpperCase()}</div>
            <div class="category-label">${category.label}</div>
            <div class="category-count">${count}</div>
        `;
        
        card.addEventListener('click', () => selectCategory(code, card));
        container.appendChild(card);
    });
}

// Select category and display data
function selectCategory(code, element) {
    // Remove active state from all cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active state to selected card
    element.classList.add('active');
    
    selectedCategory = code;
    filteredData = ATTENDANCE_CATEGORIES[code].data;
    
    renderData(code);
}

// Render filtered data grouped by sector
function renderData(categoryCode) {
    const container = document.getElementById('dataContainer');
    const contentDiv = document.getElementById('dataContent');
    const title = document.getElementById('dataTitle');
    
    const category = ATTENDANCE_CATEGORIES[categoryCode];
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
        const inCharge = people[0].inCharge; // Get in-charge from first person
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
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${person.notes}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Dates:</span>
                            <span class="detail-value">${person.dates.join(', ')}</span>
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

// Show message
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `<div class="${type}">${text}</div>`;
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
    }
}

// Load data from URL
function loadData() {
    const url = document.getElementById('sheetUrl').value.trim();
    if (!url) {
        showMessage('Please enter a valid Google Sheets URL', 'error');
        return;
    }
    fetchSheetData(url);
}

// Refresh data
function refreshData() {
    const url = document.getElementById('sheetUrl').value.trim();
    if (!url) {
        showMessage('Please enter a valid Google Sheets URL', 'error');
        return;
    }
    fetchSheetData(url);
}

// Auto-load data on page load
window.addEventListener('load', () => {
    const urlInput = document.getElementById('sheetUrl').value.trim();
    if (urlInput) {
        loadData();
    }
});

// Allow Enter key to load data
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sheetUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadData();
        }
    });
});