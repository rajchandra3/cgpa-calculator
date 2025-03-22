//HIDES ALL THE ALERT BOX
$('.alert').hide();

const getParams = ()=> {
    const url = window.location.href;
	let params = {};
	let parser = document.createElement('a');
	parser.href = url;
	let query = parser.search.substring(1);
	let vars = query.split('&');
	for (let i = 0; i < vars.length; i++) {
		const pair = vars[i].split('=');
		params[pair[0]] = decodeURIComponent(pair[1]);
	}
	return params;
};

//get params from url
const queryParams = getParams().tab || 'gc';

if(document.querySelectorAll('centered').length<22){
//   alert('Clear your cache!')  
}

// Correctly define all available tabs based on the nav-links
const availableTabs = ['gc', 'fc', 'sc', 'ec'];

// Hide all tabs initially
for(let tab of availableTabs){
    if(document.querySelector(`#${tab}`)){
        document.querySelector(`#${tab}`).style.display = 'none';
    }
}

// Show the current tab
if(document.querySelector(`#${queryParams}`)){
    document.querySelector(`#${queryParams}`).style.display = '';
} else {
    // If the requested tab doesn't exist, show the default tab (gc)
    if(document.querySelector('#gc')){
        document.querySelector('#gc').style.display = '';
    }
}

//Changing active link
const changeActiveLink = function(){
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to current tab
    const currentTab = queryParams;
    if (document.querySelector(`#nav-${currentTab}`)) {
        document.querySelector(`#nav-${currentTab}`).classList.add('active');
    }
    
    // Bootstrap 5 collapsing the navbar when clicking on a link
    if (document.querySelector('.navbar-collapse.show')) {
        const navbarToggler = document.querySelector('.navbar-toggler');
        const bsCollapse = new bootstrap.Collapse(document.querySelector('.navbar-collapse'));
        bsCollapse.hide();
    }
}
changeActiveLink();

// register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', ()=> {
        navigator.serviceWorker.register('/serviceWorker.js').then((registration)=> {
            // Registration was successful
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, (err)=> {
            // registration failed :(
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// Apply theme for Facebook Comments safely
const updateFacebookComments = (theme) => {
    const fbComments = document.querySelector('.fb-comments');
    if (fbComments) {
        fbComments.setAttribute("data-colorscheme", theme === 'light' ? 'light' : 'dark');
        
        // If Facebook SDK is loaded, reload the comments to apply the new theme
        if (window.FB) {
            try {
                window.FB.XFBML.parse();
            } catch (e) {
                console.error('Error refreshing Facebook comments:', e);
            }
        }
    }
};

//apply ui theme
const applyTheme = (ui_theme)=>{
    window.localStorage.setItem('ui_theme', ui_theme || 'dark');
    
    // Set data attribute on body for better theme styling
    document.body.setAttribute('data-bs-theme', ui_theme || 'dark');
    
    // Update both theme selectors
    if (document.querySelector('#theme-selector')) {
        document.querySelector('#theme-selector').value = ui_theme || 'dark';
    }
    
    // Update the navbar theme switch
    if (document.querySelector('#themeSelector')) {
        document.querySelector('#themeSelector').checked = (ui_theme === 'dark');
    }
    
    // Remove any existing theme stylesheets
    const existingThemeLinks = document.querySelectorAll('link[data-theme-stylesheet]');
    existingThemeLinks.forEach(link => link.remove());
    
    if(ui_theme==='dark'){
        // Update Facebook comments theme
        updateFacebookComments('dark');
        
        // Add the dark theme CSS link to head
        const darkThemeLink = document.createElement('link');
        darkThemeLink.rel = "stylesheet";
        darkThemeLink.type = "text/css";
        darkThemeLink.href = "./src/css/themes/dark.css";
        darkThemeLink.setAttribute('data-theme-stylesheet', 'true');
        document.head.appendChild(darkThemeLink);
        
        // Apply dark theme to navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.remove('navbar-light', 'bg-light', 'bg-primary');
            navbar.classList.add('navbar-dark', 'bg-dark');
        }
    } else if(ui_theme==='light'){
        // Update Facebook comments theme
        updateFacebookComments('light');
        
        // Add the light theme CSS link to head
        const lightThemeLink = document.createElement('link');
        lightThemeLink.rel = "stylesheet";
        lightThemeLink.type = "text/css";
        lightThemeLink.href = "./src/css/themes/light.css";
        lightThemeLink.setAttribute('data-theme-stylesheet', 'true');
        document.head.appendChild(lightThemeLink);
        
        // Apply light theme to navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.remove('navbar-dark', 'bg-dark');
            navbar.classList.add('navbar-light', 'bg-light');
        }
    } else {
        // Update Facebook comments theme
        updateFacebookComments('dark');
        
        // Add the dark theme CSS link to head (default)
        const darkThemeLink = document.createElement('link');
        darkThemeLink.rel = "stylesheet";
        darkThemeLink.type = "text/css";
        darkThemeLink.href = "./src/css/themes/dark.css";
        darkThemeLink.setAttribute('data-theme-stylesheet', 'true');
        document.head.appendChild(darkThemeLink);
        
        // Apply dark theme to navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.remove('navbar-light', 'bg-light', 'bg-primary');
            navbar.classList.add('navbar-dark', 'bg-dark');
        }
    }
    
    // Apply input field styles based on theme
    setTimeout(() => {
        document.querySelectorAll('input, select').forEach(input => {
            input.setAttribute('data-theme', ui_theme || 'dark');
        });
    }, 100);
}

//onload
let ui_theme = window.localStorage.getItem('ui_theme');
applyTheme(ui_theme);

//handle theme change from dropdown
if (document.querySelector('#theme-selector')) {
    document.querySelector('#theme-selector').addEventListener('change',(e)=>{
        applyTheme(e.target.value);
    });
}

//handle theme change from navbar switch
if (document.querySelector('#themeSelector')) {
    document.querySelector('#themeSelector').addEventListener('change',(e)=>{
        applyTheme(e.target.checked ? 'dark' : 'light');
    });
}

// Enhanced interstitial ad function based on performance data
function showInterstitialAd(callback) {
    // Get the interstitial chance from config
    let chance = 0.10; // Default chance
    
    try {
        if (window.adConfig && window.adConfig.calculators) {
            const urlParams = new URLSearchParams(window.location.search);
            const currentCalculator = urlParams.get('tab') || 'sc';
            const config = window.adConfig.calculators[currentCalculator] || window.adConfig.calculators['sc'];
            chance = config.interstitialChance;
        }
    } catch (e) {
        console.error('Error getting interstitial chance:', e);
    }
    
    // Performance metrics tracking
    const startTime = performance.now();
    
    // Track opportunity for interstitial ad
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const currentCalculator = urlParams.get('tab') || 'sc';
        
        // Check if interstitial ads are properly initialized
        if (typeof track === 'function') {
            track('interstitial_opportunity', {
                calculator: currentCalculator,
                chance: chance,
                testGroup: window.adConfig?.isTestGroup ? 'test' : 'control'
            });
        }
    } catch (e) {
        console.error('Error tracking interstitial opportunity:', e);
    }
    
    // Convert chance to percentage and decide whether to show ad
    if (Math.random() >= chance) {
        // Skip the ad - execute callback and return
        if (callback && typeof callback === 'function') {
            callback();
        }
        return;
    }
    
    // Check if an ad is already showing
    if (document.querySelector('.interstitial-overlay')) {
        console.log('Interstitial ad already showing, skipping');
        if (callback && typeof callback === 'function') {
            callback();
        }
        return;
    }
    
    // Create overlay container for the interstitial ad
    const overlay = document.createElement('div');
    overlay.className = 'interstitial-overlay';
    
    // Create the interstitial container
    const container = document.createElement('div');
    container.className = 'interstitial-container';
    
    // Create header with a close button
    const header = document.createElement('div');
    header.className = 'interstitial-header';
    
    // Add title to header
    const title = document.createElement('h4');
    title.textContent = 'Advertisement';
    header.appendChild(title);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'interstitial-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close advertisement');
    header.appendChild(closeBtn);
    
    // Create content area for the ad
    const content = document.createElement('div');
    content.className = 'interstitial-content';
    
    // Add the AdSense ad
    const adIns = document.createElement('ins');
    adIns.className = 'adsbygoogle';
    adIns.style.display = 'block';
    adIns.setAttribute('data-ad-client', 'ca-pub-8598751574376549');
    adIns.setAttribute('data-ad-slot', '6993669367');
    adIns.setAttribute('data-ad-format', 'rectangle');
    adIns.setAttribute('data-full-width-responsive', 'false');
    content.appendChild(adIns);
    
    // Create footer with continue button
    const footer = document.createElement('div');
    footer.className = 'interstitial-footer';
    
    // Add continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn btn-primary interstitial-continue';
    continueBtn.textContent = 'Continue to Calculator';
    footer.appendChild(continueBtn);
    
    // Assemble the container
    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(footer);
    
    // Add container to overlay
    overlay.appendChild(container);
    
    // Add overlay to document
    document.body.appendChild(overlay);
    
    // Set up ad loaded detection
    const setupAdLoadedDetection = () => {
        if ('MutationObserver' in window) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'data-ad-status') {
                        const status = mutation.target.getAttribute('data-ad-status');
                        if (status === 'filled') {
                            content.classList.add('loaded');
                            observer.disconnect();
                        } else if (status === 'unfilled') {
                            // Ad couldn't be filled - close the overlay
                            closeInterstitial('ad_unfilled');
                            observer.disconnect();
                        }
                    }
                });
            });
            
            // Start observing the ad element
            observer.observe(adIns, { attributes: true });
            
            // Set a timeout in case the ad doesn't load
            setTimeout(() => {
                if (!content.classList.contains('loaded')) {
                    closeInterstitial('ad_timeout');
                    observer.disconnect();
                }
            }, 5000); // 5 second timeout for ad loading
        }
    };
    
    // Initialize the ad
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
        setupAdLoadedDetection();
        
        // Track interstitial ad view
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const currentCalculator = urlParams.get('tab') || 'sc';
            if (typeof track === 'function') {
                track('interstitial_view', {
                    calculator: currentCalculator,
                    chance: chance,
                    loadTime: Math.round(performance.now() - startTime),
                    testGroup: window.adConfig?.isTestGroup ? 'test' : 'control'
                });
            }
        } catch (e) {
            console.error('Error tracking interstitial view:', e);
        }
    } catch (e) {
        console.error('Error showing interstitial ad:', e);
        // Remove the overlay on error
        overlay.remove();
        // Execute callback
        if (callback && typeof callback === 'function') {
            callback();
        }
        return;
    }
    
    // Function to close the interstitial and continue
    const closeInterstitial = (closeMethod) => {
        overlay.classList.add('closing');
        
        // Track close method
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const currentCalculator = urlParams.get('tab') || 'sc';
            if (typeof track === 'function') {
                track('interstitial_close', {
                    calculator: currentCalculator,
                    method: closeMethod,
                    displayDuration: Math.round(performance.now() - startTime),
                    adLoaded: content.classList.contains('loaded'),
                    testGroup: window.adConfig?.isTestGroup ? 'test' : 'control'
                });
            }
        } catch (e) {
            console.error('Error tracking interstitial close:', e);
        }
        
        // Remove the overlay after animation completes
        setTimeout(() => {
            overlay.remove();
            // Execute callback once the overlay is closed
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, 500); // Match animation duration
    };
    
    // Event handlers for various ways to close
    closeBtn.addEventListener('click', () => closeInterstitial('close_button'));
    continueBtn.addEventListener('click', () => closeInterstitial('continue_button'));
    
    // Close when clicking outside the container (on the overlay)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeInterstitial('overlay_click');
        }
    });
    
    // Auto-close after 12 seconds for better user experience
    const autoCloseTimeout = setTimeout(() => {
        if (document.body.contains(overlay)) {
            closeInterstitial('auto_timeout');
        }
    }, 12000);
    
    // Add escape key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            clearTimeout(autoCloseTimeout);
            closeInterstitial('escape_key');
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Function to handle URL parameters for tab navigation
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    
    // Default tab is GPA calculator (sc)
    let targetTab = 'sc';
    
    // If valid tab parameter is provided, use that
    if (tab && ['sc', 'gc', 'ec', 'fc'].includes(tab)) {
        targetTab = tab;
    }
    
    // First, hide all tabs
    document.querySelectorAll('.calculator-tab').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Show interstitial ad before displaying the tab
    showInterstitialAd(function() {
        // Get the target tab element
        const targetTabElement = document.getElementById(targetTab);
        
        // Show the target tab
        if (targetTabElement) {
            targetTabElement.style.display = 'flex';
            
            // Update active state in navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                
                if (link.getAttribute('data-tab') === targetTab) {
                    link.classList.add('active');
                }
            });
            
            // Track page view for analytics
            try {
                track('page_view', {
                    calculator: targetTab,
                    referrer: document.referrer
                });
            } catch (e) {
                console.error('Error tracking page view', e);
            }
        } else {
            // Fallback to GPA calculator if target tab not found
            const defaultTab = document.getElementById('sc');
            if (defaultTab) {
                defaultTab.style.display = 'flex';
                
                // Update active state in navigation for default
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    
                    if (link.getAttribute('data-tab') === 'sc') {
                        link.classList.add('active');
                    }
                });
            }
        }
    });
}

// Function to navigate to a specific tab
function navigateToTab(tabId) {
    // Update URL parameter
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
    
    // Hide all tabs
    document.querySelectorAll('.calculator-tab').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Show interstitial ad before showing the tab
    showInterstitialAd(function() {
        // Show the selected tab
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.style.display = 'flex';
            
            // Update active state in navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                
                if (link.getAttribute('data-tab') === tabId) {
                    link.classList.add('active');
                }
            });
            
            // Track tab navigation
            try {
                track('tab_change', {
                    calculator: tabId,
                    previous: new URLSearchParams(window.location.search).get('tab') || 'sc'
                });
            } catch (e) {
                console.error('Error tracking tab change', e);
            }
        }
    });
}

// Set up tab navigation on load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs based on URL
    handleUrlParams();
    
    // Set up click handlers for tab navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                navigateToTab(tabId);
            }
        });
    });
    
    // Initialize ad optimization if available
    if (typeof optimizeAdsByUserBehavior === 'function') {
        optimizeAdsByUserBehavior();
    }
});

// Initialize the UI
document.addEventListener('DOMContentLoaded', function() {
    // Handle URL parameters and navigation
    handleUrlParams();
    
    // Setup theme selector
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        // Set initial theme from localStorage or system preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-bs-theme', savedTheme);
            themeSelector.value = savedTheme;
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
                themeSelector.value = 'dark';
            }
        }
        
        // Listen for theme changes
        themeSelector.addEventListener('change', function() {
            const theme = this.value;
            document.documentElement.setAttribute('data-bs-theme', theme);
            localStorage.setItem('theme', theme);
            
            // Track theme change
            try {
                track('theme_changed', {
                    theme: theme
                });
            } catch (e) {
                console.error('Error tracking theme change', e);
            }
        });
    }
});

