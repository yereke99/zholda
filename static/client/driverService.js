// Driver management and display service
class DriverService {
    constructor() {
        this.detailMap = null;
        this.translations = {
            ru: {
                noDrivers: 'Нет доступных водителей',
                loading: 'Загрузка...',
                error: 'Ошибка',
                driverInfo: 'Информация о водителе',
                from: 'Откуда',
                to: 'Куда',
                price: 'Цена',
                departureTime: 'Время отправления',
                driverComment: 'Комментарий водителя',
                truckPhoto: 'Фото транспорта',
                contact: 'Контакт',
                call: 'Позвонить'
            },
            kz: {
                noDrivers: 'Қол жетімді жүргізушілер жоқ',
                loading: 'Жүктелуде...',
                error: 'Қате',
                driverInfo: 'Жүргізуші туралы ақпарат',
                from: 'Қайдан',
                to: 'Қайда',
                price: 'Бағасы',
                departureTime: 'Жөнелу уақыты',
                driverComment: 'Жүргізуші түсініктемесі',
                truckPhoto: 'Көлік фотосы',
                contact: 'Байланыс',
                call: 'Қоңырау шалу'
            }
        };
    }

    // Load drivers based on route
    async loadDrivers() {
        const container = document.getElementById('driversList');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏳</div>
                <div class="empty-text">${this.translations[currentLang].loading}</div>
            </div>`;

        try {
            const response = await fetch(
                '/api/driver/matching?' +
                new URLSearchParams({
                    from_lat: document.getElementById('from_lat').value,
                    from_lon: document.getElementById('from_lon').value,
                    to_lat: document.getElementById('to_lat').value,
                    to_lon: document.getElementById('to_lon').value,
                })
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.drivers && data.drivers.length > 0) {
                this.displayDrivers(data.drivers);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">❌</div>
                        <div class="empty-text">${this.translations[currentLang].noDrivers}</div>
                    </div>`;
            }
        } catch (error) {
            console.error('Error loading drivers:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❌</div>
                    <div class="empty-text">
                        ${this.translations[currentLang].error}: ${error.message}
                    </div>
                </div>`;
        }
    }

    // Display drivers list
    displayDrivers(drivers) {
        const container = document.getElementById('driversList');
        container.innerHTML = '';

        drivers.forEach(driver => {
            const card = document.createElement('div');
            card.className = 'driver-card';
            card.onclick = () => this.showDriverDetail(driver);

            card.innerHTML = `
                <img src="/files/${driver.profile_photo}" 
                     alt="${driver.full_name}" 
                     class="driver-avatar"
                     onerror="this.style.display='none'">
                <div class="driver-info">
                    <div class="driver-name">${driver.full_name}</div>
                    <div class="driver-route">
                        <span>📍 ${driver.from_address.substring(0, 20)}...</span>
                        <span>→</span>
                        <span>🎯 ${driver.to_address.substring(0, 20)}...</span>
                    </div>
                    ${
                        driver.comment
                            ? `<div style="color: var(--text-muted); font-size: 0.75rem;">
                                 💬 ${driver.comment.substring(0, 30)}...
                               </div>`
                            : ``
                    }
                </div>
                <div class="driver-price">${driver.price} ₸</div>
            `;

            container.appendChild(card);
        });
    }

    // Show driver detail modal
    showDriverDetail(driver) {
        const modal = document.getElementById('driverModal');
        const content = document.getElementById('modalContent');
        
        content.innerHTML = `
            <div class="driver-photo">
                <img src="/files/${driver.profile_photo}" alt="${driver.full_name}" onerror="this.style.display='none'">
            </div>
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[currentLang].from} → ${this.translations[currentLang].to}</div>
                <div class="detail-value">
                    <div>📍 ${driver.from_address}</div>
                    <div style="text-align: center; color: var(--accent-primary);">↓</div>
                    <div>🎯 ${driver.to_address}</div>
                </div>
            </div>
            
            <div id="detailMap"></div>
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[currentLang].price}</div>
                <div class="detail-value" style="font-size: 1.2rem; color: var(--accent-primary); font-weight: 700;">
                    ${driver.price} ₸
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[currentLang].departureTime}</div>
                <div class="detail-value">
                    ${new Date(driver.departure_time).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'kk-KZ')}
                </div>
            </div>
            
            ${driver.comment ? `
                <div class="detail-section">
                    <div class="detail-label">${this.translations[currentLang].driverComment}</div>
                    <div class="detail-value">${driver.comment}</div>
                </div>
            ` : ''}
            
            ${driver.truck_photo ? `
                <div class="detail-section">
                    <div class="detail-label">${this.translations[currentLang].truckPhoto}</div>
                    <img src="/files/${driver.truck_photo}" alt="Truck" class="truck-photo" onerror="this.style.display='none'">
                </div>
            ` : ''}
            
            <div class="detail-section">
                <div class="detail-label">${this.translations[currentLang].contact}</div>
                <div class="detail-value">${driver.contact}</div>
            </div>
            
            <div class="contact-buttons">
                <button class="contact-btn call-btn" onclick="window.open('tel:${driver.contact}')">
                    <span>📞</span>
                    <span>${this.translations[currentLang].call}</span>
                </button>
                ${driver.has_whatsapp ? `
                    <button class="contact-btn whatsapp-btn" onclick="window.open('https://wa.me/${driver.contact.replace(/\D/g, '')}')">
                        <span>💬</span>
                        <span>WhatsApp</span>
                    </button>
                ` : ''}
                ${driver.has_telegram ? `
                    <button class="contact-btn telegram-btn" onclick="window.open('https://t.me/${driver.telegram_username || driver.contact.replace(/\D/g, '')}')">
                        <span>✈️</span>
                        <span>Telegram</span>
                    </button>
                ` : ''}
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
                            center: [driver.from_lon, driver.from_lat],
                            zoom: 12
                        },
                        theme: 'light'
                    }
                );
                
                this.detailMap.addChild(new YMapDefaultSchemeLayer({ theme: 'light' }));
                this.detailMap.addChild(new YMapDefaultFeaturesLayer());
                
                // Add markers
                const fromElement = document.createElement('div');
                fromElement.innerHTML = '📍';
                fromElement.style.fontSize = '24px';
                
                const fromMarker = new YMapMarker(
                    { coordinates: [driver.from_lon, driver.from_lat] },
                    fromElement
                );
                
                const toElement = document.createElement('div');
                toElement.innerHTML = '🎯';
                toElement.style.fontSize = '24px';
                
                const toMarker = new YMapMarker(
                    { coordinates: [driver.to_lon, driver.to_lat] },
                    toElement
                );
                
                this.detailMap.addChild(fromMarker);
                this.detailMap.addChild(toMarker);
                
                // Draw route
                try {
                    const {router} = ymaps3;
                    const route = await router({
                        points: [[driver.from_lon, driver.from_lat], [driver.to_lon, driver.to_lat]],
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
                                    color: '#10b981',
                                    width: 5,
                                    opacity: 0.8
                                }]
                            }
                        });
                        
                        this.detailMap.addChild(routeFeature);
                        
                        // Fit route in view
                        const bounds = this.calculateBounds([[driver.from_lon, driver.from_lat], [driver.to_lon, driver.to_lat]]);
                        this.detailMap.setLocation({
                            bounds: bounds,
                            duration: 1000
                        });
                    }
                } catch (routeError) {
                    console.error('Route error:', routeError);
                    // If route fails, just fit both points
                    const bounds = this.calculateBounds([[driver.from_lon, driver.from_lat], [driver.to_lon, driver.to_lat]]);
                    this.detailMap.setLocation({
                        bounds: bounds,
                        duration: 1000
                    });
                }
            } catch (error) {
                console.error('Detail map error:', error);
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
        document.getElementById('driverModal').style.display = 'none';
        if (this.detailMap) {
            this.detailMap.destroy();
            this.detailMap = null;
        }
    }
}

// Create global driver service instance
const driverService = new DriverService();

// Make functions available globally
window.closeModal = () => driverService.closeModal();

// Close modal on click outside
document.getElementById('driverModal').addEventListener('click', function(e) {
    if (e.target === this) {
        driverService.closeModal();
    }
});