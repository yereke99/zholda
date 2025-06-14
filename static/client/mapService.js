// Fixed Map Service with CORRECT marker positioning and real-time GPS
let map;
let fromMarker, toMarker, userLocationMarker;
let routeLine;
let selectingPoint = null;
let currentUserLocation = null;
let isFullScreenMap = false;

// Initialize map with user location
async function initializeMap() {
    try {
        console.log('🗺️ Initializing Yandex Maps 3.0...');
        await ymaps3.ready;
        
        const {YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapListener} = ymaps3;
        
        // Get current location from location service (lon, lat format for Yandex)
        currentUserLocation = window.currentUserLocation || locationService?.getCurrentLocation() || [76.889709, 43.238949];
        console.log('📍 Using location for map:', currentUserLocation);
        
        // Initialize map with proper center
        map = new YMap(
            document.getElementById('clientMap'),
            {
                location: {
                    center: currentUserLocation, // [longitude, latitude]
                    zoom: 14
                },
                theme: 'light'
            }
        );

        // Add map layers
        map.addChild(new YMapDefaultSchemeLayer({ theme: 'light' }));
        map.addChild(new YMapDefaultFeaturesLayer());

        // Add user location marker with FIXED positioning
        addUserLocationMarker(currentUserLocation);

        // Add click listener for address selection
        const mapListener = new YMapListener({
            layer: 'any',
            onClick: handleMapClick
        });
        map.addChild(mapListener);

        // Make map globally available
        window.map = map;
        window.userLocationMarker = userLocationMarker;

        console.log('✅ Yandex Maps 3.0 initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing Yandex Maps 3.0:', error);
        if (window.locationService) {
            locationService.updateLocationStatus('error', 'Ошибка загрузки карты');
        }
    }
}

// FIXED: Add user location marker with CORRECT positioning and animation
function addUserLocationMarker(coordinates) {
    try {
        console.log('👤 Creating user location marker at:', coordinates);
        
        if (!userLocationMarker) {
            const {YMapMarker} = ymaps3;
            
            // Create user location element with pulsing animation
            const userLocationElement = document.createElement('div');
            userLocationElement.className = 'user-location-marker-container';
            userLocationElement.style.cssText = `
                width: 20px;
                height: 20px;
                position: relative;
                z-index: 1000;
            `;
            
            userLocationElement.innerHTML = `
                <div class="user-location-dot" style="
                    width: 16px; 
                    height: 16px; 
                    background: #3b82f6; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    z-index: 2;
                "></div>
                <div class="user-location-pulse" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 20px;
                    height: 20px;
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

            userLocationMarker = new YMapMarker(
                {
                    coordinates: coordinates, // [longitude, latitude]
                    draggable: false
                },
                userLocationElement
            );

            if (map) {
                map.addChild(userLocationMarker);
                console.log('✅ User location marker added to map');
            }
            
            window.userLocationMarker = userLocationMarker;
        }
        
    } catch (error) {
        console.error('❌ Error adding user location marker:', error);
    }
}

// FIXED: Update user location marker position with smooth animation
function updateUserLocationMarker(coordinates) {
    try {
        console.log('📍 Updating user marker to:', coordinates);
        
        if (userLocationMarker && map) {
            // Update marker position smoothly
            userLocationMarker.update({
                coordinates: coordinates // [longitude, latitude]
            });
            
            // Add visual feedback for movement
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
            
            console.log('✅ User marker position updated');
        } else if (!userLocationMarker) {
            // Create marker if it doesn't exist
            addUserLocationMarker(coordinates);
        }
        
        // Update global variable
        currentUserLocation = coordinates;
        window.currentUserLocation = coordinates;
        
    } catch (error) {
        console.error('❌ Error updating user location marker:', error);
        // Try to recreate the marker if update fails
        try {
            if (userLocationMarker && map) {
                map.removeChild(userLocationMarker);
            }
            userLocationMarker = null;
            addUserLocationMarker(coordinates);
        } catch (recreateError) {
            console.error('❌ Error recreating user marker:', recreateError);
        }
    }
}

// Enhanced map click handler with CORRECT coordinate handling
async function handleMapClick(object, event) {
    console.log('🖱️ Map clicked:', event);
    
    if (!selectingPoint || !event.coordinates) {
        console.log('⚠️ Not selecting point or no coordinates');
        return;
    }

    const coords = event.coordinates; // [longitude, latitude]
    console.log(`📌 Setting ${selectingPoint.toUpperCase()} point at:`, coords);
    
    // Set point with correct coordinates
    setPoint(selectingPoint, coords);
    
    // Get address from Yandex Geocoding API
    try {
        const address = await getAddressFromCoordinates(coords);
        console.log(`✅ Address retrieved for ${selectingPoint}: ${address}`);
        
        // Fill the correct form field
        const inputId = selectingPoint === 'from' ? 'from_address' : 'to_address';
        const inputElement = document.getElementById(inputId);
        
        if (inputElement && address) {
            inputElement.value = address;
            inputElement.dispatchEvent(new Event('input'));
            console.log(`📝 Filled ${inputId} with: ${address}`);
        }
        
        // Update coordinate fields with CORRECT lat/lon
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
                updateRouteWithYandexAPI();
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
        console.error('❌ Error getting address:', error);
        // Fallback to coordinates if address fails
        const fallbackAddress = `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`;
        const inputId = selectingPoint === 'from' ? 'from_address' : 'to_address';
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.value = fallbackAddress;
        }
    }
}

// FIXED: Set point with CORRECT marker positioning (A and B markers)
function setPoint(type, coordinates) {
    try {
        console.log(`🎯 Creating ${type.toUpperCase()} marker at:`, coordinates);
        const {YMapMarker} = ymaps3;
        
        if (type === 'from') {
            // Remove existing FROM marker
            if (fromMarker && map) {
                map.removeChild(fromMarker);
                fromMarker = null;
            }
            
            // Create FROM marker container
            const fromContainer = document.createElement('div');
            fromContainer.className = 'from-marker-container';
            fromContainer.style.cssText = `
                position: relative;
                width: 30px;
                height: 30px;
                z-index: 200;
            `;
            
            // Create FROM marker (green A)
            fromContainer.innerHTML = `
                <div class="from-marker" style="
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 16px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                    border: 3px solid white;
                    animation: markerBounce 0.6s ease-out;
                    position: absolute;
                    top: 0;
                    left: 0;
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
                    coordinates: coordinates, // [longitude, latitude]
                    draggable: true
                },
                fromContainer
            );
            
            map.addChild(fromMarker);
            console.log('✅ FROM marker (А) created');
            
        } else if (type === 'to') {
            // Remove existing TO marker
            if (toMarker && map) {
                map.removeChild(toMarker);
                toMarker = null;
            }
            
            // Create TO marker container
            const toContainer = document.createElement('div');
            toContainer.className = 'to-marker-container';
            toContainer.style.cssText = `
                position: relative;
                width: 30px;
                height: 30px;
                z-index: 200;
            `;
            
            // Create TO marker (blue B)
            toContainer.innerHTML = `
                <div class="to-marker" style="
                    background: linear-gradient(135deg, #3b82f6, #1e40af);
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 16px;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                    border: 3px solid white;
                    animation: markerBounce 0.6s ease-out;
                    position: absolute;
                    top: 0;
                    left: 0;
                ">Б</div>
            `;
            
            toMarker = new YMapMarker(
                {
                    coordinates: coordinates, // [longitude, latitude]
                    draggable: true
                },
                toContainer
            );
            
            map.addChild(toMarker);
            console.log('✅ TO marker (Б) created');
        }
        
        // Make markers globally available
        window.fromMarker = fromMarker;
        window.toMarker = toMarker;
        
    } catch (error) {
        console.error('❌ Error setting point:', error);
    }
}

// Get address from coordinates using Yandex Geocoding API
async function getAddressFromCoordinates(coordinates) {
    try {
        // Yandex Geocoding API expects longitude,latitude format
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
        console.error('❌ Geocoding error:', error);
        // Fallback to coordinates
        return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
    }
}

// Open full-screen map for address selection
function openFullScreenMap(type) {
    console.log(`🖱️ Opening full-screen map for ${type.toUpperCase()} selection`);
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
        if (map && map.container) {
            try {
                map.container.fitToViewport();
            } catch (error) {
                console.warn('Map resize warning:', error);
            }
        }
    }, 300);
    
    // Center map on user location
    if (currentUserLocation && map) {
        map.setLocation({
            center: currentUserLocation,
            zoom: 14,
            duration: 500
        });
    }
}

// Close full-screen map
function closeFullScreenMap() {
    console.log('🖱️ Closing full-screen map');
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
        if (map && map.container) {
            try {
                map.container.fitToViewport();
            } catch (error) {
                console.warn('Map resize warning:', error);
            }
        }
    }, 300);
}

// Select point on map with full-screen option
function selectOnMap(type) {
    console.log(`🎯 Opening full-screen map for ${type.toUpperCase()} selection`);
    openFullScreenMap(type);
}

// Update map picker button appearance
function updateMapPickerButtons() {
    const fromBtn = document.querySelector('.from-map-btn');
    const toBtn = document.querySelector('.to-map-btn');
    
    // Reset all buttons
    document.querySelectorAll('.address-map-btn').forEach(btn => {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.transform = '';
        btn.classList.remove('selecting');
    });
    
    // Highlight active selection
    if (selectingPoint === 'from' && fromBtn) {
        fromBtn.style.background = '#ef4444';
        fromBtn.style.color = 'white';
        fromBtn.classList.add('selecting');
    } else if (selectingPoint === 'to' && toBtn) {
        toBtn.style.background = '#ef4444';
        toBtn.style.color = 'white';
        toBtn.classList.add('selecting');
    }
}

// Enhanced route calculation
async function updateRouteWithYandexAPI() {
    console.log('🛣️ Calculating route...');
    
    if (!fromMarker || !toMarker) {
        console.log('⚠️ Missing markers');
        return;
    }

    try {
        // Get coordinates from form fields
        const fromCoords = [
            parseFloat(document.getElementById('from_lon').value), // longitude
            parseFloat(document.getElementById('from_lat').value)  // latitude
        ];
        const toCoords = [
            parseFloat(document.getElementById('to_lon').value),   // longitude
            parseFloat(document.getElementById('to_lat').value)    // latitude
        ];
        
        if (isNaN(fromCoords[0]) || isNaN(toCoords[0])) {
            console.warn('⚠️ Invalid coordinates');
            return;
        }
        
        // Draw simple route line
        drawSimpleRoute(fromCoords, toCoords);
        
        // Calculate distance
        const distance = calculateStraightDistance(fromCoords, toCoords);
        displayRouteDistance(distance.toFixed(1));
        
    } catch (error) {
        console.error('❌ Route calculation error:', error);
    }
}

// Draw simple route line
function drawSimpleRoute(fromCoords, toCoords) {
    try {
        // Remove old route
        if (routeLine && map) {
            map.removeChild(routeLine);
            routeLine = null;
        }
        
        const {YMapFeature} = ymaps3;
        
        // Create route line
        routeLine = new YMapFeature({
            geometry: {
                type: 'LineString',
                coordinates: [fromCoords, toCoords]
            },
            style: {
                stroke: [{
                    color: '#10b981',
                    width: 4,
                    opacity: 0.8
                }],
                zIndex: 50
            }
        });
        
        map.addChild(routeLine);
        
        // Fit map to show both points
        if (!isFullScreenMap && map.setLocation) {
            const bounds = calculateBounds([fromCoords, toCoords]);
            setTimeout(() => {
                map.setLocation({
                    bounds: bounds,
                    duration: 1000
                });
            }, 500);
        }
        
        console.log('✅ Route line drawn');
        
    } catch (error) {
        console.error('❌ Error drawing route:', error);
    }
}

// Display route distance in UI
function displayRouteDistance(distanceKm) {
    const routeInfo = document.getElementById('routeInfo');
    const routeDistance = document.getElementById('routeDistance');
    
    if (routeInfo && routeDistance) {
        routeDistance.textContent = `🛣️ ${distanceKm} км`;
        routeInfo.style.display = 'block';
    }
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

// Toggle map size
function toggleMapSize() {
    const mapContainer = document.getElementById('mapContainer');
    const toggleBtn = document.querySelector('.toggle-size-btn');
    const sizeText = toggleBtn.querySelector('.size-text');
    
    if (!mapContainer || !toggleBtn) return;
    
    if (mapContainer.classList.contains('expanded')) {
        // Shrink map
        mapContainer.classList.remove('expanded');
        sizeText.textContent = '📍 БОЛЬШАЯ';
        toggleBtn.title = 'Увеличить карту';
    } else {
        // Expand map
        mapContainer.classList.add('expanded');
        sizeText.textContent = '📍 МАЛЕНЬКАЯ';
        toggleBtn.title = 'Уменьшить карту';
    }
    
    // Resize map after animation
    setTimeout(() => {
        if (map && map.container) {
            try {
                map.container.fitToViewport();
            } catch (error) {
                console.warn('Map resize warning:', error);
            }
        }
    }, 300);
}

// Address suggestions
let suggestTimeout;

function setupAddressSuggestions(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const suggestionsId = fieldId + '_suggestions';
    
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
                if (!window.ymaps3 || !ymaps3.search) {
                    console.warn('Yandex search not available');
                    return;
                }
                
                const results = await ymaps3.search({
                    text: query,
                    bounds: [[46.99, 41.15], [87.31, 55.44]], // Kazakhstan bounds
                    results: 10
                });
                
                if (results && results.length > 0) {
                    displaySuggestions(fieldId, results.slice(0, 5));
                }
            } catch (error) {
                console.error('Suggestion error:', error);
            }
        }, 300);
    });
}

// Display address suggestions
function displaySuggestions(field, items) {
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
        div.textContent = item.properties.name || item.properties.description;
        div.onclick = function() {
            document.getElementById(field).value = item.properties.name || item.properties.description;
            container.style.display = 'none';
            
            if (item.geometry && item.geometry.coordinates) {
                const coordinates = item.geometry.coordinates;
                const type = field.includes('from') ? 'from' : 'to';
                setPoint(type, coordinates);
                
                if (type === 'from') {
                    document.getElementById('from_lat').value = coordinates[1];
                    document.getElementById('from_lon').value = coordinates[0];
                } else {
                    document.getElementById('to_lat').value = coordinates[1];
                    document.getElementById('to_lon').value = coordinates[0];
                }
                
                setTimeout(() => {
                    if (fromMarker && toMarker) {
                        updateRouteWithYandexAPI();
                    }
                }, 200);
            }
        };
        container.appendChild(div);
    });
    
    container.style.display = 'block';
}

// Clear route
function clearRoute() {
    if (routeLine && map) {
        map.removeChild(routeLine);
        routeLine = null;
    }
    
    if (fromMarker && map) {
        map.removeChild(fromMarker);
        fromMarker = null;
    }
    
    if (toMarker && map) {
        map.removeChild(toMarker);
        toMarker = null;
    }
    
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
        routeInfo.style.display = 'none';
    }
    
    console.log('🧹 Route and markers cleared');
}

// Make functions globally available
window.initializeMap = initializeMap;
window.updateUserLocationMarker = updateUserLocationMarker;
window.selectOnMap = selectOnMap;
window.toggleMapSize = toggleMapSize;
window.closeFullScreenMap = closeFullScreenMap;
window.setupAddressSuggestions = setupAddressSuggestions;
window.clearRoute = clearRoute;