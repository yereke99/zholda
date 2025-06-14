// FIXED: Enhanced Real-time Location Service for Driver with 1-second GPS updates
class DriverLocationService {
    constructor() {
        this.watchId = null;
        this.locationInterval = null;
        this.currentUserLocation = null; // Will be [longitude, latitude] for Yandex
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
                allow: 'Разрешить GPS',
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
                allow: 'GPS рұқсат беру',
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

    // FIXED: Request location permission with aggressive real-time tracking
    requestLocationPermission() {
        console.log('🌍 Driver requesting HIGH-ACCURACY location permission...');
        
        this.hidePermissionDialog();
        this.updateLocationStatus('active', this.translations[window.currentLang || 'ru'].searching);
        
        if (!navigator.geolocation) {
            console.error('❌ Geolocation not supported');
            this.handleLocationError({ code: 0, message: 'Geolocation not supported' });
            this.initializeWithDefaultLocation();
            return;
        }

        // CRITICAL: Request maximum accuracy location with aggressive settings
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ Driver location permission GRANTED:', position.coords);
                this.locationPermissionGranted = true;
                
                // FIXED: Store as [longitude, latitude] for Yandex Maps
                this.currentUserLocation = [position.coords.longitude, position.coords.latitude];
                this.lastAccuracy = position.coords.accuracy;
                this.lastUpdateTime = Date.now();
                
                // Update global variable for map initialization
                window.currentUserLocation = this.currentUserLocation;
                
                this.updateLocationStatus('active', 
                    `${this.translations[window.currentLang || 'ru'].locationActive} ±${Math.round(position.coords.accuracy)}m`
                );
                
                console.log('📍 Driver location set to:', this.currentUserLocation);
                
                // Initialize map with REAL location
                this.initializeMapWithLocation();
                
                // Start AGGRESSIVE real-time tracking immediately
                this.startAggressiveLocationTracking();
            },
            (error) => {
                console.error('❌ Driver location permission DENIED:', error);
                this.handleLocationError(error);
                this.initializeWithDefaultLocation();
            },
            {
                enableHighAccuracy: true,  // FORCE high accuracy
                timeout: 15000,           // Give more time for initial fix
                maximumAge: 0             // Always get fresh location
            }
        );
    }

    // Hide permission dialog
    hidePermissionDialog() {
        const dialog = document.getElementById('permissionDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    // Skip location permission
    skipLocationPermission() {
        console.log('⏭️ Driver location permission skipped - using Almaty');
        this.hidePermissionDialog();
        this.updateLocationStatus('error', this.translations[window.currentLang || 'ru'].locationError);
        this.initializeWithDefaultLocation();
    }

    // FIXED: Use Almaty coordinates as fallback (not static everywhere)
    initializeWithDefaultLocation() {
        // Almaty, Kazakhstan coordinates [longitude, latitude]
        this.currentUserLocation = [76.889709, 43.238949];
        window.currentUserLocation = this.currentUserLocation;
        console.log('📍 Driver using DEFAULT Almaty location:', this.currentUserLocation);
        this.initializeMapWithLocation();
    }

    // Handle location errors with better messaging
    handleLocationError(error) {
        let errorMessage = this.translations[window.currentLang || 'ru'].locationError;
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = this.translations[window.currentLang || 'ru'].locationDenied;
                console.log('📍 Driver location permission DENIED by user');
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = this.translations[window.currentLang || 'ru'].locationUnavailable;
                console.log('📍 Driver location information UNAVAILABLE');
                break;
            case error.TIMEOUT:
                errorMessage = this.translations[window.currentLang || 'ru'].locationTimeout;
                console.log('📍 Driver location request TIMEOUT');
                break;
            default:
                console.log('📍 Unknown driver location error:', error.message);
                break;
        }
        
        this.updateLocationStatus('error', errorMessage);
    }

    // Initialize map after getting location
    initializeMapWithLocation() {
        // Ensure global location variable is set
        window.currentUserLocation = this.currentUserLocation;
        
        // Wait for map initialization function to be available
        if (typeof window.initializeDriverMap === 'function') {
            console.log('🗺️ Initializing driver map with REAL location:', this.currentUserLocation);
            window.initializeDriverMap();
        } else {
            console.warn('⚠️ initializeDriverMap not ready, retrying...');
            let attempts = 0;
            const maxAttempts = 10;
            
            const retry = () => {
                attempts++;
                if (typeof window.initializeDriverMap === 'function') {
                    console.log('🗺️ Map function ready, initializing...');
                    window.initializeDriverMap();
                } else if (attempts < maxAttempts) {
                    setTimeout(retry, 500);
                } else {
                    console.error('❌ initializeDriverMap function not available after retries');
                }
            };
            
            setTimeout(retry, 500);
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

    // CRITICAL: Start AGGRESSIVE real-time location tracking every 1 second
    startAggressiveLocationTracking() {
        if (!navigator.geolocation || !this.locationPermissionGranted || this.isTracking) {
            console.warn('⚠️ Cannot start tracking: geolocation=' + !!navigator.geolocation + 
                        ' permission=' + this.locationPermissionGranted + ' isTracking=' + this.isTracking);
            return;
        }

        console.log('🔄 Starting AGGRESSIVE driver GPS tracking (1-second intervals)...');
        this.isTracking = true;

        // Method 1: watchPosition with maximum accuracy
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
                timeout: 3000,        // 3 seconds timeout
                maximumAge: 0         // Always get fresh location
            }
        );

        // Method 2: AGGRESSIVE interval polling every 1 second
        this.locationInterval = setInterval(() => {
            if (!this.locationPermissionGranted) {
                console.warn('⚠️ Permission lost, stopping interval');
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.processLocationUpdate(position, 'interval');
                },
                (error) => {
                    console.warn('⚠️ Driver interval GPS failed:', error.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 2000,      // 2 seconds timeout for fast response
                    maximumAge: 1000    // Accept location up to 1 second old
                }
            );
        }, 1000); // Every 1 second!

        console.log('✅ AGGRESSIVE driver GPS tracking started - updates every 1 second');
    }

    // FIXED: Process location update with proper coordinate handling
    processLocationUpdate(position, source) {
        // CRITICAL: Always store as [longitude, latitude] for Yandex Maps
        const newCoords = [position.coords.longitude, position.coords.latitude];
        const accuracy = position.coords.accuracy;
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
        
        this.updateCounter++;
        
        console.log(`📍 Driver GPS #${this.updateCounter} [${source}]: LAT=${newCoords[1].toFixed(6)}, LON=${newCoords[0].toFixed(6)} (±${Math.round(accuracy)}m) [${timeSinceLastUpdate}ms ago]`);
        
        // Calculate distance moved
        let distanceMoved = 0;
        if (this.currentUserLocation) {
            distanceMoved = this.calculateDistance(
                this.currentUserLocation[1], this.currentUserLocation[0], // old lat, old lon
                newCoords[1], newCoords[0]                                // new lat, new lon
            ) * 1000; // convert to meters
        }

        // AGGRESSIVE update conditions:
        const shouldUpdate = 
            !this.currentUserLocation ||          // First location
            accuracy < this.lastAccuracy ||       // Better accuracy
            distanceMoved > 0.5 ||                // Moved more than 0.5 meter
            timeSinceLastUpdate > 3000;           // More than 3 seconds since last update

        if (shouldUpdate) {
            const oldLocation = this.currentUserLocation ? [...this.currentUserLocation] : null;
            
            // Update location data
            this.currentUserLocation = newCoords;
            this.lastAccuracy = accuracy;
            this.lastUpdateTime = currentTime;
            window.currentUserLocation = newCoords;
            
            // Update map marker with new position
            this.updateMapUserLocation(newCoords);
            
            // Update status with real-time info
            const speed = position.coords.speed ? ` ${Math.round(position.coords.speed * 3.6)}км/ч` : '';
            const heading = position.coords.heading ? ` ${Math.round(position.coords.heading)}°` : '';
            this.updateLocationStatus('active', 
                `GPS ±${Math.round(accuracy)}m${speed}${heading} #${this.updateCounter}`
            );
            
            // Log movement details
            if (oldLocation && distanceMoved > 0) {
                console.log(`🚶 Driver moved ${distanceMoved.toFixed(1)}m (accuracy: ${accuracy.toFixed(1)}m)`);
            }
        } else {
            console.log(`⏹️ Skipping driver update: moved=${distanceMoved.toFixed(1)}m, accuracy=${accuracy}m vs ${this.lastAccuracy}m, time=${timeSinceLastUpdate}ms`);
        }
    }

    // FIXED: Update map user location marker
    updateMapUserLocation(coordinates) {
        try {
            // Always keep global variable updated
            window.currentUserLocation = coordinates;
            
            // Try to update map marker via function
            if (typeof window.updateDriverLocationMarker === 'function') {
                window.updateDriverLocationMarker(coordinates);
                console.log('📍 Driver map marker updated via function');
            } else if (window.userLocationMarker && window.driverMap) {
                // Direct update if function not available
                if (window.userLocationMarker.update) {
                    window.userLocationMarker.update({ coordinates: coordinates });
                    console.log('📍 Driver map marker updated directly');
                } else {
                    console.warn('⚠️ Cannot update marker - no update method');
                }
            } else {
                console.warn('⚠️ Map marker or map not available for update');
            }
            
            // Smart auto-centering only when necessary
            this.smartAutoRecenter(coordinates);
            
        } catch (error) {
            console.error('🗺️ Error updating driver map location:', error);
        }
    }

    // Smart auto-recenter map when user moves significantly
    smartAutoRecenter(coordinates) {
        try {
            if (!window.driverMap || !window.driverMap.getLocation || window.selectingPoint) {
                return; // Don't recenter during address selection
            }
            
            const currentLocation = window.driverMap.getLocation();
            if (!currentLocation || !currentLocation.center) return;
            
            const mapCenter = currentLocation.center;
            const distance = this.calculateDistance(
                mapCenter[1] || 0,  // map center latitude
                mapCenter[0] || 0,  // map center longitude
                coordinates[1],     // user latitude
                coordinates[0]      // user longitude
            );
            
            // Only recenter if user moved more than 100 meters from map center
            if (distance > 0.1) { // 100 meters
                if (window.driverMap.setLocation) {
                    window.driverMap.setLocation({
                        center: coordinates,
                        zoom: window.driverMap.getLocation().zoom || 14,
                        duration: 1500
                    });
                    console.log(`🎯 Driver map recentered - user moved ${(distance * 1000).toFixed(0)}m from center`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Driver auto-recenter error:', error.message);
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
        return R * c; // Distance in kilometers
    }

    // Get current user location
    getCurrentLocation() {
        return this.currentUserLocation;
    }

    // Check if location permission is granted
    isLocationPermissionGranted() {
        return this.locationPermissionGranted;
    }

    // Set current location manually (for testing)
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
                (position) => resolve(position),
                (error) => reject(error),
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: highAccuracy ? 8000 : 5000,
                    maximumAge: 0
                }
            );
        });
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
            lastUpdateTime: this.lastUpdateTime,
            timeSinceLastUpdate: Date.now() - this.lastUpdateTime
        };
    }

    // Cleanup when page unloads
    cleanup() {
        console.log('🧹 Cleaning up driver location service...');
        this.stopTracking();
        this.locationPermissionGranted = false;
        this.currentUserLocation = null;
        this.lastAccuracy = Infinity;
        this.updateCounter = 0;
        window.currentUserLocation = null;
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

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && driverLocationService.locationPermissionGranted && !driverLocationService.isTracking) {
        console.log('📱 Driver page visible - restarting GPS tracking');
        driverLocationService.startAggressiveLocationTracking();
    } else if (document.visibilityState === 'hidden' && driverLocationService.isTracking) {
        console.log('📱 Driver page hidden - pausing GPS tracking');
        driverLocationService.stopTracking();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    driverLocationService.cleanup();
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📍 Enhanced Driver Location Service loaded and ready');
    console.log('🚀 Driver GPS will update every 1 second when permission granted');
});

console.log('📍 FIXED Driver Location Service script loaded');