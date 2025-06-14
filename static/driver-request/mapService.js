// COMPLETE FIXED: Enhanced Map Service for Driver with Working Yandex Maps v3
let driverMap;
let fromMarker, toMarker, userLocationMarker;
let routeLine;
let selectingPoint = null;
let currentUserLocation = null;
let isFullScreenMap = false;
let mapInitialized = false;

// FIXED: Initialize driver map with proper error handling and REAL coordinates
async function initializeDriverMap() {
    try {
        console.log('🗺️ Starting Driver Yandex Maps v3 initialization...');
        
        // Check if ymaps3 is available
        if (!window.ymaps3) {
            console.error('❌ ymaps3 not loaded! Check API key.');
            showMapError('Yandex Maps API не загружен');
            return;
        }

        // Wait for ymaps3 to be ready
        console.log('⏳ Waiting for ymaps3.ready...');
        await ymaps3.ready;
        console.log('✅ ymaps3.ready completed');
        
        // Get required modules
        const {YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapListener} = ymaps3;
        
        if (!YMap || !YMapDefaultSchemeLayer) {
            throw new Error('Required ymaps3 modules not available');
        }

        // FIXED: Get current location from location service (not static!)
        currentUserLocation = window.currentUserLocation || 
                             (window.driverLocationService?.getCurrentLocation()) || 
                             [76.889709, 43.238949]; // Fallback to Almaty
        
        console.log('📍 Driver map using REAL location:', currentUserLocation);
        
        // Get map container
        const mapContainer = document.getElementById('driverRequestMap');
        if (!mapContainer) {
            throw new Error('Map container #driverRequestMap not found');
        }

        // CRITICAL: Initialize map with REAL user coordinates
        console.log('🗺️ Creating YMap instance with real coordinates...');
        driverMap = new YMap(mapContainer, {
            location: {
                center: currentUserLocation, // [longitude, latitude] - REAL coordinates
                zoom: 15 // Closer zoom for better detail
            },
            theme: 'light',
            behaviors: ['default']
        });

        // Add map layers
        console.log('🗺️ Adding map layers...');
        driverMap.addChild(new YMapDefaultSchemeLayer());
        driverMap.addChild(new YMapDefaultFeaturesLayer());

        // CRITICAL: Add user location marker at REAL position
        console.log('📍 Adding user location marker at real position...');
        addDriverLocationMarker(currentUserLocation);

        // Add click listener for address selection
        console.log('🖱️ Adding map click listener...');
        const mapListener = new YMapListener({
            layer: 'any',
            onClick: handleDriverMapClick
        });
        driverMap.addChild(mapListener);

        // Make map globally available
        window.driverMap = driverMap;
        window.userLocationMarker = userLocationMarker;

        mapInitialized = true;
        console.log('✅ Driver Yandex Maps v3 initialized successfully with REAL location!');
        
        // Update location status
        if (window.driverLocationService) {
            driverLocationService.updateLocationStatus('active', 'Карта загружена');
        }
        
    } catch (error) {
        console.error('❌ Error initializing Driver Yandex Maps v3:', error);
        showMapError('Ошибка загрузки карты: ' + error.message);
        
        if (window.driverLocationService) {
            driverLocationService.updateLocationStatus('error', 'Ошибка карты');
        }
    }
}

// Show map error with retry functionality
function showMapError(message) {
    const mapContainer = document.getElementById('driverRequestMap');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: var(--input-bg);
                color: var(--text-secondary);
                text-align: center;
                padding: 20px;
                border-radius: 12px;
            ">
                <div style="font-size: 2rem; margin-bottom: 10px;">🗺️</div>
                <div style="margin-bottom: 15px; font-weight: 600;">${message}</div>
                <button onclick="retryMapInitialization()" style="
                    background: var(--accent-gradient);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">Повторить</button>
            </div>
        `;
    }
}

// Retry map initialization
window.retryMapInitialization = function() {
    console.log('🔄 Retrying driver map initialization...');
    mapInitialized = false;
    setTimeout(() => {
        initializeDriverMap();
    }, 1000);
};

// FIXED: Add driver location marker with REAL coordinates and animation
function addDriverLocationMarker(coordinates) {
    try {
        console.log('👤 Creating driver location marker at REAL position:', coordinates);
        
        if (!driverMap || !window.ymaps3) {
            console.warn('⚠️ Map or ymaps3 not ready for marker creation');
            return;
        }
        
        const {YMapMarker} = ymaps3;
        
        // Remove existing marker if present
        if (userLocationMarker) {
            try {
                driverMap.removeChild(userLocationMarker);
            } catch (e) {
                console.warn('Warning removing old marker:', e);
            }
            userLocationMarker = null;
        }
        
        // Create enhanced user location element with pulsing animation
        const userLocationElement = document.createElement('div');
        userLocationElement.className = 'user-location-marker-container';
        userLocationElement.style.cssText = `
            position: relative;
            width: 24px;
            height: 24px;
            z-index: 1000;
        `;
        
        userLocationElement.innerHTML = `
            <div class="user-location-dot" style="
                position: absolute;
                top: 3px;
                left: 3px;
                width: 18px;
                height: 18px;
                background: #3b82f6;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                z-index: 2;
                transition: all 0.3s ease;
            "></div>
            <div class="user-location-pulse" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 24px;
                height: 24px;
                background: rgba(59, 130, 246, 0.3);
                border-radius: 50%;
                animation: userLocationPulse 2s infinite;
                z-index: 1;
            "></div>
            <style>
                @keyframes userLocationPulse {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(3); opacity: 0; }
                }
            </style>
        `;

        // CRITICAL: Create marker at REAL coordinates
        userLocationMarker = new YMapMarker(
            {
                coordinates: coordinates, // [longitude, latitude] - REAL position
                draggable: false
            },
            userLocationElement
        );

        driverMap.addChild(userLocationMarker);
        window.userLocationMarker = userLocationMarker;
        console.log('✅ Driver location marker added at REAL position');
        
    } catch (error) {
        console.error('❌ Error adding driver location marker:', error);
    }
}

// FIXED: Update driver location marker with REAL coordinates
function updateDriverLocationMarker(coordinates) {
    try {
        console.log('📍 Updating driver marker to REAL position:', coordinates);
        
        if (!mapInitialized || !driverMap) {
            console.warn('⚠️ Map not initialized, cannot update marker');
            return;
        }
        
        if (userLocationMarker) {
            // Update marker position with REAL coordinates
            userLocationMarker.update({
                coordinates: coordinates // [longitude, latitude] - REAL position
            });
            
            // Visual feedback for movement
            const markerElement = userLocationMarker.element;
            if (markerElement) {
                const dot = markerElement.querySelector('.user-location-dot');
                if (dot) {
                    // Flash the marker to indicate movement
                    dot.style.background = '#10b981';
                    setTimeout(() => {
                        dot.style.background = '#3b82f6';
                    }, 300);
                }
            }
            
            console.log('✅ Driver marker position updated to REAL coordinates');
        } else {
            // Create marker if it doesn't exist
            addDriverLocationMarker(coordinates);
        }
        
        // Update global variable with REAL coordinates
        currentUserLocation = coordinates;
        window.currentUserLocation = coordinates;
        
    } catch (error) {
        console.error('❌ Error updating driver location marker:', error);
        // Try to recreate the marker if update fails
        try {
            addDriverLocationMarker(coordinates);
        } catch (recreateError) {
            console.error('❌ Error recreating driver marker:', recreateError);
        }
    }
}

// FIXED: Enhanced driver map click handler for A/B pin placement
async function handleDriverMapClick(object, event) {
    console.log('🖱️ Driver map clicked for address selection:', event);
    
    if (!selectingPoint || !event.coordinates) {
        console.log('⚠️ Not selecting point or no coordinates available');
        return;
    }

    const coords = event.coordinates; // [longitude, latitude]
    console.log(`📌 Setting driver ${selectingPoint.toUpperCase()} point at REAL coordinates:`, coords);
    
    try {
        // Set point with REAL coordinates
        setDriverPoint(selectingPoint, coords);
        
        // Get address from Yandex Geocoding API
        const address = await getAddressFromCoordinates(coords);
        console.log(`✅ Address retrieved for driver ${selectingPoint}: ${address}`);
        
        // Fill the correct form field
        const inputId = selectingPoint === 'from' ? 'from_address' : 'to_address';
        const inputElement = document.getElementById(inputId);
        
        if (inputElement && address) {
            inputElement.value = address;
            inputElement.dispatchEvent(new Event('input'));
        }
        
        // CRITICAL: Update coordinate fields with REAL coordinates
        if (selectingPoint === 'from') {
            document.getElementById('from_lat').value = coords[1]; // latitude
            document.getElementById('from_lon').value = coords[0]; // longitude
        } else {
            document.getElementById('to_lat').value = coords[1]; // latitude
            document.getElementById('to_lon').value = coords[0]; // longitude
        }
        
        // Update route if both points exist
        setTimeout(() => {
            if (fromMarker && toMarker) {
                updateDriverRouteWithYandexAPI();
            }
        }, 500);
        
        // Close full-screen map if open
        if (isFullScreenMap) {
            closeFullScreenMap();
        }
        
        // Clear selection and update buttons
        selectingPoint = null;
        updateMapPickerButtons();
        
    } catch (error) {
        console.error('❌ Error handling driver map click:', error);
    }
}

// FIXED: Set driver point with CORRECT A/B marker positioning
function setDriverPoint(type, coordinates) {
    try {
        if (!mapInitialized || !driverMap || !window.ymaps3) {
            console.warn('⚠️ Map not ready for point setting');
            return;
        }
        
        console.log(`🎯 Creating driver ${type.toUpperCase()} marker at REAL coordinates:`, coordinates);
        const {YMapMarker} = ymaps3;
        
        if (type === 'from') {
            // Remove existing FROM marker
            if (fromMarker) {
                try {
                    driverMap.removeChild(fromMarker);
                } catch (e) {
                    console.warn('Warning removing from marker:', e);
                }
                fromMarker = null;
            }
            
            // Create FROM marker container with A pin
            const fromContainer = document.createElement('div');
            fromContainer.className = 'from-marker-container';
            fromContainer.style.cssText = `
                position: relative;
                width: 32px;
                height: 32px;
                z-index: 200;
            `;
            
            fromContainer.innerHTML = `
                <div class="from-marker" style="
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 18px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                    border: 3px solid white;
                    animation: markerBounce 0.6s ease-out;
                    position: absolute;
                    top: 0;
                    left: 0;
                    cursor: grab;
                ">А</div>
                <style>
                    @keyframes markerBounce {
                        0% { transform: scale(0) translateY(-20px); opacity: 0; }
                        50% { transform: scale(1.2) translateY(-10px); opacity: 1; }
                        100% { transform: scale(1) translateY(0); opacity: 1; }
                    }
                </style>
            `;
            
            fromMarker = new YMapMarker(
                {
                    coordinates: coordinates, // [longitude, latitude] - REAL coordinates
                    draggable: true
                },
                fromContainer
            );
            
            driverMap.addChild(fromMarker);
            window.fromMarker = fromMarker;
            console.log('✅ Driver FROM marker (А) created at REAL coordinates');
            
        } else if (type === 'to') {
            // Remove existing TO marker
            if (toMarker) {
                try {
                    driverMap.removeChild(toMarker);
                } catch (e) {
                    console.warn('Warning removing to marker:', e);
                }
                toMarker = null;
            }
            
            // Create TO marker container with B pin
            const toContainer = document.createElement('div');
            toContainer.className = 'to-marker-container';
            toContainer.style.cssText = `
                position: relative;
                width: 32px;
                height: 32px;
                z-index: 200;
            `;
            
            toContainer.innerHTML = `
                <div class="to-marker" style="
                    background: linear-gradient(135deg, #3b82f6, #1e40af);
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 18px;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                    border: 3px solid white;
                    animation: markerBounce 0.6s ease-out;
                    position: absolute;
                    top: 0;
                    left: 0;
                    cursor: grab;
                ">Б</div>
            `;
            
            toMarker = new YMapMarker(
                {
                    coordinates: coordinates, // [longitude, latitude] - REAL coordinates
                    draggable: true
                },
                toContainer
            );
            
            driverMap.addChild(toMarker);
            window.toMarker = toMarker;
            console.log('✅ Driver TO marker (Б) created at REAL coordinates');
        }
        
    } catch (error) {
        console.error('❌ Error setting driver point:', error);
    }
}

// Get address from coordinates using Yandex Geocoding API
async function getAddressFromCoordinates(coordinates) {
    try {
        const response = await fetch(
            `https://geocode-maps.yandex.ru/1.x/?apikey=8a3e4da0-9ef2-4176-9203-e7014c1dba6f&geocode=${coordinates[0]},${coordinates[1]}&format=json&results=1&lang=ru_RU`
        );
        
        if (!response.ok) {
            throw new Error('Geocoding API request failed');
        }
        
        const data = await response.json();
        const geoObjects = data.response?.GeoObjectCollection?.featureMember;
        
        if (geoObjects && geoObjects.length > 0) {
            const address = geoObjects[0].GeoObject.metaDataProperty.GeocoderMetaData.text;
            if (address) {
                return address;
            }
        }
        
        throw new Error('No address found');
        
    } catch (error) {
        console.error('❌ Driver geocoding error:', error);
        // Fallback to coordinates
        return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
    }
}

// FIXED: Open full-screen map for address selection
function openFullScreenMap(type) {
    console.log(`🖱️ Opening full-screen driver map for ${type.toUpperCase()} selection`);
    selectingPoint = type;
    isFullScreenMap = true;
    
    const mapContainer = document.getElementById('mapContainer');
    const mapControls = mapContainer.querySelector('.map-controls');
    
    // Add full-screen styles
    mapContainer.style.position = 'fixed';
    mapContainer.style.top = '0';
    mapContainer.style.left = '0';
    mapContainer.style.width = '100vw';
    mapContainer.style.height = '100vh';
    mapContainer.style.zIndex = '9999';
    mapContainer.style.borderRadius = '0';
    
    // Update map controls for full-screen
    if (mapControls) {
        mapControls.innerHTML = `
            <button class="map-control-btn close-fullscreen-btn" onclick="closeFullScreenMap()" title="Закрыть">
                ✕
            </button>
        `;
    }
    
    // Show selection instruction
    const instruction = document.createElement('div');
    instruction.className = 'selection-instruction';
    instruction.innerHTML = type === 'from' ? 
        '🟢 Выберите точку ОТКУДА (A)' : 
        '🔵 Выберите точку КУДА (Б)';
    mapContainer.appendChild(instruction);
    
    // Update map picker buttons
    updateMapPickerButtons();
    
    // Resize map to fit new container
    setTimeout(() => {
        if (driverMap && driverMap.container) {
            try {
                driverMap.container.fitToViewport();
            } catch (error) {
                console.warn('Map resize warning:', error);
            }
        }
    }, 300);
    
    // Center map on user location
    if (currentUserLocation && driverMap) {
        driverMap.setLocation({
            center: currentUserLocation,
            zoom: 15,
            duration: 500
        });
    }
}

// Close full-screen map
function closeFullScreenMap() {
    console.log('🖱️ Closing full-screen driver map');
    isFullScreenMap = false;
    selectingPoint = null;
    
    const mapContainer = document.getElementById('mapContainer');
    const mapControls = mapContainer.querySelector('.map-controls');
    
    // Remove full-screen styles
    mapContainer.style.position = '';
    mapContainer.style.top = '';
    mapContainer.style.left = '';
    mapContainer.style.width = '';
    mapContainer.style.height = '';
    mapContainer.style.zIndex = '';
    mapContainer.style.borderRadius = '';
    
    // Remove selection instruction
    const instruction = mapContainer.querySelector('.selection-instruction');
    if (instruction) {
        instruction.remove();
    }
    
    // Restore normal map controls
    if (mapControls) {
        mapControls.innerHTML = `
            <button class="map-control-btn toggle-size-btn" onclick="toggleMapSize()" title="Изменить размер карты">
                <span class="size-text">📍 БОЛЬШАЯ</span>
            </button>
        `;
    }
    
    // Update map picker buttons
    updateMapPickerButtons();
    
    // Resize map back to normal
    setTimeout(() => {
        if (driverMap && driverMap.container) {
            try {
                driverMap.container.fitToViewport();
            } catch (error) {
                console.warn('Map resize warning:', error);
            }
        }
    }, 300);
}

// Select point on map with enhanced interaction
function selectOnMap(type) {
    if (!mapInitialized) {
        console.warn('⚠️ Map not initialized, cannot select point');
        alert('Карта не загружена. Попробуйте позже.');
        return;
    }
    
    console.log(`🎯 Opening driver map for ${type.toUpperCase()} selection`);
    openFullScreenMap(type);
}

// Update map picker button appearance
function updateMapPickerButtons() {
    const fromBtn = document.querySelector('.from-map-btn');
    const toBtn = document.querySelector('.to-map-btn');
    
    // Reset all buttons
    document.querySelectorAll('.address-map-btn').forEach(btn => {
        btn.classList.remove('selecting');
        btn.style.background = '';
        btn.style.color = '';
    });
    
    // Highlight active selection
    if (selectingPoint === 'from' && fromBtn) {
        fromBtn.classList.add('selecting');
        fromBtn.style.background = '#ef4444';
        fromBtn.style.color = 'white';
    } else if (selectingPoint === 'to' && toBtn) {
        toBtn.classList.add('selecting');
        toBtn.style.background = '#ef4444';
        toBtn.style.color = 'white';
    }
}

// FIXED: Enhanced route calculation with REAL coordinates
async function updateDriverRouteWithYandexAPI() {
    if (!mapInitialized || !fromMarker || !toMarker) {
        console.log('⚠️ Missing driver markers or map not ready');
        return;
    }

    console.log('🛣️ Calculating driver route with REAL coordinates...');
    
    try {
        // Get REAL coordinates from form fields
        const fromCoords = [
            parseFloat(document.getElementById('from_lon').value), // longitude
            parseFloat(document.getElementById('from_lat').value)  // latitude
        ];
        const toCoords = [
            parseFloat(document.getElementById('to_lon').value),   // longitude
            parseFloat(document.getElementById('to_lat').value)    // latitude
        ];
        
        if (isNaN(fromCoords[0]) || isNaN(toCoords[0])) {
            console.warn('⚠️ Invalid driver coordinates');
            return;
        }
        
        console.log('🛣️ Route calculation using REAL coordinates:', fromCoords, 'to', toCoords);
        
        // Remove old route
        if (routeLine) {
            try {
                driverMap.removeChild(routeLine);
            } catch (e) {
                console.warn('Warning removing old route:', e);
            }
            routeLine = null;
        }
        
        // Try building route via Yandex router
        const {router, YMapFeature} = ymaps3;

        try {
            const result = await router({
                points: [fromCoords, toCoords],
                type: 'driving'
            });

            if (result && result.routes && result.routes.length > 0) {
                const geometry = result.routes[0].geometry;

                routeLine = new YMapFeature({
                    geometry: {
                        type: 'LineString',
                        coordinates: geometry.coordinates
                    },
                    style: {
                        stroke: [{
                            color: '#3b82f6',
                            width: 5,
                            opacity: 0.8
                        }],
                        zIndex: 50
                    }
                });

                driverMap.addChild(routeLine);

                const routeDistance = calculateRouteDistance(geometry.coordinates);
                displayDriverRouteDistance(routeDistance.toFixed(1));

                console.log('✅ Driver route calculated successfully with REAL coordinates');
                
                // Fit route in view if not in full-screen mode
                if (!isFullScreenMap) {
                    const bounds = calculateBounds(geometry.coordinates);
                    setTimeout(() => {
                        driverMap.setLocation({
                            bounds: bounds,
                            duration: 1000
                        });
                    }, 500);
                }
            } else {
                // Fallback to straight line
                drawSimpleDriverRoute(fromCoords, toCoords);
            }
        } catch (routeError) {
            console.error('Route calculation failed, using straight line:', routeError);
            drawSimpleDriverRoute(fromCoords, toCoords);
        }
        
    } catch (error) {
        console.error('❌ Driver route calculation error:', error);
    }
}

// Draw simple route line for driver
function drawSimpleDriverRoute(fromCoords, toCoords) {
    try {
        if (!mapInitialized || !driverMap) return;
        
        const {YMapFeature} = ymaps3;
        
        routeLine = new YMapFeature({
            geometry: {
                type: 'LineString',
                coordinates: [fromCoords, toCoords]
            },
            style: {
                stroke: [{
                    color: '#3b82f6',
                    width: 4,
                    opacity: 0.8
                }],
                zIndex: 50
            }
        });
        
        driverMap.addChild(routeLine);
        
        const distance = calculateStraightDistance(fromCoords, toCoords);
        displayDriverRouteDistance(distance.toFixed(1));
        
        // Fit route in view
        if (!isFullScreenMap) {
            const bounds = calculateBounds([fromCoords, toCoords]);
            setTimeout(() => {
                driverMap.setLocation({
                    bounds: bounds,
                    duration: 1000
                });
            }, 500);
        }
        
        console.log('✅ Driver simple route drawn with REAL coordinates');
        
    } catch (error) {
        console.error('❌ Error drawing driver route:', error);
    }
}

// Display route distance in UI
function displayDriverRouteDistance(distanceKm) {
    const routeInfo = document.getElementById('routeInfo');
    const routeDistance = document.getElementById('routeDistance');
    
    if (routeInfo && routeDistance) {
        routeDistance.textContent = `🛣️ ${distanceKm} км`;
        routeInfo.style.display = 'block';
    }
}

// Calculate straight line distance
function calculateStraightDistance(fromCoords, toCoords) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (toCoords[1] - fromCoords[1]) * Math.PI / 180;
    const dLon = (toCoords[0] - fromCoords[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(fromCoords[1] * Math.PI / 180) * Math.cos(toCoords[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calculate distance along a polyline
function calculateRouteDistance(coords) {
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
        total += calculateStraightDistance(coords[i - 1], coords[i]);
    }
    return total;
}

// Calculate bounds for coordinates
function calculateBounds(coordinates) {
    let minLon = coordinates[0][0];
    let maxLon = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];
    
    coordinates.forEach(coord => {
        minLon = Math.min(minLon, coord[0]);
        maxLon = Math.max(maxLon, coord[0]);
        minLat = Math.min(minLat, coord[1]);
        maxLat = Math.max(maxLat, coord[1]);
    });
    
    // Add padding
    const lonPadding = (maxLon - minLon) * 0.1;
    const latPadding = (maxLat - minLat) * 0.1;
    
    return [
        [minLon - lonPadding, minLat - latPadding],
        [maxLon + lonPadding, maxLat + latPadding]
    ];
}

// Toggle map size for driver
function toggleMapSize() {
    const mapContainer = document.getElementById('mapContainer');
    const toggleBtn = document.querySelector('.toggle-size-btn');
    const sizeText = toggleBtn.querySelector('.size-text');
    
    if (!mapContainer || !toggleBtn) return;
    
    if (mapContainer.classList.contains('expanded')) {
        mapContainer.classList.remove('expanded');
        sizeText.textContent = '📍 БОЛЬШАЯ';
    } else {
        mapContainer.classList.add('expanded');
        sizeText.textContent = '📍 МАЛЕНЬКАЯ';
    }
    
    // Resize map after animation
    setTimeout(() => {
        if (driverMap && driverMap.container) {
            try {
                driverMap.container.fitToViewport();
            } catch (error) {
                console.warn('Driver map resize warning:', error);
            }
        }
    }, 300);
}

// Clear driver route and markers
function clearDriverRoute() {
    try {
        if (routeLine && driverMap) {
            driverMap.removeChild(routeLine);
            routeLine = null;
        }
        
        if (fromMarker && driverMap) {
            driverMap.removeChild(fromMarker);
            fromMarker = null;
        }
        
        if (toMarker && driverMap) {
            driverMap.removeChild(toMarker);
            toMarker = null;
        }
        
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) {
            routeInfo.style.display = 'none';
        }
        
        console.log('🧹 Driver route and markers cleared');
    } catch (error) {
        console.error('❌ Error clearing driver route:', error);
    }
}

// Enhanced address suggestions with geocoding
function setupDriverAddressSuggestions(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const suggestionsId = fieldId + '_suggestions';
    let suggestTimeout;
    
    input.addEventListener('input', function(e) {
        clearTimeout(suggestTimeout);
        const query = e.target.value;
        
        if (query.length < 3) {
            const suggestions = document.getElementById(suggestionsId);
            if (suggestions) suggestions.style.display = 'none';
            return;
        }
        
        suggestTimeout = setTimeout(async () => {
            try {
                // Use Yandex Suggest API for better results
                const response = await fetch(
                    `https://suggest-maps.yandex.ru/v1/suggest?apikey=8a3e4da0-9ef2-4176-9203-e7014c1dba6f&text=${encodeURIComponent(query)}&results=5&lang=ru_RU`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.results) {
                        displayDriverSuggestions(fieldId, data.results);
                    }
                }
            } catch (error) {
                console.error('Driver suggestion error:', error);
            }
        }, 300);
    });
}

// Display address suggestions with enhanced functionality
function displayDriverSuggestions(field, items) {
    const container = document.getElementById(field + '_suggestions');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = item.title.text || item.subtitle?.text || 'Unknown';
        div.onclick = async function() {
            document.getElementById(field).value = div.textContent;
            container.style.display = 'none';
            
            // Auto-geocode the selected address
            try {
                const response = await fetch(
                    `https://geocode-maps.yandex.ru/1.x/?apikey=8a3e4da0-9ef2-4176-9203-e7014c1dba6f&geocode=${encodeURIComponent(div.textContent)}&format=json&results=1`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    const geoObjects = data.response?.GeoObjectCollection?.featureMember;
                    
                    if (geoObjects && geoObjects.length > 0) {
                        const coordsString = geoObjects[0].GeoObject.Point.pos;
                        const coords = coordsString.split(' ').map(parseFloat); // [lon, lat]
                        
                        const type = field.includes('from') ? 'from' : 'to';
                        setDriverPoint(type, coords);
                        
                        // Update coordinate fields
                        if (type === 'from') {
                            document.getElementById('from_lat').value = coords[1];
                            document.getElementById('from_lon').value = coords[0];
                        } else {
                            document.getElementById('to_lat').value = coords[1];
                            document.getElementById('to_lon').value = coords[0];
                        }
                        
                        // Update route if both points exist
                        setTimeout(() => {
                            if (fromMarker && toMarker) {
                                updateDriverRouteWithYandexAPI();
                            }
                        }, 200);
                    }
                }
            } catch (error) {
                console.error('Geocoding error:', error);
            }
        };
        container.appendChild(div);
    });
    
    container.style.display = 'block';
}

// Make functions globally available
window.initializeDriverMap = initializeDriverMap;
window.updateDriverLocationMarker = updateDriverLocationMarker;
window.selectOnMap = selectOnMap;
window.toggleMapSize = toggleMapSize;
window.closeFullScreenMap = closeFullScreenMap;
window.setupDriverAddressSuggestions = setupDriverAddressSuggestions;
window.clearDriverRoute = clearDriverRoute;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🗺️ COMPLETE Driver Map Service loaded, waiting for initialization...');
    
    // Wait for ymaps3 script to load
    let attempts = 0;
    const maxAttempts = 30; // Increased attempts
    
    const checkYmaps = () => {
        attempts++;
        if (window.ymaps3) {
            console.log('✅ ymaps3 detected, initializing driver map with REAL coordinates...');
            setTimeout(initializeDriverMap, 800);
        } else if (attempts < maxAttempts) {
            setTimeout(checkYmaps, 500);
        } else {
            console.error('❌ ymaps3 failed to load after maximum attempts');
            showMapError('Не удалось загрузить Yandex Maps API');
        }
    };
    
    checkYmaps();
});

console.log('🗺️ COMPLETE FIXED Driver Map Service script loaded - supports REAL coordinates and interactive A/B pins');
