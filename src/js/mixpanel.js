let track = (name, properties = {})=>{
    // Track in Mixpanel
    mixpanel.track(name, properties);
    
    // Also track ad-related events in Google Analytics
    if (typeof gtag === 'function' && name.startsWith('ad_')) {
        gtag('event', name, {
            'event_category': 'Ads',
            'event_label': properties.type || properties.location || 'unknown',
            'value': properties.value || 1
        });
    }
    
    // Log to console in development environments
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Track event:', name, properties);
    }
}

// Enhanced ad tracking functions
function trackAdView(adElement) {
    const adSlot = adElement.dataset.adSlot || adElement.getAttribute('data-ad-slot') || 'unknown';
    const adLocation = adElement.closest('[data-location]')?.dataset.location || 'unknown';
    
    track('ad_viewed', {
        slot: adSlot,
        location: adLocation,
        timestamp: new Date().toISOString()
    });
}

function trackAdClick(adElement) {
    const adSlot = adElement.dataset.adSlot || adElement.getAttribute('data-ad-slot') || 'unknown';
    const adLocation = adElement.closest('[data-location]')?.dataset.location || 'unknown';
    
    track('ad_clicked', {
        slot: adSlot,
        location: adLocation,
        timestamp: new Date().toISOString()
    });
}

// Export functions for global use
window.trackAdView = trackAdView;
window.trackAdClick = trackAdClick;