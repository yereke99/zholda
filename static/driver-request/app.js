    // Set Telegram viewport height
    function updateViewportHeight() {
      const vh = Telegram.WebApp.viewportHeight;
      document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
    }

    // Update on init and resize
    updateViewportHeight();
    Telegram.WebApp.onEvent('viewportChanged', updateViewportHeight);

    // Language management
    let currentLang = 'ru';
    const translations = {
      ru: {
        createRequest: 'Создать заявку',
        from: 'Откуда',
        to: 'Куда',
        price: 'Цена',
        comment: 'Комментарий',
        departureTime: 'Время отправления',
        back: 'Назад',
        checkData: 'Проверить данные',
        confirm: 'Подтвердить',
        requestCreated: 'Заявка создана!',
        searchingClients: 'Ищем подходящих клиентов',
        availableRequests: 'Доступные заявки клиентов',
        close: 'Закрыть',
        enterAddress: 'Введите адрес или выберите на карте',
        minimum: 'Минимум',
        additionalInfo: 'Дополнительная информация о грузе или особые требования',
        selectOnMap: 'Выберите точку на карте',
        routeDistance: 'Расстояние',
        requestDetails: 'Детали заявки',
        contact: 'Контакт',
        call: 'Позвонить',
        truckType: 'Тип транспорта',
        noRequests: 'Нет доступных заявок',
        loading: 'Загрузка...',
        error: 'Ошибка',
        fillAllFields: 'Заполните все обязательные поля',
        minPrice: 'Минимальная цена 2000 ₸',
        small: 'Малый',
        medium: 'Средний',
        large: 'Большой',
        refrigerator: 'Рефрижератор',
        tow: 'Эвакуатор',
        clientPhoto: 'Фото груза',
        followingYou: 'Отслеживаем ваше местоположение',
        locationDenied: 'Разрешите доступ к геолокации для лучшей работы',
        locationPermission: 'Разрешение на геолокацию',
        locationPermissionMessage: 'Для создания точной заявки нам нужен доступ к вашему местоположению. Это поможет клиентам найти вас быстрее.',
        allow: 'Разрешить',
        skip: 'Пропустить',
        locationActive: 'Геолокация активна',
        locationError: 'Ошибка геолокации',
        locationUnavailable: 'Геолокация недоступна'
      },
      kz: {
        createRequest: 'Өтінім жасау',
        from: 'Қайдан',
        to: 'Қайда',
        price: 'Бағасы',
        comment: 'Түсініктеме',
        departureTime: 'Жөнелу уақыты',
        back: 'Артқа',
        checkData: 'Деректерді тексеру',
        confirm: 'Растау',
        requestCreated: 'Өтінім жасалды!',
        searchingClients: 'Қолайлы клиенттерді іздеуде',
        availableRequests: 'Қол жетімді клиент өтінімдері',
        close: 'Жабу',
        enterAddress: 'Мекенжайды енгізіңіз немесе картадан таңдаңыз',
        minimum: 'Минимум',
        additionalInfo: 'Жүк туралы қосымша ақпарат немесе арнайы талаптар',
        selectOnMap: 'Картадан нүктені таңдаңыз',
        routeDistance: 'Қашықтық',
        requestDetails: 'Өтінім мәліметтері',
        contact: 'Байланыс',
        call: 'Қоңырау шалу',
        truckType: 'Көлік түрі',
        noRequests: 'Қол жетімді өтінімдер жоқ',
        loading: 'Жүктелуде...',
        error: 'Қате',
        fillAllFields: 'Барлық міндетті өрістерді толтырыңыз',
        minPrice: 'Минималды баға 2000 ₸',
        small: 'Кіші',
        medium: 'Орта',
        large: 'Үлкен',
        refrigerator: 'Рефрижератор',
        tow: 'Эвакуатор',
        clientPhoto: 'Жүк фотосы',
        followingYou: 'Сіздің орналасқан жеріңізді бақылап отырмыз',
        locationDenied: 'Жақсы жұмыс істеу үшін геолокацияға рұқсат беріңіз',
        locationPermission: 'Геолокацияға рұқсат',
        locationPermissionMessage: 'Дәл өтінім жасау үшін бізге сіздің орналасқан жеріңізге қол жеткізу керек. Бұл клиенттерге сізді тезірек табуға көмектеседі.',
        allow: 'Рұқсат беру',
        skip: 'Өткізіп жіберу',
        locationActive: 'Геолокация белсенді',
        locationError: 'Геолокация қатесі',
        locationUnavailable: 'Геолокация қол жетімді емес'
      }
    };

    function setLang(lang) {
      currentLang = lang;
      document.querySelectorAll('.lang-switch button').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById('lang-' + lang).classList.add('active');
      
      // Update all elements with data attributes
      document.querySelectorAll('[data-ru]').forEach(el => {
        el.textContent = el.getAttribute('data-' + lang) || el.textContent;
      });
      
      // Update placeholders
      if (document.getElementById('from_address')) {
        document.getElementById('from_address').placeholder = translations[lang].enterAddress;
        document.getElementById('to_address').placeholder = translations[lang].enterAddress;
        document.getElementById('price').placeholder = translations[lang].minimum + ' 2000';
        document.getElementById('comment').placeholder = translations[lang].additionalInfo;
      }
      
      // Update main button text based on current step
      updateMainButtonText();
    }

    // Theme management
    function detectSystemTheme() {
      const hour = new Date().getHours();
      return (hour >= 20 || hour < 6) ? 'dark' : 'light';
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }

    let currentTheme = detectSystemTheme();
    applyTheme(currentTheme);

    setInterval(() => {
      const newTheme = detectSystemTheme();
      if (newTheme !== currentTheme) {
        currentTheme = newTheme;
        applyTheme(currentTheme);
      }
    }, 60000);

    // Telegram WebApp initialization
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    
    const user = Telegram.WebApp.initDataUnsafe?.user;
    if (user) {
      document.getElementById('telegram_id').value = user.id;
    }

    // Theme from Telegram
    if (Telegram.WebApp.colorScheme) {
      currentTheme = Telegram.WebApp.colorScheme;
      applyTheme(currentTheme);
    }

    Telegram.WebApp.onEvent('themeChanged', function() {
      if (Telegram.WebApp.colorScheme) {
        currentTheme = Telegram.WebApp.colorScheme;
        applyTheme(currentTheme);
      }
    });

    // Geolocation management
    let locationPermissionGranted = false;
    let watchId = null;
    let locationInterval = null;
    let currentUserLocation = null;

    // Show permission dialog on page load
    function showPermissionDialog() {
      document.getElementById('permissionDialog').style.display = 'flex';
    }

    function requestLocationPermission() {
      document.getElementById('permissionDialog').style.display = 'none';
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            locationPermissionGranted = true;
            currentUserLocation = [position.coords.latitude, position.coords.longitude];
            updateLocationStatus('active', translations[currentLang].locationActive);
            startRealtimeLocationTracking();
            initMapWithPosition(currentUserLocation);
          },
          (error) => {
            console.error('Location permission denied:', error);
            updateLocationStatus('error', translations[currentLang].locationError);
            // Initialize map with default location (Almaty)
            initMapWithPosition([43.238949, 76.889709]);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        updateLocationStatus('error', translations[currentLang].locationUnavailable);
        initMapWithPosition([43.238949, 76.889709]);
      }
    }

    function skipLocationPermission() {
      document.getElementById('permissionDialog').style.display = 'none';
      updateLocationStatus('error', translations[currentLang].locationUnavailable);
      // Initialize map with default location
      initMapWithPosition([43.238949, 76.889709]);
    }

    function updateLocationStatus(status, message) {
      const statusEl = document.getElementById('locationStatus');
      const textEl = document.getElementById('locationText');
      
      statusEl.style.display = 'flex';
      statusEl.className = `location-status ${status}`;
      textEl.textContent = message;
    }

    function startRealtimeLocationTracking() {
      if (!navigator.geolocation || !locationPermissionGranted) return;

      // Start watchPosition for continuous tracking
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newCoords = [position.coords.latitude, position.coords.longitude];
          currentUserLocation = newCoords;
          
          if (userLocationPlacemark && requestMap) {
            userLocationPlacemark.update({coordinates: [newCoords[1], newCoords[0]]});

            const currentCenter = requestMap.location.center;
            const dist = calculateStraightDistance([currentCenter[1], currentCenter[0]], newCoords);
            if (dist > 0.05) {
              requestMap.setLocation({center: [newCoords[1], newCoords[0]], duration: 1000});
            }
          }
        },
        (error) => {
          console.error('Real-time location error:', error);
          updateLocationStatus('error', translations[currentLang].locationError);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 1000
        }
      );

      // Also update location every 1 second using getCurrentPosition for higher accuracy
      locationInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newCoords = [position.coords.latitude, position.coords.longitude];
            const accuracy = position.coords.accuracy;
            
            // Only update if we got a more accurate reading
            if (accuracy <= 50) { // Less than 50 meters accuracy
              currentUserLocation = newCoords;
              
              if (userLocationPlacemark) {
                userLocationPlacemark.geometry.setCoordinates(newCoords);
              }
              
              updateLocationStatus('active', `${translations[currentLang].locationActive} (±${Math.round(accuracy)}m)`);
            }
          },
          (error) => {
            console.error('Interval location error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 1000,
            maximumAge: 0
          }
        );
      }, 1000); // Update every 1 second
    }

    // Map size toggle
    function toggleMapSize() {
      const mapContainer = document.getElementById('mapContainer');
      const icon = document.getElementById('mapSizeIcon');
      
      if (mapContainer.classList.contains('expanded')) {
        mapContainer.classList.remove('expanded');
        icon.textContent = '⬜';
      } else {
        mapContainer.classList.add('expanded');
        icon.textContent = '⬛';
      }
      
      // Resize map
      if (requestMap) {
        setTimeout(() => {
          requestMap.container.fitToViewport();
        }, 300);
      }
    }

    // Yandex Maps with real-time tracking
    let requestMap;
    let fromPlacemark, toPlacemark;
    let userLocationPlacemark;
    let routeLine;
    let selectingPoint = null;

    ymaps3.ready.then(() => {
      // Show permission dialog first
      setTimeout(showPermissionDialog, 1000);
    });

    function initMapWithPosition(center) {
      if (requestMap) {
        requestMap.destroy();
      }

      const {YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapFeature, YMapListener, router} = ymaps3;

      requestMap = new YMap(
        document.getElementById("requestMap"),
        {
          location: {center: center, zoom: 14},
          theme: 'light'
        }
      );

      requestMap.addChild(new YMapDefaultSchemeLayer({}));
      requestMap.addChild(new YMapDefaultFeaturesLayer());

      // Add user location marker
      addUserLocationMarker(center);

      // Add click handler for map selection
      const listener = new YMapListener({
        layer: 'any',
        onClick: (object, event) => {
          if (selectingPoint && event.coordinates) {
            const coords = event.coordinates;
            setPoint(selectingPoint, coords);
            getAddress(coords, selectingPoint);
            selectingPoint = null;
          }
        }
      });
      requestMap.addChild(listener);
    }

    function addUserLocationMarker(coords) {
      if (userLocationPlacemark && requestMap) {
        requestMap.removeChild(userLocationPlacemark);
      }

      const {YMapMarker} = ymaps3;
      const el = document.createElement('div');
      el.className = 'user-location-marker';

      userLocationPlacemark = new YMapMarker(
        { coordinates: coords },
        el
      );

      requestMap.addChild(userLocationPlacemark);
    }

    function selectOnMap(type) {
      selectingPoint = type;
      Telegram.WebApp.showAlert(translations[currentLang].selectOnMap);
    }

    function setPoint(type, coords) {
      if (type === 'from') {
        if (fromPlacemark && requestMap) {
          requestMap.removeChild(fromPlacemark);
        }
        const fromEl = document.createElement('div');
        fromEl.className = 'from-marker';
        fromEl.textContent = 'A';
        fromPlacemark = new YMapMarker({ coordinates: [coords[1], coords[0]], draggable: true }, fromEl);
        fromPlacemark.coords = coords;
        requestMap.addChild(fromPlacemark);

        document.getElementById('from_lat').value = coords[0];
        document.getElementById('from_lon').value = coords[1];
      } else {
        if (toPlacemark && requestMap) {
          requestMap.removeChild(toPlacemark);
        }
        const toEl = document.createElement('div');
        toEl.className = 'to-marker';
        toEl.textContent = 'B';
        toPlacemark = new YMapMarker({ coordinates: [coords[1], coords[0]], draggable: true }, toEl);
        toPlacemark.coords = coords;
        requestMap.addChild(toPlacemark);

        document.getElementById('to_lat').value = coords[0];
        document.getElementById('to_lon').value = coords[1];
      }
      
      updateRoute();
    }

    async function getAddress(coords, type) {
      try {
        const response = await fetch(
          `https://geocode-maps.yandex.ru/1.x/?apikey=8a3e4da0-9ef2-4176-9203-e7014c1dba6f&geocode=${coords[1]},${coords[0]}&format=json&results=1&lang=ru_RU`
        );
        const data = await response.json();
        const items = data.response?.GeoObjectCollection?.featureMember;
        const address = items && items[0]?.GeoObject?.metaDataProperty?.GeocoderMetaData?.text;
        if (address) {
          if (type === 'from') {
            document.getElementById('from_address').value = address;
          } else {
            document.getElementById('to_address').value = address;
          }
        }
      } catch (e) {
        console.error('Geocode error', e);
      }
    }

    async function updateRoute() {
      if (fromPlacemark && toPlacemark) {
        if (routeLine && requestMap) {
          requestMap.removeChild(routeLine);
        }

        const fromCoords = fromPlacemark.coords;
        const toCoords = toPlacemark.coords;

        try {
          const result = await router({
            points: [[fromCoords[1], fromCoords[0]], [toCoords[1], toCoords[0]]],
            type: 'driving'
          });

          if (result && result.routes && result.routes.length > 0) {
            const geometry = result.routes[0].geometry;
            routeLine = new YMapFeature({
              geometry: { type: 'LineString', coordinates: geometry.coordinates },
              style: { stroke: [{ color: '#3b82f6', width: 5, opacity: 0.8 }] }
            });
            requestMap.addChild(routeLine);

            const dist = calculateRouteDistance(geometry.coordinates);
            document.getElementById('routeDistance').textContent =
              translations[currentLang].routeDistance + ': ' + dist.toFixed(1) + ' км';
            document.getElementById('routeInfo').style.display = 'block';
          }
        } catch (err) {
          console.error('Route error', err);
        }
      }
    }

    function calculateStraightDistance(a, b) {
      const R = 6371;
      const dLat = (b[0] - a[0]) * Math.PI / 180;
      const dLon = (b[1] - a[1]) * Math.PI / 180;
      const lat1 = a[0] * Math.PI / 180;
      const lat2 = b[0] * Math.PI / 180;
      const c = 2 * Math.atan2(
        Math.sqrt(
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ),
        Math.sqrt(1 - (
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ))
      );
      return R * c;
    }

    function calculateRouteDistance(coords) {
      let total = 0;
      for (let i = 1; i < coords.length; i++) {
        const prev = [coords[i - 1][1], coords[i - 1][0]];
        const curr = [coords[i][1], coords[i][0]];
        total += calculateStraightDistance(prev, curr);
      }
      return total;
    }

    function calculateBounds(coordinates) {
      let minLon = coordinates[0][0];
      let maxLon = coordinates[0][0];
      let minLat = coordinates[0][1];
      let maxLat = coordinates[0][1];

      coordinates.forEach(c => {
        minLon = Math.min(minLon, c[0]);
        maxLon = Math.max(maxLon, c[0]);
        minLat = Math.min(minLat, c[1]);
        maxLat = Math.max(maxLat, c[1]);
      });

      const lonPad = (maxLon - minLon) * 0.1;
      const latPad = (maxLat - minLat) * 0.1;
      return [
        [minLon - lonPad, minLat - latPad],
        [maxLon + lonPad, maxLat + latPad]
      ];
    }

    // Address suggestions with Kazakhstan priority
    let suggestTimeout;
    
    function setupAddressSuggestions(fieldId) {
      const input = document.getElementById(fieldId);
      const suggestionsId = fieldId + '_suggestions';
      
      input.addEventListener('input', function(e) {
        clearTimeout(suggestTimeout);
        const query = e.target.value;
        
        if (query.length < 3) {
          document.getElementById(suggestionsId).style.display = 'none';
          return;
        }
        
        suggestTimeout = setTimeout(async () => {
          try {
            const items = await ymaps3.search({
              text: query,
              bounds: [[46.99, 41.15], [87.31, 55.44]],
              results: 10
            });
            // Filter and prioritize Kazakhstan results
            const kazakhstanItems = items.filter(item =>
              item.displayName.includes('Казахстан') ||
              item.displayName.includes('Kazakhstan') ||
              item.value.includes('Алматы') ||
              item.value.includes('Астана') ||
              item.value.includes('Нур-Султан')
            );
            
            const otherItems = items.filter(item => 
              !kazakhstanItems.includes(item)
            );
            
            const sortedItems = [...kazakhstanItems, ...otherItems];
            displaySuggestions(fieldId, sortedItems.slice(0, 5));
          } catch (e) {
            console.error('Suggest error', e);
          }
        }, 300);
      });
    }

    setupAddressSuggestions('from_address');
    setupAddressSuggestions('to_address');

    function displaySuggestions(field, items) {
      const container = document.getElementById(field + '_suggestions');
      container.innerHTML = '';
      
      if (items.length === 0) {
        container.style.display = 'none';
        return;
      }
      
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = item.displayName;
        div.onclick = function() {
          document.getElementById(field).value = item.value;
          container.style.display = 'none';
          
          // Geocode to get coordinates
          fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=8a3e4da0-9ef2-4176-9203-e7014c1dba6f&geocode=${encodeURIComponent(item.value)}&format=json&results=1&lang=ru_RU`)
            .then(r => r.json())
            .then(res => {
              const geo = res.response?.GeoObjectCollection?.featureMember?.[0];
              const str = geo?.GeoObject?.Point?.pos;
              if (str) {
                const parts = str.split(' ');
                const coords = [parseFloat(parts[1]), parseFloat(parts[0])];
                const type = field.includes('from') ? 'from' : 'to';
                setPoint(type, coords);
              }
            });
        };
        container.appendChild(div);
      });
      
      container.style.display = 'block';
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.classList.contains('address-input')) {
        document.querySelectorAll('.suggestions-container').forEach(container => {
          container.style.display = 'none';
        });
      }
    });

    // Step navigation
    let currentStep = 1;
    
    function show(step) {
      currentStep = step;
      [1,2,3].forEach(i => {
        const el = document.getElementById('step'+i);
        el.classList.toggle('active', i===step);
      });
      
      // Update fixed buttons
      const fixedButtons = document.getElementById('fixedButtons');
      const backBtn = document.getElementById('backBtn');
      
      if (step === 2) {
        fixedButtons.classList.add('active');
        backBtn.style.display = 'inline-flex';
      } else {
        fixedButtons.classList.remove('active');
      }
      
      Telegram.WebApp.MainButton.hide();
      updateMainButtonText();
      
      if (step === 3) {
        loadClientRequests();
      }
    }

    function updateMainButtonText() {
      if (currentStep === 1) {
        Telegram.WebApp.MainButton.setText('📋 ' + translations[currentLang].checkData);
        Telegram.WebApp.MainButton.show();
        Telegram.WebApp.MainButton.color = '#10b981';
      } else if (currentStep === 2) {
        Telegram.WebApp.MainButton.setText('✅ ' + translations[currentLang].confirm);
        Telegram.WebApp.MainButton.show();
        Telegram.WebApp.MainButton.color = '#3b82f6';
      }
    }

    // Set default departure time to now + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    document.getElementById('departure_time').value = now.toISOString().slice(0, 16);

    // Navigation handlers
    document.getElementById('backBtn').onclick = () => show(1);

    // Form validation and preview
    function buildPreview() {
      const f = document.getElementById('requestForm');
      if (!f.checkValidity()) { 
        f.reportValidity(); 
        return false; 
      }
      
      const price = parseInt(document.getElementById('price').value);
      if (price < 2000) {
        Telegram.WebApp.showAlert(translations[currentLang].minPrice);
        return false;
      }
      
      const data = new FormData(f);
      let html = '';
      
      // Route
      html += `<div class="preview-item">
        <strong>${translations[currentLang].from} → ${translations[currentLang].to}</strong>
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
        <strong>${translations[currentLang].price}</strong>
        ${data.get('price')} ₸
      </div>`;
      
      // Departure time
      const departureTime = new Date(data.get('departure_time'));
      html += `<div class="preview-item">
        <strong>${translations[currentLang].departureTime}</strong>
        ${departureTime.toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'kk-KZ')}
      </div>`;
      
      // Comment
      if (data.get('comment')) {
        html += `<div class="preview-item">
          <strong>${translations[currentLang].comment}</strong>
          ${data.get('comment')}
        </div>`;
      }
      
      document.getElementById('previewContent').innerHTML = html;
      return true;
    }

    // Main button handler
    Telegram.WebApp.onEvent('mainButtonClicked', () => {
      if (currentStep === 1) {
        if (buildPreview()) {
          show(2);
        }
      } else if (currentStep === 2) {
        submitRequest();
      }
    });

    // Submit request
    async function submitRequest() {
      document.getElementById('step2').classList.add('loading');
      Telegram.WebApp.MainButton.showProgress();
      
      const fd = new FormData(document.getElementById('requestForm'));
      
      try {
        const response = await fetch('/api/driver/request', {
          method: 'POST',
          body: fd
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        Telegram.WebApp.MainButton.hideProgress();
        document.getElementById('step2').classList.remove('loading');
        
        if (result.success) {
          show(3);
        } else {
          Telegram.WebApp.showAlert(result.message || translations[currentLang].error);
        }
      } catch (error) {
        console.error('Error:', error);
        Telegram.WebApp.MainButton.hideProgress();
        document.getElementById('step2').classList.remove('loading');
        Telegram.WebApp.showAlert(translations[currentLang].error + ': ' + error.message);
      }
    }

    // Load client requests with intelligent search
    async function loadClientRequests() {
      const container = document.getElementById('clientRequests');
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-text">${translations[currentLang].loading}</div>
      </div>`;
      
      try {
        // Get current user's telegram ID
        const telegramId = document.getElementById('telegram_id').value;
        if (!telegramId) {
          throw new Error('Telegram ID not found');
        }

        // Build search parameters based on available data
        let searchParams = new URLSearchParams({
          telegram_id: telegramId
        });

        // Priority 1: Use current geolocation if available
        if (currentUserLocation && locationPermissionGranted) {
          searchParams.append('search_type', 'geolocation');
          searchParams.append('driver_lat', currentUserLocation[0]);
          searchParams.append('driver_lon', currentUserLocation[1]);
          searchParams.append('radius', '50'); // 50km radius
          console.log("Using geolocation search");
        } 
        // Priority 2: Use route search if form data is available
        else if (document.getElementById('from_address').value && document.getElementById('to_address').value) {
          searchParams.append('search_type', 'route');
          searchParams.append('from_city', document.getElementById('from_address').value);
          searchParams.append('to_city', document.getElementById('to_address').value);
          console.log("Using route search");
        }
        // Priority 3: Fallback to driver's registered start location (handled by backend)
        else {
          searchParams.append('search_type', 'fallback');
          console.log("Using fallback search");
        }
        
        const response = await fetch('/api/driver/search?' + searchParams.toString());
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Driver Search API Response:', data);
        
        if (data.success && data.requests && data.requests.length > 0) {
          displayClientRequests(data.requests);
        } else {
          container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-text">${translations[currentLang].noRequests}</div>
            <div style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted);">
              Search type: ${data.search_type || 'unknown'}
            </div>
          </div>`;
        }
      } catch (error) {
        console.error('Error loading client requests:', error);
        container.innerHTML = `<div class="empty-state">
          <div class="empty-icon">❌</div>
          <div class="empty-text">
            ${translations[currentLang].error}: ${error.message}
          </div>
        </div>`;
      }
    }

    // Display client requests with photos like Indrive app
    function displayClientRequests(requests) {
      const container = document.getElementById('clientRequests');
      container.innerHTML = '';
      
      if (!requests || requests.length === 0) {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">${translations[currentLang].noRequests}</div>
        </div>`;
        return;
      }
      
      requests.forEach(request => {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.onclick = () => showRequestDetail(request);
        
        const truckTypes = {
          'small': { icon: '🚐', name: translations[currentLang].small },
          'medium': { icon: '🚚', name: translations[currentLang].medium },
          'large': { icon: '🚛', name: translations[currentLang].large },
          'refrigerator': { icon: '❄️', name: translations[currentLang].refrigerator },
          'tow': { icon: '🚗', name: translations[currentLang].tow }
        };
        
        const truck = truckTypes[request.truck_type] || truckTypes.medium;
        
        // Handle different possible field names from API
        const fromAddress = request.from_address || request.fromAddress || 'Не указано';
        const toAddress = request.to_address || request.toAddress || 'Не указано';
        const price = request.price || 0;
        const createdAt = request.created_at || request.createdAt || new Date();
        const photoPath = request.photo_path || request.photoPath;
        
        // Create photo section
        let photoSection = '';
        if (photoPath) {
          photoSection = `
            <div class="request-photo">
              <img src="/files/${photoPath}" 
                  alt="Item photo" 
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

    // Show request detail modal with enhanced photo display
    let detailMap;
    function showRequestDetail(request) {
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
        'small': translations[currentLang].small,
        'medium': translations[currentLang].medium,
        'large': translations[currentLang].large,
        'refrigerator': translations[currentLang].refrigerator,
        'tow': translations[currentLang].tow
      };

      // Create photo section for modal
      let photoSection = '';
      if (photoPath) {
        photoSection = `
          <div class="detail-section">
            <div class="detail-label">${translations[currentLang].clientPhoto}</div>
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
          <div class="detail-label">${translations[currentLang].from}</div>
          <div class="detail-value">📍 ${fromAddress}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">${translations[currentLang].to}</div>
          <div class="detail-value">🎯 ${toAddress}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">${translations[currentLang].price}</div>
          <div class="detail-value" style="font-size: 1.8rem; color: var(--accent-primary); font-weight: 700;">
            ${price} ₸
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">${translations[currentLang].truckType}</div>
          <div class="detail-value">${truckTypes[truckType] || truckTypes.medium}</div>
        </div>
        
        ${request.comment ? `
          <div class="detail-section">
            <div class="detail-label">${translations[currentLang].comment}</div>
            <div class="detail-value">${request.comment}</div>
          </div>
        ` : ''}
        
        ${photoSection}
        
        <div class="detail-section">
          <div class="detail-label">${translations[currentLang].contact}</div>
          <div class="detail-value" style="font-size: 1.2rem; font-weight: 600;">${contact}</div>
        </div>
        
        <div class="contact-buttons">
          <button class="contact-btn call-btn" onclick="window.open('tel:${contact}')">
            <span>📞</span>
            <span>${translations[currentLang].call}</span>
          </button>
          <button class="contact-btn whatsapp-btn" onclick="window.open('https://wa.me/${contact.replace(/\D/g, '')}')">
            <span>💬</span>
            <span>WhatsApp</span>
          </button>
          <button class="contact-btn telegram-btn" onclick="window.open('https://t.me/${contact.replace(/\D/g, '')}')">
            <span>✈️</span>
            <span>Telegram</span>
          </button>
        </div>
      `;
      
      modal.style.display = 'block';
      
      // Initialize detail map
      setTimeout(async () => {
        await ymaps3.ready;
        const {YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapFeature, router} = ymaps3;
        detailMap = new YMap(document.getElementById("detailMap"), {
          location: {center: [fromLon, fromLat], zoom: 12},
          theme: 'light'
        });
        detailMap.addChild(new YMapDefaultSchemeLayer({}));
        detailMap.addChild(new YMapDefaultFeaturesLayer());

        const fromEl = document.createElement('div');
        fromEl.className = 'from-marker';
        fromEl.textContent = 'A';
        const fromMark = new YMapMarker({coordinates: [fromLon, fromLat]}, fromEl);

        const toEl = document.createElement('div');
        toEl.className = 'to-marker';
        toEl.textContent = 'B';
        const toMark = new YMapMarker({coordinates: [toLon, toLat]}, toEl);

        detailMap.addChild(fromMark);
        detailMap.addChild(toMark);

        try {
          const res = await router({points: [[fromLon, fromLat], [toLon, toLat]], type: 'driving'});
          if (res && res.routes && res.routes.length > 0) {
            const geom = res.routes[0].geometry;
            const route = new YMapFeature({
              geometry: {type: 'LineString', coordinates: geom.coordinates},
              style: {stroke: [{color: '#3b82f6', width: 5, opacity: 0.8}]}
            });
            detailMap.addChild(route);
            const bounds = calculateBounds([[fromLon, fromLat], [toLon, toLat]]);
            detailMap.setLocation({bounds: bounds, duration: 1000});
          }
        } catch (error) {
          console.error('Route error:', error);
        }
      }, 100);
    }

    // Show full size photo in a separate modal
    function showFullSizePhoto(photoUrl) {
      // Create full-size photo modal
      const fullSizeModal = document.createElement('div');
      fullSizeModal.id = 'fullSizePhotoModal';
      fullSizeModal.className = 'full-size-photo-modal';
      fullSizeModal.innerHTML = `
        <div class="full-size-photo-content">
          <button class="full-size-close-btn" onclick="closeFullSizePhoto()">&times;</button>
          <img src="${photoUrl}" alt="Full size photo" class="full-size-photo">
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
    function closeFullSizePhoto() {
      const modal = document.getElementById('fullSizePhotoModal');
      if (modal) {
        modal.remove();
      }
    }

    // Close modal
    function closeModal() {
      document.getElementById('requestModal').style.display = 'none';
      if (detailMap) {
        detailMap.destroy();
        detailMap = null;
      }
    }

    // Close modal on click outside
    document.getElementById('requestModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal();
      }
    });

    // Clean up location tracking on page unload
    window.addEventListener('beforeunload', () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    });

    // Make functions available globally - ADD TO END OF SCRIPT
    window.selectOnMap = selectOnMap;
    window.closeModal = closeModal;
    window.setLang = setLang;
    window.toggleMapSize = toggleMapSize;
    window.requestLocationPermission = requestLocationPermission;
    window.skipLocationPermission = skipLocationPermission;
    window.showFullSizePhoto = showFullSizePhoto;
    window.closeFullSizePhoto = closeFullSizePhoto;

    // Enhanced close modal function
    function closeModal() {
      document.getElementById('requestModal').style.display = 'none';
      if (detailMap) {
        detailMap.destroy();
        detailMap = null;
      }
      // Also close any full-size photo modals
      const fullSizeModal = document.getElementById('fullSizePhotoModal');
      if (fullSizeModal) {
        fullSizeModal.remove();
      }
    }

    // Initialize
    show(1);
    updateMainButtonText();
