# GPX File Loader

A simple web application to load and view GPX (GPS Exchange Format) files. This application allows you to upload GPX files and view their track data, including coordinates, elevation, and timing information.

## Features

- **Drag & Drop Support**: Simply drag and drop GPX files onto the upload area
- **File Information**: View file details including size, number of track points, and total distance
- **Track Data Display**: See detailed information about each track point including:
  - Latitude and longitude coordinates
  - Elevation data
  - Timestamp information
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, modern interface with smooth animations

## How to Use

1. **Open the Application**: Open `index.html` in your web browser
2. **Upload a GPX File**: 
   - Click on the upload area to browse for a GPX file, or
   - Drag and drop a GPX file directly onto the upload area
3. **View Results**: The application will display:
   - File information (name, size, track points, total distance)
   - Track data with coordinates and metadata

## File Structure

```
gpx-animator/
├── index.html      # Main HTML file
├── styles.css      # CSS styles
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Technical Details

The application uses:
- **HTML5 File API** for file reading
- **DOMParser** for XML parsing
- **Haversine formula** for distance calculations
- **Modern CSS** with flexbox and grid layouts
- **Vanilla JavaScript** with ES6+ features

## Supported GPX Elements

The application parses and displays:
- `<trk>` (Track) elements
- `<trkseg>` (Track segments)
- `<trkpt>` (Track points) with:
  - `lat` and `lon` attributes
  - `<ele>` (elevation) elements
  - `<time>` (timestamp) elements

## Browser Compatibility

This application works in all modern browsers that support:
- HTML5 File API
- ES6+ JavaScript features
- CSS Grid and Flexbox

## License

This project is open source and available under the MIT License. 