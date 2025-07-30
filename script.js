class GPXLoader {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.mapSection = document.getElementById('mapSection');
        this.trackData = document.getElementById('trackData');
        this.map = null;
        this.mapContainer = document.getElementById('map');
        this.trackLayers = [];
        
        // Animation properties
        this.animationMarker = null;
        this.animationInterval = null;
        this.currentPointIndex = 0;
        this.currentRotation = 0;
        this.allPoints = [];
        this.isPlaying = false;
        this.animationSpeed = 1;
        this.autoZoom = true;
        this.showTrail = true;
        
        // Export properties
        this.isExporting = false;
        this.exportFrames = [];
        this.exportCanvas = null;
        this.exportContext = null;
        
        // Trail properties
        this.trailPolyline = null;
        this.trailPoints = [];
        
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
        
        document.getElementById('autoZoomCheckbox').addEventListener('change', (e) => {
            this.autoZoom = e.target.checked;
        });
        
        document.getElementById('trailCheckbox').addEventListener('change', (e) => {
            this.showTrail = e.target.checked;
            if (this.trailPolyline) {
                this.trailPolyline.setStyle({ opacity: this.showTrail ? 0.8 : 0 });
            }
        });
        
        document.getElementById('exportButton').addEventListener('click', () => {
            this.exportVideo();
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
        this.interpolatedPoints = [];
        
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
        
        // Create interpolated points based on timestamps
        this.createInterpolatedPoints();
        
        // Display timing information
        this.displayTimingInfo();
        
        // Create animation marker and trail
        if (this.interpolatedPoints.length > 0) {
            const firstPoint = this.interpolatedPoints[0];
            this.animationMarker = L.marker([firstPoint.lat, firstPoint.lon], {
                icon: L.divIcon({
                    className: 'animation-marker',
                    html: `<div style="background-color: #ff4757; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); animation: pulse 1s infinite;"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(this.map);
            
            // Initialize trail polyline
            this.trailPolyline = L.polyline([], {
                color: '#000000',
                weight: 6,
                opacity: this.showTrail ? 0.8 : 0,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(this.map);
        }
    }
    
    createInterpolatedPoints() {
        this.interpolatedPoints = [];
        
        // Filter points that have timestamps
        const pointsWithTime = this.allPoints.filter(point => point.time);
        
        if (pointsWithTime.length < 2) {
            // If not enough points with time, use original points
            this.interpolatedPoints = this.allPoints;
            return;
        }
        
        // Sort points by time
        pointsWithTime.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        // Calculate total duration
        const startTime = new Date(pointsWithTime[0].time);
        const endTime = new Date(pointsWithTime[pointsWithTime.length - 1].time);
        const totalDuration = endTime - startTime;
        
        // Create interpolated points at regular intervals
        const targetDuration = Math.min(totalDuration, 60000); // Max 1 minute for very long tracks
        const intervalMs = Math.max(100, targetDuration / 200); // Max 200 points for smooth animation
        
        for (let currentTime = startTime.getTime(); currentTime <= endTime.getTime(); currentTime += intervalMs) {
            const interpolatedPoint = this.interpolatePointAtTime(pointsWithTime, currentTime);
            if (interpolatedPoint) {
                this.interpolatedPoints.push(interpolatedPoint);
            }
        }
        
        // Add the final point if not already included
        const lastPoint = pointsWithTime[pointsWithTime.length - 1];
        if (this.interpolatedPoints.length === 0 || 
            this.interpolatedPoints[this.interpolatedPoints.length - 1].time !== lastPoint.time) {
            this.interpolatedPoints.push(lastPoint);
        }
    }
    
    interpolatePointAtTime(points, targetTime) {
        // Find the two points that bracket the target time
        let beforePoint = null;
        let afterPoint = null;
        
        for (let i = 0; i < points.length - 1; i++) {
            const currentTime = new Date(points[i].time).getTime();
            const nextTime = new Date(points[i + 1].time).getTime();
            
            if (targetTime >= currentTime && targetTime <= nextTime) {
                beforePoint = points[i];
                afterPoint = points[i + 1];
                break;
            }
        }
        
        if (!beforePoint || !afterPoint) {
            return null;
        }
        
        // Calculate interpolation factor
        const beforeTime = new Date(beforePoint.time).getTime();
        const afterTime = new Date(afterPoint.time).getTime();
        const factor = (targetTime - beforeTime) / (afterTime - beforeTime);
        
        // Interpolate position
        const lat = beforePoint.lat + (afterPoint.lat - beforePoint.lat) * factor;
        const lon = beforePoint.lon + (afterPoint.lon - beforePoint.lon) * factor;
        
        // Interpolate elevation if available
        let ele = null;
        if (beforePoint.ele && afterPoint.ele) {
            ele = parseFloat(beforePoint.ele) + (parseFloat(afterPoint.ele) - parseFloat(beforePoint.ele)) * factor;
        }
        
        return {
            lat: lat,
            lon: lon,
            ele: ele,
            time: new Date(targetTime).toISOString()
        };
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }
    
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
    
    calculateBearing(lat1, lon1, lat2, lon2) {
        // Convert to radians
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δλ = this.toRadians(lon2 - lon1);
    
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                  Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
        const θ = Math.atan2(y, x); // Bearing in radians
        const bearing = (this.toDegrees(θ) + 360) % 360; // Normalize to 0–360°
        return bearing;
    }
    
    calculateRotationAngle(lat1, lon1, lat2, lon2) {
        const bearing = this.calculateBearing(lat1, lon1, lat2, lon2);
        const rotation = -bearing; // Negative to rotate so the line points north
        return rotation;
    }
    
    averageBearings(bearings) {
        // Convert to unit vectors and average
        let sumX = 0;
        let sumY = 0;
    
        for (const b of bearings) {
            const rad = this.toRadians(b);
            sumX += Math.cos(rad);
            sumY += Math.sin(rad);
        }
    
        const avgRad = Math.atan2(sumY, sumX);
        return (this.toDegrees(avgRad) + 360) % 360;
    }
    
    getSmoothedRotation(points, index, lookahead = 30) {
        const bearings = [];
    
        for (let i = 1; i <= lookahead; i++) {
            const from = points[index];
            const toIndex = index + i;
    
            if (toIndex >= points.length) break;
    
            const to = points[toIndex];
            const b = this.calculateBearing(from.lat, from.lon, to.lat, to.lon);
            bearings.push(b);
        }
    
        if (bearings.length === 0) return 0;
    
        const smoothedBearing = this.averageBearings(bearings);
        return -smoothedBearing; // Rotate so direction faces up (north)
    }



    displayTimingInfo() {
        const timingInfo = document.getElementById('timingInfo');
        const durationValue = document.getElementById('durationValue');
        const pointsValue = document.getElementById('pointsValue');
        
        if (this.interpolatedPoints.length > 0) {
            const pointsWithTime = this.allPoints.filter(point => point.time);
            
            if (pointsWithTime.length >= 2) {
                const startTime = new Date(pointsWithTime[0].time);
                const endTime = new Date(pointsWithTime[pointsWithTime.length - 1].time);
                const duration = endTime - startTime;
                
                // Format duration
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                
                durationValue.textContent = durationText;
                pointsValue.textContent = this.interpolatedPoints.length.toLocaleString();
                
                timingInfo.style.display = 'flex';
            } else {
                timingInfo.style.display = 'none';
            }
        } else {
            timingInfo.style.display = 'none';
        }
    }
    
    playAnimation() {

        if (this.interpolatedPoints.length === 0 || this.isPlaying) return;
        
        this.isPlaying = true;
        document.getElementById('playButton').style.display = 'none';
        document.getElementById('pauseButton').style.display = 'flex';
        
        const interval = Math.max(50, 1000 / this.animationSpeed); // Minimum 50ms interval
        
        this.animationInterval = setInterval(() => {
            if (this.currentPointIndex >= this.interpolatedPoints.length) {
                this.pauseAnimation();
                return;
            }
            
            const point = this.interpolatedPoints[this.currentPointIndex];
            this.animationMarker.setLatLng([point.lat, point.lon]);
            
            // Update trail if enabled
            if (this.showTrail) {
                this.updateTrail(point);
            }
            
            // Zoom to the current point if auto-zoom is enabled
            if (this.autoZoom) {
                this.map.setView([point.lat, point.lon], 17, {
                    animate: true,
                    duration: 0.5
                });

                let rotationAngle = this.getSmoothedRotation(this.interpolatedPoints, this.currentPointIndex);

                if (Math.abs(rotationAngle - this.currentRotation) > 2) {
                    this.mapContainer.style.transform = `rotate(${rotationAngle}deg)`;
                }
                this.currentRotation = rotationAngle;

            }
            
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
        
        if (this.interpolatedPoints.length > 0 && this.animationMarker) {
            const firstPoint = this.interpolatedPoints[0];
            this.animationMarker.setLatLng([firstPoint.lat, firstPoint.lon]);
            
            // Reset trail
            this.resetTrail();
            
            // Reset map view to show all tracks
            this.fitMapToTracks();
        }
    }
    
    restartAnimation() {
        this.pauseAnimation();
        this.playAnimation();
    }
    
    updateTrail(point) {
        if (!this.trailPolyline) return;
        
        // Add current point to trail
        this.trailPoints.push([point.lat, point.lon]);
        
        // Update the polyline with all trail points
        this.trailPolyline.setLatLngs(this.trailPoints);
    }
    
    resetTrail() {
        if (!this.trailPolyline) return;
        
        // Clear trail points
        this.trailPoints = [];
        
        // Reset polyline
        this.trailPolyline.setLatLngs([]);
    }
    
    async exportVideo() {
        if (this.isExporting || this.interpolatedPoints.length === 0) return;
        
        this.isExporting = true;
        const exportButton = document.getElementById('exportButton');
        const progressContainer = document.getElementById('exportProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        // Disable export button and show progress
        exportButton.disabled = true;
        progressContainer.style.display = 'flex';
        
        try {
            // Initialize canvas for frame capture
            this.initializeExportCanvas();
            
            // Capture frames
            await this.captureFrames();
            
            // Create video from frames
            await this.createVideoFromFrames();
            
            progressText.textContent = 'Export complete!';
            setTimeout(() => {
                progressContainer.style.display = 'none';
                exportButton.disabled = false;
                this.isExporting = false;
            }, 2000);
            
        } catch (error) {
            console.error('Export error:', error);
            progressText.textContent = 'Export failed!';
            setTimeout(() => {
                progressContainer.style.display = 'none';
                exportButton.disabled = false;
                this.isExporting = false;
            }, 2000);
        }
    }
    
    initializeExportCanvas() {
        const mapElement = document.getElementById('map');
        const rect = mapElement.getBoundingClientRect();
        
        this.exportCanvas = document.createElement('canvas');
        this.exportCanvas.width = rect.width;
        this.exportCanvas.height = rect.height;
        this.exportContext = this.exportCanvas.getContext('2d');
    }
    
    async captureFrames() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const totalPoints = this.interpolatedPoints.length;
        
        // Reset animation state
        this.currentPointIndex = 0;
        this.pauseAnimation();
        
        for (let i = 0; i < totalPoints; i++) {
            if (!this.isExporting) break;
            
            const point = this.interpolatedPoints[i];
            
            // Move marker to current point
            this.animationMarker.setLatLng([point.lat, point.lon]);
            
            // Zoom if auto-zoom is enabled
            if (this.autoZoom) {
                this.map.setView([point.lat, point.lon], 25, {
                    animate: false // Disable animation for faster capture
                });
            }
            
            // Wait for map to render
            await this.waitForMapRender();
            
            // Capture frame
            await this.captureFrame();
            
            // Update progress
            const progress = ((i + 1) / totalPoints) * 100;
            progressFill.style.width = progress + '%';
            progressText.textContent = `Capturing frame ${i + 1}/${totalPoints}`;
            
            this.currentPointIndex++;
        }
    }
    
    async waitForMapRender() {
        return new Promise(resolve => {
            setTimeout(resolve, 100); // Wait for map tiles to load
        });
    }
    
    async captureFrame() {
        return new Promise((resolve) => {
            // Use html2canvas to capture the map
            if (typeof html2canvas !== 'undefined') {
                html2canvas(document.getElementById('map'), {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null
                }).then(canvas => {
                    this.exportFrames.push(canvas);
                    resolve();
                });
            } else {
                // Fallback: create a simple colored frame
                const canvas = document.createElement('canvas');
                canvas.width = this.exportCanvas.width;
                canvas.height = this.exportCanvas.height;
                const ctx = canvas.getContext('2d');
                
                // Create a simple frame with map-like background
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Add some text to indicate this is a fallback
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Map capture not available', canvas.width / 2, canvas.height / 2);
                
                this.exportFrames.push(canvas);
                resolve();
            }
        });
    }
    
    async createVideoFromFrames() {
        const progressText = document.getElementById('progressText');
        progressText.textContent = 'Creating video...';
        
        if (this.exportFrames.length === 0) {
            throw new Error('No frames captured');
        }
        
        // Create a simple video using MediaRecorder API
        const canvas = this.exportFrames[0];
        const stream = canvas.captureStream(30); // 30 FPS
        
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        const chunks = [];
        
        return new Promise((resolve, reject) => {
            mediaRecorder.ondataavailable = (event) => {
                chunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                
                // Create download link
                const a = document.createElement('a');
                a.href = url;
                a.download = 'gpx-animation.webm';
                a.click();
                
                URL.revokeObjectURL(url);
                resolve();
            };
            
            mediaRecorder.start();
            
            // Play frames
            let frameIndex = 0;
            const playNextFrame = () => {
                if (frameIndex >= this.exportFrames.length) {
                    mediaRecorder.stop();
                    return;
                }
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this.exportFrames[frameIndex], 0, 0);
                frameIndex++;
                
                setTimeout(playNextFrame, 1000 / 30); // 30 FPS
            };
            
            playNextFrame();
        });
    }
    
    fitMapToTracks() {
        if (this.trackLayers.length > 0) {
            const bounds = L.latLngBounds();
            this.trackLayers.forEach(layer => {
                if (layer.getLatLngs) {
                    bounds.extend(layer.getLatLngs());
                } else if (layer.getLatLng) {
                    bounds.extend(layer.getLatLng());
                }
            });
            if (!bounds.isEmpty()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
            }
        }
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
            this.map.fitBounds(bounds, { padding: [20, 20] });
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