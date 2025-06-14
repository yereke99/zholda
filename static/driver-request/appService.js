// Main application service for driver request app
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
                availableRequests: 'Доступные заявки клиентов'
            },
            kz: {
                createRequest: 'Өтінім жасау',
                checkData: 'Деректерді тексеру',
                confirm: 'Растау',
                back: 'Артқа',
                close: 'Жабу',
                requestCreated: 'Өтінім жасалды!',
                searchingClients: 'Қолайлы клиенттерді іздеуде',
                availableRequests: 'Қол жетімді клиент өтінімдері'
            }
        };
        this.initialize();
    }

    // Initialize driver application
    initialize() {
        this.updateViewportHeight();
        this.initializeTelegram();
        this.setupTheme();
        this.setupEventListeners();
        
        // Start the driver app
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
            document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
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
    }

    // Start driver application
    async startDriverApp() {
        // Show permission dialog first
        if (window.driverLocationService) {
            driverLocationService.showPermissionDialog();
        }
        
        // Start with step 1 (create request form)
        this.show(1);
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
        if (step === 3) {
            if (window.driverClientService) {
                driverClientService.loadClientRequests();
            }
        }

        // Setup address suggestions on step 1
        if (step === 1) {
            setTimeout(() => {
                if (typeof setupDriverAddressSuggestions === 'function') {
                    setupDriverAddressSuggestions('from_address');
                    setupDriverAddressSuggestions('to_address');
                }
            }, 500);
        }
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
                to_address: 'Мекенжайды енгізіңіز немесе картадан таңдаңыз',
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

    // Auto-fill current location as FROM address
    async autoFillCurrentLocation() {
        if (window.driverFormService && driverFormService.fillCurrentLocationAsFrom) {
            await driverFormService.fillCurrentLocationAsFrom();
        }
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

    // Debug function
    debugInfo() {
        console.log('=== Driver App Debug Info ===');
        console.log('Current Step:', this.currentStep);
        console.log('Current Language:', this.currentLang);
        console.log('Current Theme:', this.currentTheme);
        console.log('Telegram WebApp:', !!window.Telegram?.WebApp);
        console.log('User Location:', window.driverLocationService?.getCurrentLocation());
        console.log('Map Initialized:', !!window.driverMap);
        console.log('Location Permission:', window.driverLocationService?.isLocationPermissionGranted());
        console.log('===============================');
    }
}

// Create global driver app service instance
const driverAppService = new DriverAppService();

// Make functions available globally
window.setLang = (lang) => driverAppService.setLang(lang);
window.currentLang = driverAppService.getCurrentLang();
window.debugDriverApp = () => driverAppService.debugInfo();
window.driverAppService = driverAppService;

// Handle app lifecycle events
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        console.log('📱 Driver app paused');
        if (window.driverLocationService) {
            driverLocationService.stopTracking();
        }
    } else {
        console.log('📱 Driver app resumed');
        if (window.driverLocationService && driverLocationService.isLocationPermissionGranted()) {
            driverLocationService.restartTracking();
        }
    }
});

// Handle connectivity events
window.addEventListener('online', () => console.log('🌐 Driver app back online'));
window.addEventListener('offline', () => console.log('📴 Driver app offline'));

// Update currentLang when language changes
document.addEventListener('DOMContentLoaded', () => {
    window.currentLang = driverAppService.getCurrentLang();
    console.log('🚚 Driver Request App initialized');
});

// Auto-fill current location button
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.currentUserLocation && driverAppService.getCurrentStep() === 1) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 20px;
                background: var(--success-gradient);
                color: white;
                padding: 10px 15px;
                border-radius: 25px;
                font-size: 0.8rem;
                z-index: 1000;
                cursor: pointer;
                animation: slideInRight 0.3s ease;
                box-shadow: var(--shadow-lg);
            `;
            notification.innerHTML = '📍 Заполнить текущим местоположением';
            notification.onclick = () => {
                driverAppService.autoFillCurrentLocation();
                notification.remove();
            };
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 10000);
        }
    }, 3000);
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);

console.log('🚚 Driver App Service loaded and ready');