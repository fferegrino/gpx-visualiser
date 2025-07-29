class GPXLoader {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.mapSection = document.getElementById('mapSection');
        this.trackData = document.getElementById('trackData');
        this.map = null;
        this.trackLayers = [];
        
        // Animation properties
        this.animationMarker = null;
        this.animationInterval = null;
        this.currentPointIndex = 0;
        this.allPoints = [];
        this.isPlaying = false;
        this.animationSpeed = 1;
        
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
        
        // Animation controls
        document.getElementById('playButton').addEventListener('click', () => {
            this.playAnimation();
        });
        
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.pauseAnimation();
        });
        
        document.getElementById('resetButton').addEventListener('click', () => {
            this.resetAnimation();
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.animationSpeed + 'x';
            if (this.isPlaying) {
                this.restartAnimation();
            }
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
            this.initializeMap(gpxData);
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
    
    initializeMap(gpxData) {
        // Clear existing map if any
        if (this.map) {
            this.map.remove();
            this.trackLayers = [];
        }
        
        // Show map section
        this.mapSection.style.display = 'block';
        
        // Initialize map
        this.map = L.map('map').setView([0, 0], 13);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Plot tracks on map
        this.plotTracksOnMap(gpxData);
        
        // Prepare animation data
        this.prepareAnimationData(gpxData);
    }
    
    prepareAnimationData(gpxData) {
        this.allPoints = [];
        this.currentPointIndex = 0;
        
        // Flatten all track points into a single array
        gpxData.forEach(track => {
            track.segments.forEach(segment => {
                segment.forEach(point => {
                    this.allPoints.push({
                        lat: point.lat,
                        lon: point.lon,
                        ele: point.ele,
                        time: point.time
                    });
                });
            });
        });
        
        // Create animation marker
        if (this.allPoints.length > 0) {
            const firstPoint = this.allPoints[0];
            this.animationMarker = L.marker([firstPoint.lat, firstPoint.lon], {
                icon: L.divIcon({
                    className: 'animation-marker',
                    html: `<div style="background-color: #ff4757; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); animation: pulse 1s infinite;"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(this.map);
        }
    }
    
    playAnimation() {
        if (this.allPoints.length === 0 || this.isPlaying) return;
        
        this.isPlaying = true;
        document.getElementById('playButton').style.display = 'none';
        document.getElementById('pauseButton').style.display = 'flex';
        
        const interval = Math.max(50, 1000 / this.animationSpeed); // Minimum 50ms interval
        
        this.animationInterval = setInterval(() => {
            if (this.currentPointIndex >= this.allPoints.length) {
                this.pauseAnimation();
                return;
            }
            
            const point = this.allPoints[this.currentPointIndex];
            this.animationMarker.setLatLng([point.lat, point.lon]);
            
            this.currentPointIndex++;
        }, interval);
    }
    
    pauseAnimation() {
        this.isPlaying = false;
        document.getElementById('playButton').style.display = 'flex';
        document.getElementById('pauseButton').style.display = 'none';
        
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }
    
    resetAnimation() {
        this.pauseAnimation();
        this.currentPointIndex = 0;
        
        if (this.allPoints.length > 0 && this.animationMarker) {
            const firstPoint = this.allPoints[0];
            this.animationMarker.setLatLng([firstPoint.lat, firstPoint.lon]);
        }
    }
    
    restartAnimation() {
        this.pauseAnimation();
        this.playAnimation();
    }
    
    plotTracksOnMap(gpxData) {
        if (!gpxData || gpxData.length === 0) return;
        
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
        let bounds = L.latLngBounds();
        
        gpxData.forEach((track, trackIndex) => {
            const color = colors[trackIndex % colors.length];
            
            track.segments.forEach((segment, segmentIndex) => {
                if (segment.length < 2) return;
                
                // Convert track points to latlng array
                const latlngs = segment.map(point => [point.lat, point.lon]);
                
                // Create polyline for this segment
                const polyline = L.polyline(latlngs, {
                    color: color,
                    weight: 4,
                    opacity: 0.8
                }).addTo(this.map);
                
                // Add start marker
                const startPoint = latlngs[0];
                const startMarker = L.marker(startPoint, {
                    icon: L.divIcon({
                        className: 'start-marker',
                        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                }).addTo(this.map);
                
                // Add end marker
                const endPoint = latlngs[latlngs.length - 1];
                const endMarker = L.marker(endPoint, {
                    icon: L.divIcon({
                        className: 'end-marker',
                        html: `<div style="background-color: #ff4757; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                }).addTo(this.map);
                
                // Add popup with track info
                const distance = this.calculateSegmentDistance(segment);
                const popupContent = `
                    <div style="min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; color: ${color};">${track.name}</h4>
                        <p style="margin: 4px 0;"><strong>Segment:</strong> ${segmentIndex + 1}</p>
                        <p style="margin: 4px 0;"><strong>Points:</strong> ${segment.length}</p>
                        <p style="margin: 4px 0;"><strong>Distance:</strong> ${this.formatDistance(distance)}</p>
                    </div>
                `;
                
                polyline.bindPopup(popupContent);
                
                // Extend bounds
                bounds.extend(latlngs);
                
                this.trackLayers.push(polyline, startMarker, endMarker);
            });
        });
        
        // Fit map to show all tracks
        if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [10, 10] });
        }
    }
    
    calculateSegmentDistance(segment) {
        let distance = 0;
        for (let i = 1; i < segment.length; i++) {
            const prev = segment[i - 1];
            const curr = segment[i];
            distance += this.calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        }
        return distance;
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