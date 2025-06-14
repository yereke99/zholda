// Form validation and handling service
class FormService {
    constructor() {
        this.translations = {
            ru: {
                fillAllFields: 'Заполните все обязательные поля',
                minPrice: 'Минимальная цена 2000 ₸',
                selectTruck: 'Выберите тип транспорта',
                acceptOfferta: 'Пожалуйста, примите условия соглашения',
                from: 'Откуда',
                to: 'Куда',
                price: 'Цена',
                truckType: 'Тип транспорта',
                comment: 'Комментарий',
                itemPhoto: 'Фото груза',
                contactNumber: 'Контактный номер',
                small: 'Малый',
                medium: 'Средний',
                large: 'Большой',
                refrigerator: 'Рефрижератор',
                tow: 'Эвакуатор',
                error: 'Ошибка',
                loading: 'Загрузка...'
            },
            kz: {
                fillAllFields: 'Барлық міндетті өрістерді толтырыңыз',
                minPrice: 'Минималды баға 2000 ₸',
                selectTruck: 'Көлік түрін таңдаңыз',
                acceptOfferta: 'Келісім шарттарын қабылдаңыз',
                from: 'Қайдан',
                to: 'Қайда',
                price: 'Бағасы',
                truckType: 'Көлік түрі',
                comment: 'Түсініктеме',
                itemPhoto: 'Жүк фотосы',
                contactNumber: 'Байланыс нөмірі',
                small: 'Кіші',
                medium: 'Орта',
                large: 'Үлкен',
                refrigerator: 'Рефрижератор',
                tow: 'Эвакуатор',
                error: 'Қате',
                loading: 'Жүктелуде...'
            }
        };
        this.setupFormValidation();
    }

    // Setup form validation
    setupFormValidation() {
        // Truck type selection
        document.querySelectorAll('.truck-type').forEach(type => {
            type.addEventListener('click', function() {
                document.querySelectorAll('.truck-type').forEach(t => t.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('truck_type').value = this.dataset.type;
            });
        });

        // Phone number formatting
        const contactInput = document.getElementById('contact');
        if (contactInput) {
            contactInput.addEventListener('input', this.formatPhoneNumber.bind(this));
        }

        // File input visual feedback
        const fileInput = document.getElementById('item_photo');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileChange.bind(this));
        }

        // Offerta checkbox
        const offertaCheckbox = document.getElementById('acceptOfferta');
        const continueBtn = document.getElementById('continueToForm');
        if (offertaCheckbox && continueBtn) {
            offertaCheckbox.addEventListener('change', function() {
                continueBtn.disabled = !this.checked;
            });
        }
    }

    // Format phone number input
    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        
        if (value.length > 0) {
            formattedValue = '+7';
            if (value.length > 1) {
                formattedValue += ' (' + value.substring(1, 4);
                if (value.length > 4) {
                    formattedValue += ') ' + value.substring(4, 7);
                    if (value.length > 7) {
                        formattedValue += '-' + value.substring(7, 9);
                        if (value.length > 9) {
                            formattedValue += '-' + value.substring(9, 11);
                        }
                    }
                } else if (value.length > 1) {
                    formattedValue += ')';
                }
            }
        }
        
        e.target.value = formattedValue;
    }

    // Handle file input change
    handleFileChange(e) {
        if (e.target.files.length > 0) {
            e.target.style.borderColor = 'var(--accent-primary)';
            e.target.style.background = 'var(--card-bg)';
            
            const parent = e.target.parentElement;
            parent.style.transform = 'scale(0.98)';
            setTimeout(() => {
                parent.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // Validate form
    validateForm() {
        const form = document.getElementById('clientForm');
        if (!form.checkValidity()) { 
            form.reportValidity(); 
            return false; 
        }
        
        const price = parseInt(document.getElementById('price').value);
        if (price < 2000) {
            this.showAlert(this.translations[currentLang].minPrice);
            return false;
        }
        
        if (!document.getElementById('truck_type').value) {
            this.showAlert(this.translations[currentLang].selectTruck);
            return false;
        }
        
        return true;
    }

    // Build preview content
    buildPreview() {
        if (!this.validateForm()) {
            return false;
        }
        
        const form = document.getElementById('clientForm');
        const data = new FormData(form);
        let html = '';
        
        // Route
        html += `<div class="preview-item">
            <strong>${this.translations[currentLang].from} → ${this.translations[currentLang].to}</strong>
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
            <strong>${this.translations[currentLang].price}</strong>
            ${data.get('price')} ₸
        </div>`;
        
        // Truck type
        const truckTypes = {
            'small': this.translations[currentLang].small,
            'medium': this.translations[currentLang].medium,
            'large': this.translations[currentLang].large,
            'refrigerator': this.translations[currentLang].refrigerator,
            'tow': this.translations[currentLang].tow
        };
        html += `<div class="preview-item">
            <strong>${this.translations[currentLang].truckType}</strong>
            ${truckTypes[data.get('truck_type')]}
        </div>`;
        
        // Comment
        if (data.get('comment')) {
            html += `<div class="preview-item">
                <strong>${this.translations[currentLang].comment}</strong>
                ${data.get('comment')}
            </div>`;
        }
        
        // Photo
        const photo = data.get('item_photo');
        if (photo && photo.name) {
            const url = URL.createObjectURL(photo);
            html += `<div class="preview-item">
                <strong>${this.translations[currentLang].itemPhoto}</strong>
                <img src="${url}" alt="item">
            </div>`;
        }
        
        // Contact
        html += `<div class="preview-item">
            <strong>${this.translations[currentLang].contactNumber}</strong>
            ${data.get('contact')}
        </div>`;
        
        document.getElementById('previewContent').innerHTML = html;
        return true;
    }

    // Submit request
    async submitRequest() {
        const step3 = document.getElementById('step3');
        step3.classList.add('loading');
        
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.MainButton.showProgress();
        }
        
        const formData = new FormData(document.getElementById('clientForm'));
        
        try {
            const response = await fetch('/api/client/request', {
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
            step3.classList.remove('loading');
            
            if (result.success) {
                return true;
            } else {
                this.showAlert(result.message || this.translations[currentLang].error);
                return false;
            }
        } catch (error) {
            console.error('Error:', error);
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.MainButton.hideProgress();
            }
            step3.classList.remove('loading');
            this.showAlert(this.translations[currentLang].error + ': ' + error.message);
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

    // Check if client exists and has accepted offerta
    async checkClientExists() {
        try {
            const telegramId = document.getElementById('telegram_id').value;
            if (!telegramId) {
                return { exists: false, offerta_accepted: false };
            }
            
            const response = await fetch('/api/client/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_id: telegramId
                })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error checking client:', error);
            return { exists: false, offerta_accepted: false };
        }
    }
}

// Create global form service instance
const formService = new FormService();

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('address-input')) {
        document.querySelectorAll('.suggestions-container').forEach(container => {
            container.style.display = 'none';
        });
    }
});