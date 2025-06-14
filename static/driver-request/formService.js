// Driver Form validation and handling service
class DriverFormService {
    constructor() {
        this.translations = {
            ru: {
                fillAllFields: 'Заполните все обязательные поля',
                minPrice: 'Минимальная цена 2000 ₸',
                acceptOfferta: 'Пожалуйста, примите условия соглашения',
                from: 'Откуда',
                to: 'Куда',
                price: 'Цена',
                comment: 'Комментарий',
                departureTime: 'Время отправления',
                error: 'Ошибка',
                loading: 'Загрузка...',
                createRequest: 'Создать заявку',
                checkData: 'Проверить данные',
                confirm: 'Подтвердить'
            },
            kz: {
                fillAllFields: 'Барлық міндетті өрістерді толтырыңыз',
                minPrice: 'Минималды баға 2000 ₸',
                acceptOfferta: 'Келісім шарттарын қабылдаңыз',
                from: 'Қайдан',
                to: 'Қайда',
                price: 'Бағасы',
                comment: 'Түсініктеме',
                departureTime: 'Жөнелу уақыты',
                error: 'Қате',
                loading: 'Жүктелуде...',
                createRequest: 'Өтінім жасау',
                checkData: 'Деректерді тексеру',
                confirm: 'Растау'
            }
        };
        this.setupFormValidation();
    }

    // Setup form validation for driver
    setupFormValidation() {
        // Set default departure time to now + 1 hour
        this.setDefaultDepartureTime();
        
        // Form input event listeners
        this.setupFormListeners();
    }

    // Set default departure time
    setDefaultDepartureTime() {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        const departureInput = document.getElementById('departure_time');
        if (departureInput) {
            departureInput.value = now.toISOString().slice(0, 16);
        }
    }

    // Setup form listeners
    setupFormListeners() {
        // Auto-fill address when typing
        const fromInput = document.getElementById('from_address');
        const toInput = document.getElementById('to_address');
        
        if (fromInput) {
            fromInput.addEventListener('input', this.handleAddressInput.bind(this, 'from'));
        }
        
        if (toInput) {
            toInput.addEventListener('input', this.handleAddressInput.bind(this, 'to'));
        }
        
        // Price validation
        const priceInput = document.getElementById('price');
        if (priceInput) {
            priceInput.addEventListener('input', this.validatePrice.bind(this));
        }
    }

    // Handle address input with geocoding
    async handleAddressInput(type, event) {
        const query = event.target.value;
        
        if (query.length < 3) return;
        
        try {
            // Auto-geocode address if it looks complete
            if (query.length > 10 && query.includes(',')) {
                const coordinates = await this.geocodeAddress(query);
                if (coordinates) {
                    // Set coordinates in hidden fields
                    if (type === 'from') {
                        document.getElementById('from_lat').value = coordinates[1];
                        document.getElementById('from_lon').value = coordinates[0];
                    } else {
                        document.getElementById('to_lat').value = coordinates[1];
                        document.getElementById('to_lon').value = coordinates[0];
                    }
                    
                    // Update map markers
                    if (typeof setDriverPoint === 'function') {
                        setDriverPoint(type, coordinates);
                    }
                    
                    // Update route if both points exist
                    setTimeout(() => {
                        if (window.fromMarker && window.toMarker) {
                            updateDriverRouteWithYandexAPI();
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('❌ Error auto-geocoding driver address:', error);
        }
    }

    // Geocode address to coordinates
    async geocodeAddress(address) {
        try {
            const response = await fetch(
                `https://geocode-maps.yandex.ru/1.x/?apikey=8a3e4da0-9ef2-4176-9203-e7014c1dba6f&geocode=${encodeURIComponent(address)}&format=json&results=1&lang=ru_RU`
            );
            
            if (!response.ok) {
                throw new Error('Geocoding request failed');
            }
            
            const data = await response.json();
            const geoObjects = data.response?.GeoObjectCollection?.featureMember;
            
            if (geoObjects && geoObjects.length > 0) {
                const coordsString = geoObjects[0].GeoObject.Point.pos;
                const coords = coordsString.split(' ').map(parseFloat);
                return coords; // [longitude, latitude]
            }
            
            return null;
        } catch (error) {
            console.error('❌ Geocoding error:', error);
            return null;
        }
    }

    // Validate price input
    validatePrice(event) {
        const price = parseInt(event.target.value);
        const input = event.target;
        
        if (price && price < 2000) {
            input.style.borderColor = '#ef4444';
            input.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        } else {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        }
    }

    // Validate driver form
    validateDriverForm() {
        const form = document.getElementById('driverRequestForm');
        if (!form.checkValidity()) { 
            form.reportValidity(); 
            return false; 
        }
        
        const price = parseInt(document.getElementById('price').value);
        if (price < 2000) {
            this.showAlert(this.translations[window.currentLang || 'ru'].minPrice);
            return false;
        }
        
        // Check if coordinates are set
        const fromLat = document.getElementById('from_lat').value;
        const fromLon = document.getElementById('from_lon').value;
        const toLat = document.getElementById('to_lat').value;
        const toLon = document.getElementById('to_lon').value;
        
        if (!fromLat || !fromLon || !toLat || !toLon) {
            this.showAlert('Пожалуйста, выберите адреса на карте');
            return false;
        }
        
        return true;
    }

    // Build preview content for driver
    buildDriverPreview() {
        if (!this.validateDriverForm()) {
            return false;
        }
        
        const form = document.getElementById('driverRequestForm');
        const data = new FormData(form);
        let html = '';
        
        // Route
        html += `<div class="preview-item">
            <strong>${this.translations[window.currentLang || 'ru'].from} → ${this.translations[window.currentLang || 'ru'].to}</strong>
            <div class="route-preview">
                <div>
                    <div class="from">${data.get('from_address')}</div>
                    <div class="route-arrow">↓</div>
                    <div class="to">${data.get('to_address')}</div>
                </div>
            </div>
        </div>`;
        
        // Price
        html += `<div class="preview-item">
            <strong>${this.translations[window.currentLang || 'ru'].price}</strong>
            ${data.get('price')} ₸
        </div>`;
        
        // Departure time
        const departureTime = new Date(data.get('departure_time'));
        html += `<div class="preview-item">
            <strong>${this.translations[window.currentLang || 'ru'].departureTime}</strong>
            ${departureTime.toLocaleString(window.currentLang === 'ru' ? 'ru-RU' : 'kk-KZ')}
        </div>`;
        
        // Comment
        if (data.get('comment')) {
            html += `<div class="preview-item">
                <strong>${this.translations[window.currentLang || 'ru'].comment}</strong>
                ${data.get('comment')}
            </div>`;
        }
        
        document.getElementById('previewContent').innerHTML = html;
        return true;
    }

    // Submit driver request
    async submitDriverRequest() {
        const step2 = document.getElementById('step2');
        step2.classList.add('loading');
        
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.MainButton.showProgress();
        }
        
        const formData = new FormData(document.getElementById('driverRequestForm'));
        
        try {
            const response = await fetch('/api/driver/request', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.MainButton.hideProgress();
            }
            step2.classList.remove('loading');
            
            if (result.success) {
                return true;
            } else {
                this.showAlert(result.message || this.translations[window.currentLang || 'ru'].error);
                return false;
            }
        } catch (error) {
            console.error('❌ Driver request error:', error);
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.MainButton.hideProgress();
            }
            step2.classList.remove('loading');
            this.showAlert(this.translations[window.currentLang || 'ru'].error + ': ' + error.message);
            return false;
        }
    }

    // Show alert
    showAlert(message) {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    // Get form data as object
    getFormData() {
        const form = document.getElementById('driverRequestForm');
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    // Fill form with data
    fillForm(data) {
        Object.keys(data).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = data[key];
            }
        });
    }

    // Clear form
    clearForm() {
        const form = document.getElementById('driverRequestForm');
        if (form) {
            form.reset();
            this.setDefaultDepartureTime();
        }
        
        // Clear coordinate fields
        ['from_lat', 'from_lon', 'to_lat', 'to_lon'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        // Clear map markers
        if (typeof clearDriverRoute === 'function') {
            clearDriverRoute();
        }
    }

    // Auto-fill current location as FROM address
    async fillCurrentLocationAsFrom() {
        if (!window.currentUserLocation) {
            console.warn('⚠️ No current location available');
            return;
        }
        
        try {
            const coordinates = window.currentUserLocation;
            const address = await this.reverseGeocode(coordinates);
            
            if (address) {
                document.getElementById('from_address').value = address;
                document.getElementById('from_lat').value = coordinates[1];
                document.getElementById('from_lon').value = coordinates[0];
                
                // Update map marker
                if (typeof setDriverPoint === 'function') {
                    setDriverPoint('from', coordinates);
                }
                
                console.log('✅ Current location filled as FROM address');
            }
        } catch (error) {
            console.error('❌ Error filling current location:', error);
        }
    }

    // Reverse geocode coordinates to address
    async reverseGeocode(coordinates) {
        try {
            const response = await fetch(
                `https://geocode-maps.yandex.ru/1.x/?apikey=8a3e4da0-9ef2-4176-9203-e7014c1dba6f&geocode=${coordinates[0]},${coordinates[1]}&format=json&results=1&lang=ru_RU`
            );
            
            if (!response.ok) {
                throw new Error('Reverse geocoding request failed');
            }
            
            const data = await response.json();
            const geoObjects = data.response?.GeoObjectCollection?.featureMember;
            
            if (geoObjects && geoObjects.length > 0) {
                return geoObjects[0].GeoObject.metaDataProperty.GeocoderMetaData.text;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Reverse geocoding error:', error);
            return null;
        }
    }

    // Validate departure time (must be in future)
    validateDepartureTime() {
        const departureInput = document.getElementById('departure_time');
        if (!departureInput) return true;
        
        const departureTime = new Date(departureInput.value);
        const now = new Date();
        
        if (departureTime <= now) {
            departureInput.style.borderColor = '#ef4444';
            departureInput.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            this.showAlert('Время отправления должно быть в будущем');
            return false;
        } else {
            departureInput.style.borderColor = '';
            departureInput.style.backgroundColor = '';
            return true;
        }
    }

    // Format time for display
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString(window.currentLang === 'ru' ? 'ru-RU' : 'kk-KZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Check if form has unsaved changes
    hasUnsavedChanges() {
        const form = document.getElementById('driverRequestForm');
        if (!form) return false;
        
        const formData = new FormData(form);
        let hasData = false;
        
        for (let [key, value] of formData.entries()) {
            if (value && key !== 'departure_time' && key !== 'telegram_id') {
                hasData = true;
                break;
            }
        }
        
        return hasData;
    }

    // Save form data to localStorage (for recovery)
    saveFormDataToStorage() {
        if (!this.hasUnsavedChanges()) return;
        
        try {
            const formData = this.getFormData();
            localStorage.setItem('driverFormData', JSON.stringify(formData));
            console.log('📝 Driver form data saved to storage');
        } catch (error) {
            console.warn('⚠️ Could not save driver form data:', error);
        }
    }

    // Load form data from localStorage
    loadFormDataFromStorage() {
        try {
            const savedData = localStorage.getItem('driverFormData');
            if (savedData) {
                const formData = JSON.parse(savedData);
                this.fillForm(formData);
                console.log('📝 Driver form data loaded from storage');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Could not load driver form data:', error);
        }
        return false;
    }

    // Clear saved form data
    clearSavedFormData() {
        try {
            localStorage.removeItem('driverFormData');
            console.log('🗑️ Driver form data cleared from storage');
        } catch (error) {
            console.warn('⚠️ Could not clear driver form data:', error);
        }
    }

    // Auto-save form data periodically
    startAutoSave() {
        setInterval(() => {
            this.saveFormDataToStorage();
        }, 30000); // Save every 30 seconds
    }

    // Setup form recovery
    setupFormRecovery() {
        // Load saved data on page load
        setTimeout(() => {
            if (this.loadFormDataFromStorage()) {
                // Show recovery notification
                const notification = document.createElement('div');
                notification.className = 'recovery-notification';
                notification.style.cssText = `
                    position: fixed;
                    top: 60px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--success-gradient);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 25px;
                    font-size: 0.9rem;
                    z-index: 1000;
                    animation: slideInNotification 0.3s ease;
                `;
                notification.textContent = '✅ Восстановлены несохраненные данные';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
        }, 1000);
        
        // Start auto-save
        this.startAutoSave();
        
        // Clear saved data on successful submission
        window.addEventListener('driverRequestSubmitted', () => {
            this.clearSavedFormData();
        });
    }
}

// Create global driver form service instance
const driverFormService = new DriverFormService();

// Make functions available globally
window.driverFormService = driverFormService;
window.validateDriverForm = () => driverFormService.validateDriverForm();
window.buildDriverPreview = () => driverFormService.buildDriverPreview();
window.submitDriverRequest = () => driverFormService.submitDriverRequest();

// Setup form recovery on load
document.addEventListener('DOMContentLoaded', () => {
    // Setup address suggestions
    if (typeof setupDriverAddressSuggestions === 'function') {
        setupDriverAddressSuggestions('from_address');
        setupDriverAddressSuggestions('to_address');
    }
    
    // Setup form recovery
    driverFormService.setupFormRecovery();
    
    console.log('📝 Driver Form Service initialized');
});

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('address-input')) {
        document.querySelectorAll('.suggestions-container').forEach(container => {
            container.style.display = 'none';
        });
    }
});

// Add CSS for recovery notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInNotification {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);
