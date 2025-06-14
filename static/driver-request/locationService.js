// Enhanced Real-time Location Service for Driver with 1-second updates
class DriverLocationService {
    constructor() {
        this.watchId = null;
        this.locationInterval = null;
        this.currentUserLocation = null;
        this.locationPermissionGranted = false;
        this.isTracking = false;
        this.lastAccuracy = Infinity;
        this.lastUpdateTime = 0;
        this.updateCounter = 0;
        this.translations = {
            ru: {
                locationActive: 'GPS активен',
                locationError: 'Ошибка GPS',
                locationPermission: 'Разрешение на геолокацию',
                locationPermissionMessage: 'Для создания точной заявки нам нужен доступ к вашему местоположению. Это поможет клиентам найти вас быстрее.',
                allow: 'Разрешить',
                skip: 'Пропустить',
                locationDenied: 'GPS запрещен',
                locationTimeout: 'GPS недоступен',
                locationUnavailable: 'GPS недоступен',
                searching: 'Поиск GPS...'
            },
            kz: {
                locationActive: 'GPS белсенді',
                locationError: 'GPS қатесі',
                locationPermission: 'Геолокацияға рұқсат',
                locationPermissionMessage: 'Дәл өтінім жасау үшін бізге сіздің орналасқан жеріңізге қол жеткізу керек. Бұл клиенттерге сізді тезірек табуға көмектеседі.',
                allow: 'Рұқсат беру',
                skip: 'Өткізіп жіберу',
                locationDenied: 'GPS тыйым салынған',
                locationTimeout: 'GPS қол жетімді емес',
                locationUnavailable: 'GPS қол жетімді емес',
                searching: 'GPS іздеу...'
            }
        };
    }

    // Show permission dialog
    showPermissionDialog() {
        const dialog = document.getElementById('permissionDialog');
        if (dialog) {
            dialog.style.display = 'flex';
            console.log('📱 Driver permission dialog shown');
        }
    }

    // Request location permission with aggressive tracking
    requestLocationPermission() {
        console.log('🌍 Driver requesting high-accuracy location permission...');
        
        const dialog = document.getElementById('permissionDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
        
        // Show searching status
        this.updateLocationStatus('active', this.translations[window.currentLang || 'ru'].searching);
        
        if (!navigator.geolocation) {
            console.error('❌ Geolocation not supported');
            this.handleLocationError({ code: 0, message: 'Geolocation not supported' });
            this.initializeWithDefaultLocation();
            return;
        }

        // Request maximum accuracy location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ Driver location permission granted:', position);
                this.locationPermissionGranted = true;
                this.currentUserLocation = [position.coords.longitude, position.coords.latitude];
                this.lastAccuracy = position.coords.accuracy;
                this.lastUpdateTime = Date.now();
                
                // Update global variable
                window.currentUserLocation = this.currentUserLocation;
                
                this.updateLocationStatus('active', 
                    `${this.translations[window.currentLang || 'ru'].locationActive} ±${Math.round(position.coords.accuracy)}m`
                );
                
                // Initialize map with real location
                this.initializeMapWithLocation();
                
                // Start aggressive real-time tracking
                this.startAggressiveLocationTracking();
            },
            (error) => {
                console.error('❌ Driver location permission error:', error);
                this.handleLocationError(error);
                this.initializeWithDefaultLocation();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    // Skip location permission
    skipLocationPermission() {
        console.log('⏭️ Driver location permission skipped');
        
        const dialog = document.getElementById('permissionDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
        
        this.updateLocationStatus('error', this.translations[window.currentLang || 'ru'].locationError);
        this.initializeWithDefaultLocation();
    }

    // Initialize with default Almaty location
    initializeWithDefaultLocation() {
        this.currentUserLocation = [76.889709, 43.238949]; // Almaty coordinates
        window.currentUserLocation = this.currentUserLocation;
        console.log('📍 Driver using default location (Almaty):', this.currentUserLocation);
        this.initializeMapWithLocation();
    }

    // Handle location errors
    handleLocationError(error) {
        let errorMessage = this.translations[window.currentLang || 'ru'].locationError;
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = this.translations[window.currentLang || 'ru'].locationDenied;
                console.log('📍 Driver location permission denied by user');
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = this.translations[window.currentLang || 'ru'].locationUnavailable;
                console.log('📍 Driver location information unavailable');
                break;
            case error.TIMEOUT:
                errorMessage = this.translations[window.currentLang || 'ru'].locationTimeout;
                console.log('📍 Driver location request timeout');
                break;
            default:
                console.log('📍 Unknown driver location error:', error.message);
                break;
        }
        
        this.updateLocationStatus('error', errorMessage);
    }

    // Initialize map after getting location
    initializeMapWithLocation() {
        // Set global location variable
        window.currentUserLocation = this.currentUserLocation;
        
        if (typeof window.initializeDriverMap === 'function') {
            console.log('🗺️ Initializing driver map with location:', this.currentUserLocation);
            window.initializeDriverMap();
        } else {
            console.warn('⚠️ initializeDriverMap function not found, retrying...');
            setTimeout(() => {
                if (typeof window.initializeDriverMap === 'function') {
                    window.initializeDriverMap();
                } else {
                    console.error('❌ initializeDriverMap function still not available');
                }
            }, 1000);
        }
    }

    // Update location status display
    updateLocationStatus(status, message) {
        const statusEl = document.getElementById('locationStatus');
        const textEl = document.getElementById('locationText');
        
        if (statusEl && textEl) {
            statusEl.style.display = 'flex';
            statusEl.className = `location-status ${status}`;
            textEl.textContent = message;
            console.log(`📊 Driver location status: ${status} - ${message}`);
        }
    }

    // ENHANCED: Aggressive real-time location tracking every 1 second
    startAggressiveLocationTracking() {
        if (!navigator.geolocation || !this.locationPermissionGranted || this.isTracking) {
            return;
        }

        console.log('🔄 Starting AGGRESSIVE driver location tracking (1-second updates)...');
        this.isTracking = true;

        // Method 1: watchPosition with high frequency
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.processLocationUpdate(position, 'watchPosition');
            },
            (error) => {
                console.warn('🔄 Driver watch position error:', error.message);
                // Don't stop tracking on occasional errors
            },
            {
                enableHighAccuracy: true,
                timeout: 2000,      // 2 seconds timeout
                maximumAge: 0       // Always get fresh location
            }
        );

        // Method 2: Aggressive interval polling every 1 second
        this.locationInterval = setInterval(() => {
            if (!this.locationPermissionGranted) return;
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.processLocationUpdate(position, 'interval');
                },
                (error) => {
                    console.warn('⚠️ Driver interval location update failed:', error.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 1500,      // 1.5 seconds timeout for fast response
                    maximumAge: 500     // Accept location up to 0.5 seconds old
                }
            );
        }, 1000); // Every 1 second!

        console.log('✅ Aggressive driver GPS tracking started with 1-second intervals');
    }

    // Process location update from any source
    processLocationUpdate(position, source) {
        const newCoords = [position.coords.longitude, position.coords.latitude];
        const accuracy = position.coords.accuracy;
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
        
        this.updateCounter++;
        
        console.log(`📍 Driver GPS Update #${this.updateCounter} [${source}]: ${newCoords[1].toFixed(6)}, ${newCoords[0].toFixed(6)} (±${Math.round(accuracy)}m) [${timeSinceLastUpdate}ms ago]`);
        
        // Calculate distance moved
        let distanceMoved = 0;
        if (this.currentUserLocation) {
            distanceMoved = this.calculateDistance(
                this.currentUserLocation[1], this.currentUserLocation[0],
                newCoords[1], newCoords[0]
            ) * 1000; // in meters
        }

        // Update conditions - more aggressive:
        // 1. Better accuracy (even small improvements)
        // 2. User moved more than 1 meter
        // 3. More than 2 seconds since last update
        // 4. First location update
        const shouldUpdate = 
            !this.currentUserLocation || 
            accuracy < this.lastAccuracy || 
            distanceMoved > 1 || 
            timeSinceLastUpdate > 2000;

        if (shouldUpdate) {
            const oldLocation = this.currentUserLocation ? [...this.currentUserLocation] : null;
            
            this.currentUserLocation = newCoords;
            this.lastAccuracy = accuracy;
            this.lastUpdateTime = currentTime;
            window.currentUserLocation = newCoords;
            
            // Update map marker
            this.updateMapUserLocation(newCoords);
            
            // Update status with real-time info
            const speed = position.coords.speed ? ` ${Math.round(position.coords.speed * 3.6)}км/ч` : '';
            this.updateLocationStatus('active', 
                `GPS ±${Math.round(accuracy)}m${speed} #${this.updateCounter}`
            );
            
            // Log movement
            if (oldLocation && distanceMoved > 0) {
                console.log(`🚶 Driver moved ${distanceMoved.toFixed(1)}m (accuracy improved by ${(this.lastAccuracy - accuracy).toFixed(1)}m)`);
            }
        } else {
            console.log(`⏹️ Skipping driver update: dist=${distanceMoved.toFixed(1)}m, acc=${accuracy}m vs ${this.lastAccuracy}m, time=${timeSinceLastUpdate}ms`);
        }
    }

    // Update map user location marker with enhanced feedback
    updateMapUserLocation(coordinates) {
        try {
            // Update global variable
            window.currentUserLocation = coordinates;
            
            // Update user location marker on map
            if (typeof window.updateDriverLocationMarker === 'function') {
                window.updateDriverLocationMarker(coordinates);
                console.log('📍 Driver map marker updated via function');
            } else if (window.userLocationMarker && window.driverMap) {
                // Direct update if function not available
                if (window.userLocationMarker.update) {
                    window.userLocationMarker.update({ coordinates: coordinates });
                    console.log('📍 Driver map marker updated directly');
                }
            }
            
            // Smart auto-centering - only if user moved significantly
            this.smartAutoRecenter(coordinates);
            
        } catch (error) {
            console.error('🗺️ Error updating driver map location:', error);
        }
    }

    // Smart auto-recenter - only when necessary
    smartAutoRecenter(coordinates) {
        try {
            if (!window.driverMap || !window.driverMap.getLocation) return;
            
            const currentLocation = window.driverMap.getLocation();
            if (!currentLocation || !currentLocation.center) return;
            
            const mapCenter = currentLocation.center;
            const distance = this.calculateDistance(
                mapCenter[1] || 0, 
                mapCenter[0] || 0,
                coordinates[1], 
                coordinates[0]
            );
            
            // Only recenter if user moved more than 50 meters from map center
            // and we're not in selection mode
            if (distance > 0.05 && !window.selectingPoint) { // 50 meters
                if (window.driverMap.setLocation) {
                    window.driverMap.setLocation({
                        center: coordinates,
                        duration: 1000
                    });
                    console.log(`🎯 Driver map recentered - user moved ${(distance * 1000).toFixed(0)}m from center`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Driver auto-recenter warning:', error.message);
        }
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Get current user location
    getCurrentLocation() {
        return this.currentUserLocation;
    }

    // Check if location permission is granted
    isLocationPermissionGranted() {
        return this.locationPermissionGranted;
    }

    // Set current location manually
    setCurrentLocation(coords) {
        console.log('🎯 Manually setting driver location:', coords);
        this.currentUserLocation = coords;
        window.currentUserLocation = coords;
        this.updateMapUserLocation(coords);
    }

    // Stop location tracking
    stopTracking() {
        console.log('🛑 Stopping driver location tracking...');
        this.isTracking = false;
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.locationInterval) {
            clearInterval(this.locationInterval);
            this.locationInterval = null;
        }
        
        this.updateLocationStatus('error', 'GPS остановлен');
    }

    // Restart location tracking
    restartTracking() {
        console.log('🔄 Restarting driver location tracking...');
        this.stopTracking();
        if (this.locationPermissionGranted) {
            setTimeout(() => {
                this.startAggressiveLocationTracking();
            }, 1000);
        }
    }

    // Force immediate high-accuracy location update
    async forceLocationUpdate() {
        if (!this.locationPermissionGranted) {
            console.warn('⚠️ Cannot force driver update: no permission');
            return false;
        }

        try {
            console.log('🎯 Forcing immediate driver GPS update...');
            const position = await this.getCurrentLocationAsync(true);
            this.processLocationUpdate(position, 'forced');
            console.log('✅ Forced driver GPS update successful');
            return true;
        } catch (error) {
            console.error('❌ Force driver GPS update failed:', error);
            this.handleLocationError(error);
            return false;
        }
    }

    // Get current location with high accuracy (Promise)
    async getCurrentLocationAsync(highAccuracy = true) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve(position);
                },
                (error) => reject(error),
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: highAccuracy ? 5000 : 3000,
                    maximumAge: 0
                }
            );
        });
    }

    // Cleanup location tracking
    cleanup() {
        console.log('🧹 Cleaning up driver location service...');
        this.stopTracking();
        this.locationPermissionGranted = false;
        this.currentUserLocation = null;
        this.lastAccuracy = Infinity;
        this.updateCounter = 0;
        window.currentUserLocation = null;
    }

    // Get tracking status for debugging
    getTrackingStatus() {
        return {
            isTracking: this.isTracking,
            hasPermission: this.locationPermissionGranted,
            currentLocation: this.currentUserLocation,
            lastAccuracy: this.lastAccuracy,
            updateCounter: this.updateCounter,
            watchId: this.watchId,
            intervalId: this.locationInterval,
            lastUpdateTime: this.lastUpdateTime
        };
    }

    // Auto-start GPS when page becomes visible
    handleVisibilityChange() {
        if (document.visibilityState === 'visible' && this.locationPermissionGranted && !this.isTracking) {
            console.log('📱 Driver page visible - restarting GPS tracking');
            this.restartTracking();
        } else if (document.visibilityState === 'hidden' && this.isTracking) {
            console.log('📱 Driver page hidden - pausing GPS tracking');
            this.stopTracking();
        }
    }

    // Battery-aware tracking (reduce frequency on low battery)
    async adjustTrackingForBattery() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                if (battery.level < 0.2) { // Less than 20% battery
                    console.log('🔋 Low battery detected - reducing driver GPS frequency');
                    // Could implement less aggressive tracking here
                }
            } catch (error) {
                console.warn('⚠️ Battery API not available');
            }
        }
    }

    // Debug location history
    getLocationHistory() {
        return {
            currentLocation: this.currentUserLocation,
            accuracy: this.lastAccuracy,
            updateCount: this.updateCounter,
            trackingDuration: this.isTracking ? Date.now() - this.lastUpdateTime : 0,
            isActive: this.isTracking
        };
    }
}

// Create global location service instance
const driverLocationService = new DriverLocationService();

// Make functions available globally
window.requestLocationPermission = () => driverLocationService.requestLocationPermission();
window.skipLocationPermission = () => driverLocationService.skipLocationPermission();
window.driverLocationService = driverLocationService;

// Export debugging functions
window.getDriverLocationStatus = () => driverLocationService.getTrackingStatus();
window.forceDriverLocationUpdate = () => driverLocationService.forceLocationUpdate();
window.getDriverAccuracyInfo = () => driverLocationService.getAccuracyInfo();
window.startDriverGPSTracking = () => driverLocationService.setAggressiveMode(true);
window.stopDriverGPSTracking = () => driverLocationService.setAggressiveMode(false);

// Auto-handle page visibility changes
document.addEventListener('visibilitychange', () => {
    driverLocationService.handleVisibilityChange();
});

// Auto-check battery status periodically
setInterval(() => {
    driverLocationService.adjustTrackingForBattery();
}, 60000); // Every minute

// Clean up location tracking on page unload
window.addEventListener('beforeunload', () => {
    driverLocationService.cleanup();
});

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📍 Enhanced Real-time Driver Location Service loaded and ready');
    console.log('🚀 Driver GPS will update every 1 second when permission granted');
});

console.log('📍 Enhanced Driver Location Service script loaded with 1-second GPS updates');