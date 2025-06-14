// Main application service
class AppService {
    constructor() {
        this.currentStep = 0;
        this.currentLang = 'ru';
        this.currentTheme = 'light';
        this.translations = {
            ru: {
                checking: 'Проверка регистрации...',
                pleaseWait: 'Пожалуйста, подождите',
                checkData: 'Проверить данные',
                confirm: 'Подтвердить',
                back: 'Назад'
            },
            kz: {
                checking: 'Тіркелуді тексеру...',
                pleaseWait: 'Күте тұрыңыз',
                checkData: 'Деректерді тексеру',
                confirm: 'Растау',
                back: 'Артқа'
            }
        };
        this.initialize();
    }

    // Initialize application
    initialize() {
        this.updateViewportHeight();
        this.initializeTelegram();
        this.setupTheme();
        this.setupEventListeners();
        
        // Start the app
        setTimeout(() => {
            this.startApp();
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

    // Initialize Telegram WebApp
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
            backBtn.onclick = () => this.show(2);
        }

        // Continue to form button
        const continueBtn = document.getElementById('continueToForm');
        if (continueBtn) {
            continueBtn.onclick = () => {
                if (document.getElementById('acceptOfferta').checked) {
                    this.show(2);
                } else {
                    this.showAlert('Пожалуйста, примите условия соглашения');
                }
            };
        }
    }

    // Start application
    async startApp() {
        // Show permission dialog first
        locationService.showPermissionDialog();
        
        // Check client registration status
        const clientData = await formService.checkClientExists();
        
        if (clientData.exists && clientData.offerta_accepted) {
            // Client already accepted offerta - go directly to form
            this.show(2);
        } else {
            // Show offerta acceptance page
            this.show(1);
        }
    }

    // Show specific step
    show(step) {
        this.currentStep = step;
        
        // Hide all steps
        [0, 1, 2, 3, 4].forEach(i => {
            const el = document.getElementById('step' + i);
            if (el) {
                el.classList.toggle('active', i === step);
            }
        });
        
        // Update fixed buttons visibility
        const fixedButtons = document.getElementById('fixedButtons');
        const backBtn = document.getElementById('backBtn');
        
        if (step === 3) {
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
        
        // Load drivers on step 4
        if (step === 4) {
            driverService.loadDrivers();
        }

        // Setup map and suggestions when showing step 2
        if (step === 2) {
            setTimeout(() => {
                setupAddressSuggestions('from_address');
                setupAddressSuggestions('to_address');

                // Initialize map after it becomes visible
                if (typeof window.initializeMap === 'function') {
                    if (!window.map) {
                        window.initializeMap();
                    } else if (window.map.container) {
                        try {
                            window.map.container.fitToViewport();
                        } catch (err) {
                            console.warn('Map resize warning:', err);
                        }
                    }
                }
            }, 500);
        }
    }

    // Update main button text based on current step
    updateMainButtonText() {
        if (!window.Telegram || !Telegram.WebApp) return;
        
        if (this.currentStep === 2) {
            Telegram.WebApp.MainButton.setText('📋 ' + this.translations[this.currentLang].checkData);
            Telegram.WebApp.MainButton.show();
            Telegram.WebApp.MainButton.color = '#10b981';
        } else if (this.currentStep === 3) {
            Telegram.WebApp.MainButton.setText('✅ ' + this.translations[this.currentLang].confirm);
            Telegram.WebApp.MainButton.show();
            Telegram.WebApp.MainButton.color = '#3b82f6';
        }
    }

    // Handle main button click
    async handleMainButtonClick() {
        if (this.currentStep === 2) {
            // Validate and show preview
            if (formService.buildPreview()) {
                this.show(3);
            }
        } else if (this.currentStep === 3) {
            // Submit request
            const success = await formService.submitRequest();
            if (success) {
                this.show(4);
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
                comment: 'Дополнительная информация о грузе',
                contact: '+7 (___) ___-__-__'
            },
            kz: {
                from_address: 'Мекенжайды енгізіңіз немесе картадан таңдаңыз',
                to_address: 'Мекенжайды енгізіңіз немесе картадан таңдаңыз',
                price: 'Минимум 2000',
                comment: 'Жүк туралы қосымша ақпарат',
                contact: '+7 (___) ___-__-__'
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

    // Show popup (Telegram or browser)
    showPopup(title, message, buttons = []) {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.showPopup({
                title: title,
                message: message,
                buttons: buttons
            });
        } else {
            this.showAlert(message);
        }
    }

    // Close app (Telegram specific)
    closeApp() {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.close();
        } else {
            window.close();
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

    // Force theme change
    setTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme);
    }

    // Debug function
    debugInfo() {
        console.log('=== App Debug Info ===');
        console.log('Current Step:', this.currentStep);
        console.log('Current Language:', this.currentLang);
        console.log('Current Theme:', this.currentTheme);
        console.log('Telegram WebApp:', !!window.Telegram?.WebApp);
        console.log('User Location:', locationService?.getCurrentLocation());
        console.log('Map Initialized:', !!window.map);
        console.log('======================');
    }
}

// Create global app service instance
const appService = new AppService();

// Make functions available globally
window.setLang = (lang) => appService.setLang(lang);
window.currentLang = appService.getCurrentLang();
window.debugApp = () => appService.debugInfo();

// Update currentLang when language changes
document.addEventListener('DOMContentLoaded', () => {
    window.currentLang = appService.getCurrentLang();
});

// Export for debugging
window.appService = appService;