// FIXED: Main application service for driver request app with REAL GPS integration
class DriverAppService {
    constructor() {
        this.currentStep = 1;
        this.currentLang = 'ru';
        this.currentTheme = 'light';
        this.translations = {
            ru: {
                createRequest: 'Создать заявку',
                checkData: 'Проверить данные',
                confirm: 'Подтвердить',
                back: 'Назад',
                close: 'Закрыть',
                requestCreated: 'Заявка создана!',
                searchingClients: 'Ищем подходящих клиентов',
                availableRequests: 'Доступные заявки клиентов',
                locationRequired: 'Требуется геолокация',
                locationRequiredMessage: 'Для точной работы приложения необходимо разрешить доступ к геолокации',
                allowLocation: 'Разрешить геолокацию',
                useCurrentLocation: 'Использовать текущее местоположение'
            },
            kz: {
                createRequest: 'Өтінім жасау',
                checkData: 'Деректерді тексеру',
                confirm: 'Растау',
                back: 'Артқа',
                close: 'Жабу',
                requestCreated: 'Өтінім жасалды!',
                searchingClients: 'Қолайлы клиенттерді іздеуде',
                availableRequests: 'Қол жетімді клиент өтінімдері',
                locationRequired: 'Геолокация керек',
                locationRequiredMessage: 'Қосымшаның дұрыс жұмыс істеуі үшін геолокацияға рұқсат беру керек',
                allowLocation: 'Геолокацияға рұқсат беру',
                useCurrentLocation: 'Ағымдағы орналасуды пайдалану'
            }
        };
        this.initialize();
    }

    // FIXED: Initialize driver application with real GPS integration
    initialize() {
        this.updateViewportHeight();
        this.initializeTelegram();
        this.setupTheme();
        this.setupEventListeners();
        
        // Start the driver app after ensuring location services are ready
        setTimeout(() => {
            this.startDriverApp();
        }, 1000);
    }

    // Dynamic viewport height management for Telegram WebApp
    updateViewportHeight() {
        let vh = window.innerHeight;
        
        // Use Telegram WebApp viewport if available
        if (window.Telegram && Telegram.WebApp) {
            vh = Telegram.WebApp.viewportHeight || vh;
            const stableHeight = Telegram.WebApp.viewportStableHeight || vh;
            
            // Set CSS custom properties
            document.documentElement.style.setProperty('--tg-viewport-stable-height', `${stableHeight}px`);
        }
        
        // Set body height directly
        document.body.style.height = `${vh}px`;
        document.documentElement.style.height = `${vh}px`;
    }

    // Initialize Telegram WebApp for driver
    initializeTelegram() {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            
            const user = Telegram.WebApp.initDataUnsafe?.user;
            if (user) {
                document.getElementById('telegram_id').value = user.id;
                console.log('📱 Telegram user ID set:', user.id);
            }

            // Theme from Telegram
            if (Telegram.WebApp.colorScheme) {
                this.currentTheme = Telegram.WebApp.colorScheme;
                this.applyTheme(this.currentTheme);
            }

            // Event listeners
            Telegram.WebApp.onEvent('themeChanged', () => {
                if (Telegram.WebApp.colorScheme) {
                    this.currentTheme = Telegram.WebApp.colorScheme;
                    this.applyTheme(this.currentTheme);
                }
            });

            Telegram.WebApp.onEvent('viewportChanged', () => {
                this.updateViewportHeight();
            });

            Telegram.WebApp.onEvent('mainButtonClicked', () => {
                this.handleMainButtonClick();
            });

            // Update on resize
            window.addEventListener('resize', () => this.updateViewportHeight());
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.updateViewportHeight(), 100);
            });
        }
    }

    // Setup theme management
    setupTheme() {
        if (!this.currentTheme) {
            this.currentTheme = this.detectSystemTheme();
        }
        this.applyTheme(this.currentTheme);

        // Auto theme switching based on time if not Telegram
        if (!window.Telegram || !Telegram.WebApp) {
            setInterval(() => {
                const newTheme = this.detectSystemTheme();
                if (newTheme !== this.currentTheme) {
                    this.currentTheme = newTheme;
                    this.applyTheme(this.currentTheme);
                }
            }, 60000);
        }
    }

    // Detect system theme based on time
    detectSystemTheme() {
        const hour = new Date().getHours();
        return (hour >= 20 || hour < 6) ? 'dark' : 'light';
    }

    // Apply theme
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation buttons
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.onclick = () => this.show(1);
        }

        // Add "Use Current Location" button functionality
        this.setupLocationHelpers();
    }

    // FIXED: Setup location helper buttons and functionality
    setupLocationHelpers() {
        // Create "Use Current Location" floating button
        setTimeout(() => {
            this.createLocationHelperButton();
        }, 3000);

        // Monitor location changes and update UI accordingly
        setInterval(() => {
            this.updateLocationStatus();
        }, 5000);
    }

    // Create floating location helper button
    createLocationHelperButton() {
        // Only show if GPS is available and we're on step 1
        if (!window.currentUserLocation || this.currentStep !== 1) {
            return;
        }

        const existingBtn = document.getElementById('locationHelperBtn');
        if (existingBtn) {
            existingBtn.remove();
        }

        const locationBtn = document.createElement('div');
        locationBtn.id = 'locationHelperBtn';
        locationBtn.style.cssText = `
            position: fixed;
            bottom: 120px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 12px 16px;
            border-radius: 25px;
            font-size: 0.85rem;
            font-weight: 600;
            z-index: 1000;
            cursor: pointer;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            display: flex;
            align-items: center;
            gap: 6px;
            max-width: 250px;
        `;
        locationBtn.innerHTML = `
            <span>📍</span>
            <span>${this.translations[this.currentLang].useCurrentLocation}</span>
        `;
        
        locationBtn.onclick = () => {
            this.fillCurrentLocationAsFrom();
            locationBtn.remove();
        };
        
        document.body.appendChild(locationBtn);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (locationBtn.parentNode) {
                locationBtn.remove();
            }
        }, 10000);
    }

    // Update location status in UI
    updateLocationStatus() {
        if (window.driverLocationService) {
            const status = driverLocationService.getTrackingStatus();
            const statusEl = document.getElementById('locationStatus');
            const textEl = document.getElementById('locationText');
            
            if (statusEl && textEl && status.hasPermission && status.isTracking) {
                const accuracy = status.lastAccuracy < 10 ? 'точно' : 
                               status.lastAccuracy < 20 ? 'хорошо' : 'средне';
                textEl.textContent = `GPS: ${accuracy} (${status.updateCounter} обновлений)`;
            }
        }
    }

    // FIXED: Start driver application with location-first approach
    async startDriverApp() {
        console.log('🚚 Starting driver application...');
        
        // Priority 1: Show location permission dialog immediately
        if (window.driverLocationService) {
            driverLocationService.showPermissionDialog();
        }
        
        // Start with step 1 (create request form)
        this.show(1);
        
        // Setup real-time location monitoring
        this.startLocationMonitoring();
    }

    // FIXED: Start location monitoring with enhanced feedback
    startLocationMonitoring() {
        // Monitor location service readiness
        const checkLocationReady = () => {
            if (window.driverLocationService?.isLocationPermissionGranted()) {
                console.log('✅ Driver location service ready');
                this.onLocationReady();
            } else {
                setTimeout(checkLocationReady, 1000);
            }
        };
        
        setTimeout(checkLocationReady, 2000);
    }

    // Called when location service is ready
    onLocationReady() {
        console.log('📍 Location ready, setting up enhanced features...');
        
        // Show location helper button
        if (this.currentStep === 1) {
            setTimeout(() => {
                this.createLocationHelperButton();
            }, 2000);
        }
        
        // Enable location-based features
        this.enableLocationFeatures();
    }

    // Enable location-based features
    enableLocationFeatures() {
        // Add location quality indicator
        this.addLocationQualityIndicator();
        
        // Enable smart address suggestions based on location
        this.enableSmartAddressSuggestions();
    }

    // Add location quality indicator
    addLocationQualityIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'locationQualityIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.75rem;
            font-weight: 600;
            z-index: 900;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(indicator);
        
        // Update indicator based on GPS accuracy
        const updateIndicator = () => {
            if (window.driverLocationService) {
                const status = driverLocationService.getTrackingStatus();
                if (status.hasPermission && status.isTracking) {
                    const accuracy = status.lastAccuracy;
                    let text = 'GPS: ';
                    let color = '';
                    
                    if (accuracy < 5) {
                        text += 'Отлично';
                        color = '#10b981';
                    } else if (accuracy < 15) {
                        text += 'Хорошо';
                        color = '#f59e0b';
                    } else {
                        text += 'Средне';
                        color = '#ef4444';
                    }
                    
                    indicator.textContent = text + ` (±${Math.round(accuracy)}м)`;
                    indicator.style.background = color;
                    indicator.style.display = 'block';
                } else {
                    indicator.style.display = 'none';
                }
            }
        };
        
        setInterval(updateIndicator, 2000);
    }

    // Enable smart address suggestions based on current location
    enableSmartAddressSuggestions() {
        // This will be handled by the form service
        console.log('🧠 Smart address suggestions enabled');
    }

    // Show specific step
    show(step) {
        this.currentStep = step;
        
        // Hide all steps
        [1, 2, 3].forEach(i => {
            const el = document.getElementById('step' + i);
            if (el) {
                el.classList.toggle('active', i === step);
            }
        });
        
        // Update fixed buttons visibility
        const fixedButtons = document.getElementById('fixedButtons');
        const backBtn = document.getElementById('backBtn');
        
        if (step === 2) {
            fixedButtons.classList.add('active');
            backBtn.style.display = 'inline-flex';
        } else {
            fixedButtons.classList.remove('active');
        }
        
        // Hide main button by default
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.MainButton.hide();
        }
        
        // Update main button text based on step
        this.updateMainButtonText();
        
        // Load client requests on step 3
        if (step === 3 && window.driverClientService) {
            driverClientService.loadClientRequests();
        }

        // Setup address suggestions on step 1
        if (step === 1) {
            setTimeout(() => {
                if (typeof setupDriverAddressSuggestions === 'function') {
                    setupDriverAddressSuggestions('from_address');
                    setupDriverAddressSuggestions('to_address');
                }
            }, 500);
            
            // Show location helper button if location is available
            if (window.currentUserLocation) {
                setTimeout(() => {
                    this.createLocationHelperButton();
                }, 1000);
            }
        }
        
        console.log(`📱 Driver app showing step ${step}`);
    }

    // Update main button text based on current step
    updateMainButtonText() {
        if (!window.Telegram || !Telegram.WebApp) return;
        
        if (this.currentStep === 1) {
            Telegram.WebApp.MainButton.setText('📋 ' + this.translations[this.currentLang].checkData);
            Telegram.WebApp.MainButton.show();
            Telegram.WebApp.MainButton.color = '#3b82f6';
        } else if (this.currentStep === 2) {
            Telegram.WebApp.MainButton.setText('✅ ' + this.translations[this.currentLang].confirm);
            Telegram.WebApp.MainButton.show();
            Telegram.WebApp.MainButton.color = '#10b981';
        }
    }

    // Handle main button click
    async handleMainButtonClick() {
        console.log(`🖱️ Main button clicked on step ${this.currentStep}`);
        
        if (this.currentStep === 1) {
            // Validate and show preview
            if (window.driverFormService && driverFormService.buildDriverPreview()) {
                this.show(2);
            }
        } else if (this.currentStep === 2) {
            // Submit request
            if (window.driverFormService) {
                const success = await driverFormService.submitDriverRequest();
                if (success) {
                    // Dispatch success event
                    window.dispatchEvent(new CustomEvent('driverRequestSubmitted'));
                    this.show(3);
                }
            }
        }
    }

    // Language management
    setLang(lang) {
        this.currentLang = lang;
        
        // Update language buttons
        document.querySelectorAll('.lang-switch button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('lang-' + lang).classList.add('active');
        
        // Update all elements with data attributes
        document.querySelectorAll('[data-ru]').forEach(el => {
            el.textContent = el.getAttribute('data-' + lang) || el.textContent;
        });
        
        // Update form placeholders
        this.updatePlaceholders(lang);
        
        // Update main button text based on current step
        this.updateMainButtonText();
        
        // Update global currentLang variable
        window.currentLang = lang;
        
        console.log(`🌐 Driver app language changed to: ${lang}`);
    }

    // Update form placeholders based on language
    updatePlaceholders(lang) {
        const placeholders = {
            ru: {
                from_address: 'Введите адрес или выберите на карте',
                to_address: 'Введите адрес или выберите на карте',
                price: 'Минимум 2000',
                comment: 'Дополнительная информация о грузе или особые требования'
            },
            kz: {
                from_address: 'Мекенжайды енгізіңіз немесе картадан таңдаңыз',
                to_address: 'Мекенжайды енгізіңіз немесе картадан таңдаңыз',
                price: 'Минимум 2000',
                comment: 'Жүк туралы қосымша ақпарат немесе арнайы талаптар'
            }
        };

        Object.keys(placeholders[lang]).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.placeholder = placeholders[lang][id];
            }
        });
    }

    // Show alert (Telegram or browser)
    showAlert(message) {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    // FIXED: Auto-fill current location as FROM address with real coordinates
    async fillCurrentLocationAsFrom() {
        console.log('📍 Filling current location as FROM address...');
        
        if (!window.currentUserLocation) {
            console.warn('⚠️ No current location available');
            this.showAlert('Местоположение не определено');
            return;
        }
        
        try {
            const coordinates = window.currentUserLocation; // [longitude, latitude]
            console.log('📍 Using REAL coordinates:', coordinates);
            
            // Get address from coordinates
            const address = await this.reverseGeocode(coordinates);
            
            if (address) {
                // Fill form fields
                document.getElementById('from_address').value = address;
                document.getElementById('from_lat').value = coordinates[1]; // latitude
                document.getElementById('from_lon').value = coordinates[0]; // longitude
                
                // Update map marker
                if (typeof setDriverPoint === 'function') {
                    setDriverPoint('from', coordinates);
                }
                
                // Visual feedback
                const fromInput = document.getElementById('from_address');
                fromInput.style.borderColor = '#10b981';
                fromInput.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                
                setTimeout(() => {
                    fromInput.style.borderColor = '';
                    fromInput.style.backgroundColor = '';
                }, 2000);
                
                console.log('✅ Current location filled as FROM address:', address);
                
                // Show success notification
                this.showSuccessNotification('Текущее местоположение установлено');
            }
        } catch (error) {
            console.error('❌ Error filling current location:', error);
            this.showAlert('Ошибка определения адреса');
        }
    }

    // FIXED: Reverse geocode coordinates to address using real coordinates
    async reverseGeocode(coordinates) {
        try {
            // Use REAL coordinates for geocoding
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
            
            throw new Error('No address found');
        } catch (error) {
            console.error('❌ Reverse geocoding error:', error);
            // Fallback to coordinates
            return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`;
        }
    }

    // Show success notification
    showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 2000;
            animation: slideInNotification 0.3s ease;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        `;
        notification.textContent = '✅ ' + message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Get current step
    getCurrentStep() {
        return this.currentStep;
    }

    // Get current language
    getCurrentLang() {
        return this.currentLang;
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // ENHANCED: Debug function with comprehensive info
    debugInfo() {
        console.log('=== FIXED Driver App Debug Info ===');
        console.log('Current Step:', this.currentStep);
        console.log('Current Language:', this.currentLang);
        console.log('Current Theme:', this.currentTheme);
        console.log('Telegram WebApp:', !!window.Telegram?.WebApp);
        console.log('Real User Location:', window.currentUserLocation);
        console.log('Driver Map Initialized:', !!window.driverMap);
        console.log('Location Permission:', window.driverLocationService?.isLocationPermissionGranted());
        console.log('Location Tracking:', window.driverLocationService?.getTrackingStatus());
        console.log('Map Container:', !!document.getElementById('driverRequestMap'));
        console.log('===================================');
        
        // Return debug object for further inspection
        return {
            step: this.currentStep,
            lang: this.currentLang,
            theme: this.currentTheme,
            telegram: !!window.Telegram?.WebApp,
            location: window.currentUserLocation,
            mapReady: !!window.driverMap,
            locationService: window.driverLocationService?.getTrackingStatus()
        };
    }

    // Force location refresh
    async forceLocationRefresh() {
        console.log('🔄 Forcing location refresh...');
        if (window.driverLocationService) {
            const success = await driverLocationService.forceLocationUpdate();
            if (success) {
                this.showSuccessNotification('Местоположение обновлено');
            } else {
                this.showAlert('Не удалось обновить местоположение');
            }
        }
    }

    // Handle app lifecycle events
    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            console.log('📱 Driver app paused');
            // Optionally pause location tracking to save battery
        } else {
            console.log('📱 Driver app resumed');
            // Resume location tracking
            if (window.driverLocationService?.isLocationPermissionGranted()) {
                driverLocationService.startAggressiveLocationTracking();
            }
        }
    }
}

// Create global driver app service instance
const driverAppService = new DriverAppService();

// Make functions available globally
window.setLang = (lang) => driverAppService.setLang(lang);
window.currentLang = driverAppService.getCurrentLang();
window.debugDriverApp = () => driverAppService.debugInfo();
window.driverAppService = driverAppService;
window.forceLocationRefresh = () => driverAppService.forceLocationRefresh();

// Handle app lifecycle events
document.addEventListener('visibilitychange', () => {
    driverAppService.handleVisibilityChange();
});

// Handle connectivity events
window.addEventListener('online', () => {
    console.log('🌐 Driver app back online');
    driverAppService.showSuccessNotification('Соединение восстановлено');
});

window.addEventListener('offline', () => {
    console.log('📴 Driver app offline');
    driverAppService.showAlert('Отсутствует интернет-соединение');
});

// Update currentLang when language changes
document.addEventListener('DOMContentLoaded', () => {
    window.currentLang = driverAppService.getCurrentLang();
    console.log('🚚 FIXED Driver Request App initialized with REAL GPS support');
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(100px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideInNotification {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    .location-helper-pulse {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
`;
document.head.appendChild(style);

console.log('🚚 FIXED Driver App Service loaded with REAL GPS integration and enhanced location features');Property('--tg-viewport-height', `${vh}px`);
            document.documentElement.style.set