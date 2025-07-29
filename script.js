class GPXLoader {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.trackData = document.getElementById('trackData');
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });
        
        // Drop zone click
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        // Drag and drop events
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('dragover');
        });
        
        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
        });
        
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.name.toLowerCase().endsWith('.gpx')) {
                    this.handleFile(file);
                } else {
                    alert('Please select a valid GPX file.');
                }
            }
        });
    }
    
    async handleFile(file) {
        try {
            const text = await this.readFileAsText(file);
            const gpxData = this.parseGPX(text);
            
            this.displayFileInfo(file, gpxData);
            this.displayTrackData(gpxData);
            
        } catch (error) {
            console.error('Error processing GPX file:', error);
            alert('Error processing GPX file. Please try again.');
        }
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
    
    parseGPX(gpxText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
        
        const tracks = [];
        const trackElements = xmlDoc.getElementsByTagName('trk');
        
        for (let track of trackElements) {
            const trackData = {
                name: this.getTextContent(track, 'name') || 'Unnamed Track',
                segments: []
            };
            
            const segmentElements = track.getElementsByTagName('trkseg');
            for (let segment of segmentElements) {
                const points = [];
                const pointElements = segment.getElementsByTagName('trkpt');
                
                for (let point of pointElements) {
                    const lat = parseFloat(point.getAttribute('lat'));
                    const lon = parseFloat(point.getAttribute('lon'));
                    
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const pointData = {
                            lat: lat,
                            lon: lon,
                            ele: this.getTextContent(point, 'ele'),
                            time: this.getTextContent(point, 'time')
                        };
                        points.push(pointData);
                    }
                }
                
                if (points.length > 0) {
                    trackData.segments.push(points);
                }
            }
            
            if (trackData.segments.length > 0) {
                tracks.push(trackData);
            }
        }
        
        return tracks;
    }
    
    getTextContent(parent, tagName) {
        const element = parent.getElementsByTagName(tagName)[0];
        return element ? element.textContent : null;
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    calculateTotalDistance(tracks) {
        let totalDistance = 0;
        
        for (let track of tracks) {
            for (let segment of track.segments) {
                for (let i = 1; i < segment.length; i++) {
                    const prev = segment[i - 1];
                    const curr = segment[i];
                    totalDistance += this.calculateDistance(
                        prev.lat, prev.lon, curr.lat, curr.lon
                    );
                }
            }
        }
        
        return totalDistance;
    }
    
    countTrackPoints(tracks) {
        let count = 0;
        for (let track of tracks) {
            for (let segment of track.segments) {
                count += segment.length;
            }
        }
        return count;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatDistance(km) {
        if (km < 1) {
            return (km * 1000).toFixed(0) + ' m';
        }
        return km.toFixed(2) + ' km';
    }
    
    displayFileInfo(file, gpxData) {
        const totalPoints = this.countTrackPoints(gpxData);
        const totalDistance = this.calculateTotalDistance(gpxData);
        
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('trackPoints').textContent = totalPoints.toLocaleString();
        document.getElementById('totalDistance').textContent = this.formatDistance(totalDistance);
        
        this.fileInfo.style.display = 'block';
    }
    
    displayTrackData(gpxData) {
        const container = document.getElementById('trackPointsList');
        container.innerHTML = '';
        
        if (gpxData.length === 0) {
            container.innerHTML = '<p>No track data found in the GPX file.</p>';
            this.trackData.style.display = 'block';
            return;
        }
        
        let pointIndex = 1;
        
        for (let trackIndex = 0; trackIndex < gpxData.length; trackIndex++) {
            const track = gpxData[trackIndex];
            
            // Add track header
            const trackHeader = document.createElement('div');
            trackHeader.className = 'track-header';
            trackHeader.innerHTML = `<h4>Track ${trackIndex + 1}: ${track.name}</h4>`;
            container.appendChild(trackHeader);
            
            for (let segmentIndex = 0; segmentIndex < track.segments.length; segmentIndex++) {
                const segment = track.segments[segmentIndex];
                
                // Add segment header
                const segmentHeader = document.createElement('div');
                segmentHeader.className = 'segment-header';
                segmentHeader.innerHTML = `<h5>Segment ${segmentIndex + 1} (${segment.length} points)</h5>`;
                container.appendChild(segmentHeader);
                
                // Display first few points and last few points
                const pointsToShow = segment.length > 10 ? 5 : segment.length;
                
                for (let i = 0; i < pointsToShow; i++) {
                    const point = segment[i];
                    this.createPointElement(container, pointIndex++, point, i + 1);
                }
                
                if (segment.length > 10) {
                    const skipElement = document.createElement('div');
                    skipElement.className = 'track-point skip-point';
                    skipElement.innerHTML = `<span class="point-value">... ${segment.length - 10} more points ...</span>`;
                    container.appendChild(skipElement);
                    
                    // Show last 5 points
                    for (let i = segment.length - 5; i < segment.length; i++) {
                        const point = segment[i];
                        this.createPointElement(container, pointIndex++, point, i + 1);
                    }
                }
            }
        }
        
        this.trackData.style.display = 'block';
    }
    
    createPointElement(container, pointIndex, point, segmentIndex) {
        const pointElement = document.createElement('div');
        pointElement.className = 'track-point';
        
        const lat = point.lat.toFixed(6);
        const lon = point.lon.toFixed(6);
        const ele = point.ele ? parseFloat(point.ele).toFixed(1) + ' m' : 'N/A';
        const time = point.time ? new Date(point.time).toLocaleString() : 'N/A';
        
        pointElement.innerHTML = `
            <div><span class="point-label">Point ${pointIndex}:</span> <span class="point-value">#${segmentIndex}</span></div>
            <div><span class="point-label">Latitude:</span> <span class="point-value">${lat}</span></div>
            <div><span class="point-label">Longitude:</span> <span class="point-value">${lon}</span></div>
            <div><span class="point-label">Elevation:</span> <span class="point-value">${ele}</span></div>
            <div><span class="point-label">Time:</span> <span class="point-value">${time}</span></div>
        `;
        
        container.appendChild(pointElement);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GPXLoader();
}); 