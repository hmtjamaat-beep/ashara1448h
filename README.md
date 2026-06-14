# Jamaat Attendance Dashboard

A simple, real-time attendance tracking dashboard that pulls data directly from Google Sheets.

## Features

✅ **Real-time Data Sync** - Fetches latest data from Google Sheets  
✅ **5 Attendance Categories** - Quick overview of attendance status  
✅ **Sector-based Grouping** - Organized by sectors with in-charge information  
✅ **Detailed Filtering** - Click categories to view filtered records  
✅ **Responsive Design** - Works on desktop and mobile  
✅ **No Backend Required** - Pure HTML/JS with direct Sheet integration  

## Setup

### 1. Prepare Your Google Sheet

Ensure your Google Sheet has the following structure:

- **Column A**: Name
- **Column E**: Email
- **Column I**: Phone
- **Column J**: Address
- **Column K**: City
- **Column N**: Notes
- **Column U**: Sector
- **Column X**: In Charge
- **Columns AE-AM**: Daily attendance (Mon-Sun)

### 2. Make Sheet Publicly Accessible

1. Open your Google Sheet
2. Click **Share** (top right)
3. Change to **"Anyone with the link can view"**
4. Copy the shareable link

### 3. Deploy

Simply open `index.html` in a browser or deploy to any static hosting:

```bash
# Using Python (if available)
python -m http.server 8000

# Or using Node.js
npx http-server

# Or directly open index.html in browser
```

### 4. Use the Dashboard

1. Paste your Google Sheet URL into the input field
2. Click **Load Data**
3. Click any attendance category card to view filtered records
4. Expand sectors to see detailed information
5. Click **Refresh** to get the latest data

## Attendance Categories

- **w** - Attended in My Jamaat ✅
- **x** - Mehmaan (Guest) in My Jamaat 👥
- **y** - Late in My Jamaat ⏰
- **z** - Late in Other Jamaat 🔀
- **a** - Absent ❌

## Files

- `index.html` - Main dashboard interface
- `dashboard.js` - Data fetching and rendering logic
- `README.md` - Documentation

## How It Works

1. **CSV Export**: Uses Google Sheets CSV export API (no authentication needed)
2. **Real-time**: Data is fetched fresh on each load/refresh
3. **Processing**: JavaScript parses CSV and categorizes attendance
4. **Display**: Dynamic rendering based on selected category

## Temporary Setup Note

This dashboard is designed for temporary 10-day deployments. For production use (beyond 10 days), consider:

- Adding a backend API layer
- Implementing caching
- Using Google Sheets API with proper authentication
- Adding data persistence

## Browser Support

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- IE: ❌ Not supported

## Troubleshooting

### Data not loading?
- Ensure the Google Sheet is publicly shared
- Check the sheet URL is correct
- Verify columns AE-AM contain attendance data
- Check browser console for errors (F12)

### Columns not appearing?
- Ensure all required columns exist
- Verify column positions (A, E, I, J, K, N, U, X, AE-AM)
- Check for empty rows that might offset columns

### CORS Issues?
- This uses Google Sheets' public CSV export which bypasses CORS
- If still having issues, try a different browser

## License

Open source - feel free to modify and use as needed.