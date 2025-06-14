// Client requests management and display service for drivers
class DriverClientService {
    constructor() {
        this.detailMap = null;
        this.translations = {
            ru: {
                noRequests: 'Нет доступных заявок',
                loading: 'Загрузка...',
                error: 'Ошибка',
                requestDetails: 'Детали заявки',
                from: 'Откуда',
                to: 'Куда',
                price: 'Цена',
                truckType: 'Тип транспорта',
                clientComment: 'Комментарий клиента',
                clientPhoto: 'Фото груза',
                contact: 'Контакт',
                call: 'Позвонить',
                whatsapp: 'WhatsApp',
                telegram: 'Telegram',
                createdAt: 'Создано',
                small: 'Малый',
                medium: 'Средний',
                large: 'Большой',
                refrigerator: 'Рефрижератор',
                tow: 'Эвакуатор'
            },
            kz: {
                noRequests: 'Қол жетімді өтінімдер жоқ',
                loading: 'Жүктелуде...',
                error: 'Қате',
                requestDetails: 'Өтінім мәліметтері',
                from: 'Қайдан',
                to: 'Қайда',
                price: 'Бағасы',
                truckType: 'Көлік түрі',
                clientComment: 'Клиент түсініктемесі',
                clientPhoto: 'Жүк фотосы',
                contact: 'Байланыс',
                call: 'Қоңырау шалу',
                whatsapp: 'WhatsApp',
                telegram: 'Telegram',
                createdAt: 'Жасалды',
                small: 'Кіші',
                medium: 'Орта',
                large: 'Үлкен',
                refrigerator: 'Рефрижератор',
                tow: 'Эвакуатор'
            }
        };
    }

    // Load client requests based on driver's route and location
    async loadClientRequests() {
        const container = document.getElementById('clientRequests');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏳</div>
                <div class="empty-text">${this.translations[window.currentLang || 'ru'].loading}</div>
            </div>`;

        try {
            // Get current driver's telegram ID
            const telegramId = document.getElementById('telegram_id').value;
            if (!telegramId) {
                throw new Error('Telegram ID not found');
            }

            // Build search parameters based on available data
            let searchParams = new URLSearchParams({
                telegram_id: telegramId
            });

            // Priority 1: Use current geolocation if available
            if (window.currentUserLocation && window.driverLocationService?.isLocationPermissionGranted()) {
                searchParams.append('search_type', 'geolocation');
                searchParams.append('driver_lat', window.currentUserLocation[1]); // latitude
                searchParams.append('driver_lon', window.currentUserLocation[0]); // longitude
                searchParams.append('radius', '50'); // 50km radius
                console.log("Using geolocation search for client requests");
            } 
            // Priority 2: Use route search if form data is available
            else if (document.getElementById('from_address').value && document.getElementById('to_address').value) {
                searchParams.append('search_type', 'route');
                searchParams.append('from_city', document.getElementById('from_address').value);
                searchParams.append('to_city', document.getElementById('to_address').value);
                console.log("Using route search for client requests");
            }
            // Priority 3: Fallback to driver's registered location (handled by backend)
            else {
                searchParams.append('search_type', 'fallback');
                console.log("Using fallback search for client requests");
            }

            const response = await fetch('/api/driver/search?' + searchParams.toString());

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Client Requests Search API Response:', data);

            if (data.success && data.requests && data.requests.length > 0) {
                this.displayClientRequests(data.requests);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">${this.translations[window.currentLang || 'ru'].noRequests}</div>
                        <div style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted);">
                            Search type: ${data.search_type || 'unknown'}
                        </div>
                    </div>`;
            }
        } catch (error) {
            console.error('❌ Error loading client requests:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❌</div>
                    <div class="empty-text">
                        ${this.translations[window.currentLang || 'ru'].error}: ${error.message}
                    </div>
                </div>`;
        }
    }

    // Display client requests with enhanced UI
    displayClientRequests(requests) {
        const container = document.getElementById('clientRequests');
        container.innerHTML = '';

        if (!requests || requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div class="empty-text">${this.translations[window.currentLang || 'ru'].noRequests}</div>
                </div>`;
            return;
        }

        requests.forEach(request => {
            const card = document.createElement('div');
            card.className = 'request-card';
            card.onclick = () => this.showRequestDetail(request);

            const truckTypes = {
                'small': { icon: '🚐', name: this.translations[window.currentLang || 'ru'].small },
                'medium': { icon: '🚚', name: this.translations[window.currentLang || 'ru'].medium },
                'large': { icon: '🚛', name: this.translations[window.currentLang || 'ru'].large },
                'refrigerator': { icon: '❄️', name: this.translations[window.currentLang || 'ru'].refrigerator },
                'tow': { icon: '🚗', name: this.translations[window.currentLang || 'ru'].tow }
            };

            // Handle different possible field names from API
            const fromAddress = request.from_address || request.fromAddress || 'Не указано';
            const toAddress = request.to_address || request.toAddress || 'Не указано';
            const price = request.price || 0;
            const createdAt = request.created_at || request.createdAt || new Date();
            const photoPath = request.photo_path || request.photoPath;
            const truckType = request.truck_type || request.truckType || 'medium';
            
            const truck = truckTypes[truckType] || truckTypes.medium;

            // Create photo section
            let photoSection = '';
            if (photoPath) {
                photoSection = `
                    <div class="request-photo">
                        <img src="/files/${photoPath}" 
                            alt="Client item photo" 
                            class="request-item-photo"
                            onerror="this.parentElement.style.display='none'">
                    </div>`;
            }

            card.innerHTML = `
                <div class="request-header">
                    <div class="truck-type-badge">
                        <span>${truck.icon}</span>
                        <span>${truck.name}</span>
                    </div>
                    <div class="request-price">${price} ₸</div>
                </div>
                
                ${photoSection}
                
                <div class="request-route">
                    <div class="location from">📍 ${fromAddress}</div>
                    <div class="route-arrow">→</div>
                    <div class="location to">🎯 ${toAddress}</div>
                </div>
                
                <div class="request-details">
                    <div class="request-detail">
                        <span>📅</span>
                        <span>${new Date(createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="request-detail">
                        <span>📱</span>
                        <span>${request.contact || 'Не указан'}</span>
                    </div>
                    ${request.comment ? `
                        <div class="request-detail">
                            <span>💬</span>
                            <span>${request.comment.substring(0, 50)}${request.comment.length > 50 ? '...' : ''}</span>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(card);
        });
    }

    // Show request detail modal with enhanced features
    async showRequestDetail(request) {
        const modal = document.getElementById('requestModal');
        const content = document.getElementById('modalContent');

        // Handle different possible field names from API
        const fromAddress = request.from_address || request.fromAddress || 'Не указано';
        const toAddress = request.to_address || request.toAddress || 'Не указано';
        const fromLat = request.from_lat || request.fromLat || 43.238949;
        const fromLon = request.from_lon || request.fromLon || 76.889709;
        const toLat = request.to_lat || request.toLat || 43.238949;
        const toLon = request.to_lon || request.toLon || 76.889709;
        const price = request.price || 0;
        const contact = request.contact || 'Не указан';
        const photoPath = request.photo_path || request.photoPath;
        const truckType = request.truck_type || request.truckType || 'medium';

        const truckTypes = {
            'small': this.translations[window.currentLang || 'ru'].small,
            'medium': this.translations[window.currentLang || 'ru'].medium,
            'large': this.translations[window.currentLang || 'ru'].large,
            'refrigerator': this.translations[window.currentLang || 'ru'].refrigerator,
            'tow': this.translations[window.currentLang || 'ru'].tow
        };

        // Create photo section for modal
        let photoSection = '';
        if (photoPath) {
            photoSection = `
                <div class="detail-section">
                    <div class="detail-label">${this.translations[window.currentLang || 'ru'].clientPhoto}</div>
                    <div class="modal-photo-container">
                        <img src="/files/${photoPath}" 
                            alt="Client item photo" 
                            class="modal-item-photo"
                            onclick="showFullSizePhoto('/files/${photoPath}')"
                            onerror="this.parentElement.parentElement.style.display='none'">
                    </div>
                </div>
            `;
        }

        content.innerHTML = `
            <div id="detailMap"></div>
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[window.currentLang || 'ru'].from}</div>
                <div class="detail-value">📍 ${fromAddress}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[window.currentLang || 'ru'].to}</div>
                <div class="detail-value">🎯 ${toAddress}</div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[window.currentLang || 'ru'].price}</div>
                <div class="detail-value" style="font-size: 1.8rem; color: var(--accent-primary); font-weight: 700;">
                    ${price} ₸
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[window.currentLang || 'ru'].truckType}</div>
                <div class="detail-value">${truckTypes[truckType] || truckTypes.medium}</div>
            </div>
            
            ${request.comment ? `
                <div class="detail-section">
                    <div class="detail-label">${this.translations[window.currentLang || 'ru'].clientComment}</div>
                    <div class="detail-value">${request.comment}</div>
                </div>
            ` : ''}
            
            ${photoSection}
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[window.currentLang || 'ru'].contact}</div>
                <div class="detail-value" style="font-size: 1.2rem; font-weight: 600;">${contact}</div>
            </div>
            
            <div class="contact-buttons">
                <button class="contact-btn call-btn" onclick="window.open('tel:${contact}')">
                    <span>📞</span>
                    <span>${this.translations[window.currentLang || 'ru'].call}</span>
                </button>
                <button class="contact-btn whatsapp-btn" onclick="window.open('https://wa.me/${contact.replace(/\D/g, '')}')">
                    <span>💬</span>
                    <span>${this.translations[window.currentLang || 'ru'].whatsapp}</span>
                </button>
                <button class="contact-btn telegram-btn" onclick="window.open('https://t.me/${contact.replace(/\D/g, '')}')">
                    <span>✈️</span>
                    <span>${this.translations[window.currentLang || 'ru'].telegram}</span>
                </button>
            </div>
        `;

        modal.style.display = 'block';

        // Initialize detail map with Yandex Maps 3.0
        setTimeout(async () => {
            try {
                await ymaps3.ready;
                const {YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapFeature} = ymaps3;

                this.detailMap = new YMap(
                    document.getElementById('detailMap'),
                    {
                        location: {
                            center: [fromLon, fromLat],
                            zoom: 12
                        },
                        theme: 'light'
                    }
                );

                this.detailMap.addChild(new YMapDefaultSchemeLayer({ theme: 'light' }));
                this.detailMap.addChild(new YMapDefaultFeaturesLayer());

                // Add FROM marker
                const fromElement = document.createElement('div');
                fromElement.innerHTML = `
                    <div style="
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
                    ">А</div>
                `;

                const fromMarker = new YMapMarker(
                    { coordinates: [fromLon, fromLat] },
                    fromElement
                );

                // Add TO marker
                const toElement = document.createElement('div');
                toElement.innerHTML = `
                    <div style="
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
                    ">Б</div>
                `;

                const toMarker = new YMapMarker(
                    { coordinates: [toLon, toLat] },
                    toElement
                );

                this.detailMap.addChild(fromMarker);
                this.detailMap.addChild(toMarker);

                // Draw route using Yandex API v3
                try {
                    const {router} = ymaps3;
                    const route = await router({
                        points: [[fromLon, fromLat], [toLon, toLat]],
                        type: 'driving'
                    });

                    if (route && route.routes && route.routes.length > 0) {
                        const routeGeometry = route.routes[0].geometry;

                        const routeFeature = new YMapFeature({
                            geometry: {
                                type: 'LineString',
                                coordinates: routeGeometry.coordinates
                            },
                            style: {
                                stroke: [{
                                    color: '#3b82f6',
                                    width: 5,
                                    opacity: 0.8
                                }]
                            }
                        });

                        this.detailMap.addChild(routeFeature);

                        // Fit route in view
                        const bounds = this.calculateBounds([[fromLon, fromLat], [toLon, toLat]]);
                        this.detailMap.setLocation({
                            bounds: bounds,
                            duration: 1000
                        });
                    }
                } catch (routeError) {
                    console.error('Route error:', routeError);
                    // If route fails, just fit both points
                    const bounds = this.calculateBounds([[fromLon, fromLat], [toLon, toLat]]);
                    this.detailMap.setLocation({
                        bounds: bounds,
                        duration: 1000
                    });
                }
            } catch (error) {
                console.error('❌ Detail map error:', error);
            }
        }, 100);
    }

    // Calculate bounds for coordinates
    calculateBounds(coordinates) {
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

        return [
            [minLon, minLat],
            [maxLon, maxLat]
        ];
    }

    // Close modal
    closeModal() {
        document.getElementById('requestModal').style.display = 'none';
        if (this.detailMap) {
            this.detailMap.destroy();
            this.detailMap = null;
        }
    }

    // Show full size photo
    showFullSizePhoto(photoUrl) {
        // Create full-size photo modal
        const fullSizeModal = document.createElement('div');
        fullSizeModal.id = 'fullSizePhotoModal';
        fullSizeModal.className = 'full-size-photo-modal';
        fullSizeModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        `;
        
        fullSizeModal.innerHTML = `
            <div class="full-size-photo-content" style="
                position: relative;
                max-width: 95vw;
                max-height: 95vh;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <button class="full-size-close-btn" onclick="closeFullSizePhoto()" style="
                    position: absolute;
                    top: -15px;
                    right: -15px;
                    background: rgba(255, 255, 255, 0.9);
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #333;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-md);
                    z-index: 3001;
                ">&times;</button>
                <img src="${photoUrl}" alt="Full size photo" style="
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    border-radius: 12px;
                    box-shadow: var(--shadow-xl);
                    animation: slideIn 0.3s ease;
                ">
            </div>
        `;

        document.body.appendChild(fullSizeModal);

        // Close on click outside
        fullSizeModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeFullSizePhoto();
            }
        });
    }

    // Close full size photo modal
    closeFullSizePhoto() {
        const modal = document.getElementById('fullSizePhotoModal');
        if (modal) {
            modal.remove();
        }
    }
}

// Create global client service instance
const driverClientService = new DriverClientService();

// Make functions available globally
window.closeModal = () => driverClientService.closeModal();
window.showFullSizePhoto = (url) => driverClientService.showFullSizePhoto(url);
window.closeFullSizePhoto = () => driverClientService.closeFullSizePhoto();
window.driverClientService = driverClientService;

// Close modal on click outside
document.getElementById('requestModal').addEventListener('click', function(e) {
    if (e.target === this) {
        driverClientService.closeModal();
    }
});