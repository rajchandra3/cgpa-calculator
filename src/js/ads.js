// const jumboAvailableAds = [
//     {
//         title:'Install App',
//         desc:'No more googling to find the the CGPA Calculator, install the app in your device (Available on Mobile & Laptops)',
//         logo:'https://files.rajchandra.me/images/logos/cgpa-calculator.png',
//         link:'',
//         type:'download',
//         cta_text:'Install Now'
//     },
//     {
//         title:'Play Color Tile Game',
//         desc:'Are you bored studying, check out easy to play color game, all you need is a correct guess!',
//         logo:'https://files.rajchandra.me/images/logos/color-tile.png',
//         link:'https://rajchandra.me/r/0biYgwkl4?s=jumbotron-ad&m=cgpa-calculator',
//         type:'link',
//         cta_text:'Play Now'
//     },
//     {
//         title:'',
//         desc:'',
//         logo:'',
//         link:'',
//         type:'',
//         cta_text:'Install Now'
//     }
// ]

// const jumboAd = jumboAvailableAds[0];

// document.querySelector('.ad-1-title').innerHTML=jumboAd.title;
// document.querySelector('.ad-1-description').innerHTML=jumboAd.desc; 
// document.querySelector('.ad-1-logo').innerHTML=`
// <a href="${jumboAd.link}" target="_blank">
// <img src="${jumboAd.logo}" height="100" class="rounded p-2">
// </a>
// `;
// document.querySelector('.ad-1-link').href = jumboAd.link;
// switch(jumboAd.cta_type){
//     case 'link':
//         document.querySelector('cta').innerHTML = `
//             <a href=${jumboAd.link} target="_blank" class="ad-1-link">
//                 <div class="btn btn-success ad-1-cta">${jumboAd.cta_text}</div>
//             </a>
//         `;
//     break;
//     case 'download':
//         document.querySelector('cta').innerHTML = `
//             <div class="btn btn-success ad-1-cta ">${jumboAd.cta_text}</div>
//         `;
//     break;

// }
// document.querySelector('.ad-1-cta').innerHTML = jumboAd.cta_text;
const affliateLinks = [
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=9351772071&asins=9351772071&linkId=d92a1fe57fdeaa05ae50e96d2133c1c6&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=9389432014&asins=9389432014&linkId=85e2439b8ac678839b4f6dac0da9d39e&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=tf_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=1612680194&asins=1612680194&linkId=5562283e459a6e93c301c9c7df61e21c&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B0869855B8&asins=B0869855B8&linkId=7f331ec4907b75ba93ff62e005b81d31&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B086CSGV2N&asins=B086CSGV2N&linkId=ad5801e10e49f33ffcb7e473dba11c98&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B08CVMXPGY&asins=B08CVMXPGY&linkId=91a288d6fc4d447ca527de0ceb23db14&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B08CVMVW3X&asins=B08CVMVW3X&linkId=dafb690e25f34337d966e1a97fffd817&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=tf_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=0008386595&asins=0008386595&linkId=0b7bffa49a418cfa2d75ed80fcd04578&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=tf_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=1612680194&asins=1612680194&linkId=bbf387aa8331862f39ee7dabb6217da7&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B07LDH32ZP&asins=B07LDH32ZP&linkId=344ddb2eea0426526ffe2923d896b2f3&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B085J19V4P&asins=B085J19V4P&linkId=12b0858a69d2a74e8f3e4dc371361c41&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B07M67W1PH&asins=B07M67W1PH&linkId=b31ea751b788fe2d7f6a74ffa9b5a9f4&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B08CVMVW3X&asins=B08CVMVW3X&linkId=e2328851b3f64dcf8053e67746bbb436&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B08HV83HL3&asins=B08HV83HL3&linkId=6dfdc564010c383c952b4c73a933eebc&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B08HVJCW95&asins=B08HVJCW95&linkId=359729964effc95446455edb6a49f5a2&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B08HVL8QN3&asins=B08HVL8QN3&linkId=27d187ba8a5d3ee67642fb67ce24c382&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`,
    `<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-in.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=IN&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=craj0318g-21&marketplace=amazon&region=IN&placement=B073NTCT4Q&asins=B073NTCT4Q&linkId=8f55b827d0c8877d74b8f335d76bd7e8&show_border=true&link_opens_in_new_window=true&price_color=333333&title_color=0066c0&bg_color=ffffff">
    </iframe>`
]

let getAds = ()=>{
    return `
        <div class="google-ads pb-2">
            <div class="ad-container">
                <div class="ad-head">Advertisement</div>
                <ins class="adsbygoogle"
                    style="display:inline-block;width:360px;height:90px"
                    data-ad-client="ca-pub-8598751574376549"
                    data-ad-slot="3230015020"></ins>
                <script>
                    (adsbygoogle = window.adsbygoogle || []).push({});
                </script>
            </div>
        </div>`;
    // return `<div>${affliateLinks[Math.floor(Math.random()*(affliateLinks.length))]} ${affliateLinks[Math.floor(Math.random()*(affliateLinks.length))]}</div>`;
}

let getAdsManual = ()=>{ //typeOfAd
    let ads = [
        {
            type : `tw`,
            title: `Color Tile`,
            logo: `https://color-tile.rajchandra.me/src/images/icons/icon-512x512.png`,
            body : `Stay Indoor, Play Color Tile`,
            link : `https://rajchandra.me/r/0biYgwkl4?s=card_cta_ad&m=cgpa-calculator`,
            linkText : `Play Now`
        },
        {
            type : `tf`,
            title: `Color Tile`,
            logo: `https://color-tile.rajchandra.me/src/images/icons/icon-512x512.png`,
            body : `I challenge you to win 5 games in a row, can you?`,
            link : `https://rajchandra.me/r/0biYgwkl4?s=card_cta_ad&m=cgpa-calculator`,
            linkText : `Challenge Accepted?`
        },
        {
            type : `ts`,
            title: `Color Tile`,
            logo: `https://color-tile.rajchandra.me/src/images/icons/icon-512x512.png`,
            body : `Aren't you bored yet? Huh, I am, I play color tile do you?`,
            link : `https://rajchandra.me/r/0biYgwkl4?s=card_cta_ad&m=cgpa-calculator`,
            linkText : `Play Color Tile`
        },
        {
            type : `i`,
            title: `Color Tile`,
            logo: `https://color-tile.rajchandra.me/src/images/icons/icon-512x512.png`,
            body : `Checking my cgpa all the time is no fun, you know what is fun, THE COLOR GAME`,
            link : `https://rajchandra.me/r/0biYgwkl4?s=card_cta_ad&m=cgpa-calculator`,
            linkText : `Let's play`
        }
    ]

    let AdNumber = Math.floor(Math.random()*(ads.length));
    ad = ads[AdNumber];
    let templates = [
            `
            <div class="custom-ads" style="
                font-family: Verdana, Geneva, Tahoma, sans-serif;
                width: 100%;
                margin : 0;
                border-radius : 5px;
                border : 0.5px dashed #000;
                text-align : left;"
                >
                <div class="d-flex">
                    <div style="width: 25%;">
                        <img width="100%" height="100%" src="${ad.logo}" alt="">
                    </div>
                    <div style="width: 75%; padding: 0.5rem;">
                        <h4 class="font-weight-bolder">${ad.title}</h4>
                        <span class="text-small text-secondary">${ad.body}</span>
                        <a 
                            href="${ad.link}"
                            target="_blank"
                            class="btn btn-secondary" 
                            style="
                                width: 100%; 
                                margin-top: 1rem;
                            "
                        >
                            ${ad.linkText}
                        </a>
                    </div>
                </div>
            </div>
            `
    ]
    let templateNumber = Math.floor(Math.random()*(templates.length));
    return templates[templateNumber];
}

// Lazy load ads function
function initLazyAds() {
    if ('IntersectionObserver' in window) {
        let lazyAdObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    let adContainer = entry.target;
                    
                    // Check if the ad is already loaded
                    if (!adContainer.classList.contains('loaded')) {
                        let adInsElement = adContainer.querySelector('ins.adsbygoogle');
                        if (adInsElement) {
                            (adsbygoogle = window.adsbygoogle || []).push({});
                            adContainer.classList.add('loaded');
                            // Track ad view
                            try {
                                track('ad_viewed', {
                                    location: adContainer.dataset.location || 'unknown',
                                    slot: adInsElement.dataset.adSlot || 'unknown'
                                });
                            } catch (e) {
                                console.log('Error tracking ad view', e);
                            }
                        }
                    }
                    
                    lazyAdObserver.unobserve(adContainer);
                }
            });
        }, {
            rootMargin: '100px 0px'
        });
        
        document.querySelectorAll('.lazy-ad').forEach(function(ad) {
            lazyAdObserver.observe(ad);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('.lazy-ad').forEach(function(ad) {
            ad.classList.remove('lazy-ad');
            let adInsElement = ad.querySelector('ins.adsbygoogle');
            if (adInsElement) {
                (adsbygoogle = window.adsbygoogle || []).push({});
            }
        });
    }
}

// Enhanced ad optimization based on performance data
function optimizeAdsByUserBehavior() {
    console.log('Optimizing ads based on user behavior and performance data');
    
    // Current calculator from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentCalculator = urlParams.get('tab') || 'sc';
    
    // Define ad configuration based on conversion rates and ad performance
    // sc: GPA Calculator (62.33%) - Highest CTR
    // gc: Quick CGPA Calculator (13.29%) 
    // fc: All sem CGPA Calculator (3.51%)
    // ec: Expected marks calculator (0.39%) - Lowest CTR
    
    // Get A/B test segment - use 60% for test group since performance data is promising
    const isTestGroup = getABTestSegment(0.6); 
    
    // Initialize global ad config
    window.adConfig = {
        isTestGroup: isTestGroup,
        calculators: {
            'sc': { // GPA Calculator - Highest converting
                maxAds: isTestGroup ? 4 : 3, // Increase ad density for test group
                interstitialChance: isTestGroup ? 0.25 : 0.20, // Increase interstitial chance
                stickyAdDelay: 3000, // Show sticky ads sooner
                highCpcFormats: true, // Use rectangle formats for better CPC
                priority: 1
            },
            'gc': { // Quick CGPA - Second highest
                maxAds: isTestGroup ? 3 : 2,
                interstitialChance: isTestGroup ? 0.18 : 0.15,
                stickyAdDelay: 5000,
                highCpcFormats: true,
                priority: 2
            },
            'fc': { // All sem CGPA - Low converting
                maxAds: 2,
                interstitialChance: isTestGroup ? 0.12 : 0.10,
                stickyAdDelay: 8000,
                highCpcFormats: false,
                priority: 3
            },
            'ec': { // Marks predictor - Lowest converting
                maxAds: isTestGroup ? 2 : 1,
                interstitialChance: isTestGroup ? 0.08 : 0.05,
                stickyAdDelay: 12000,
                highCpcFormats: false,
                priority: 4
            }
        },
        viewabilityThreshold: 0.8, // Higher threshold for viewability tracking
        viewTimeRequired: 1000, // Time in ms ad needs to be viewable to count
        formatPreferences: {
            highCpc: ['rectangle', 'medium_rectangle', 'large_rectangle'],
            fallback: ['auto']
        }
    };
    
    // Log configuration for debugging
    console.log(`Ad optimization: Using ${isTestGroup ? 'TEST' : 'CONTROL'} group settings`);
    console.log(`Current calculator: ${currentCalculator}`);
    
    // Apply optimal ad settings based on calculator type
    const config = window.adConfig.calculators[currentCalculator] || window.adConfig.calculators['sc'];

    // Get all calculator tabs for processing
    const calculatorTabs = document.querySelectorAll('[id="sc"], [id="gc"], [id="ec"], [id="fc"]');
    calculatorTabs.forEach(tab => {
        const calculatorId = tab.id;
        const tabConfig = window.adConfig.calculators[calculatorId];
        
        // Configure mid-form ads
        const midFormAds = tab.querySelectorAll('.mid-form-ad');
        midFormAds.forEach((adContainer, index) => {
            // Set location data attribute for tracking
            if (!adContainer.dataset.location) {
                const location = `${calculatorId}_mid_form_${index + 1}`;
                adContainer.dataset.location = location;
            }
            
            // Apply different styling for high vs low converting calculators
            if (['sc', 'gc'].includes(calculatorId)) {
                adContainer.classList.add('high-converting');
                
                // Set optimal ad format for higher CPC
                const adInsElement = adContainer.querySelector('.adsbygoogle');
                if (adInsElement && tabConfig.highCpcFormats) {
                    adInsElement.setAttribute('data-ad-format', 'rectangle');
                    adInsElement.setAttribute('data-full-width-responsive', 'false');
                }
            } else {
                adContainer.classList.add('low-converting');
            }
            
            // Show or hide based on max ads setting
            if (index >= tabConfig.maxAds) {
                adContainer.style.display = 'none';
            } else {
                adContainer.style.display = 'block';
                
                // Enhance viewability for visible ads
                enhanceAdViewability(adContainer);
            }
        });
        
        // Configure vertical ad columns for better CTR
        const verticalAdColumns = tab.querySelectorAll('.vertical-ads');
        verticalAdColumns.forEach(column => {
            // Enhance ad positions based on performance data
            if (calculatorId === 'sc' || calculatorId === 'gc') {
                column.classList.add('high-ctr-layout');
                
                // Reposition to optimal screen position
                if (window.innerWidth > 1200 && isTestGroup) {
                    column.style.position = 'sticky';
                    column.style.top = '80px';
                }
            }
        });
    });
    
    // Initialize enhanced tracking
    initEnhancedAdTracking();
    
    console.log('Ad optimization applied for calculator: ' + 
        (new URLSearchParams(window.location.search).get('tab') || 'sc'));
    
    // Return the config for other functions to use
    return window.adConfig;
}

// Enhanced ad viewability function for better CTR
function enhanceAdViewability(adContainer) {
    // Add attention-grabbing animation if in test group
    if (window.adConfig && window.adConfig.isTestGroup) {
        // Add subtle animation to draw attention
        adContainer.classList.add('enhanced-viewability');
        
        // Add subtle border to enhance ad separation 
        adContainer.style.borderLeft = '2px solid rgba(0,123,255,0.1)';
        adContainer.style.borderRight = '2px solid rgba(0,123,255,0.1)';
    }
    
    // Set up in-view tracking with longer view time requirement
    if ('IntersectionObserver' in window) {
        const viewTimeRequired = window.adConfig?.viewTimeRequired || 1000;
        let viewTimer = null;
        let hasBeenViewed = false;
        
        const viewabilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const ratio = entry.intersectionRatio;
                const threshold = window.adConfig?.viewabilityThreshold || 0.5;
                
                if (ratio >= threshold && !hasBeenViewed) {
                    // Start timer when ad becomes visible
                    if (!viewTimer) {
                        viewTimer = setTimeout(() => {
                            hasBeenViewed = true;
                            
                            // Add class to indicate viewed status
                            adContainer.classList.add('viewed');
                            
                            // Track view for analytics
                            if (typeof track === 'function') {
                                track('ad_viewed_completely', {
                                    location: adContainer.dataset.location || 'unknown',
                                    calculator: new URLSearchParams(window.location.search).get('tab') || 'sc',
                                    viewTime: viewTimeRequired,
                                    testGroup: window.adConfig?.isTestGroup ? 'test' : 'control'
                                });
                            }
                            
                            // Stop observing after view is counted
                            viewabilityObserver.disconnect();
                        }, viewTimeRequired);
                    }
                } else {
                    // Clear timer if ad goes out of view
                    if (viewTimer) {
                        clearTimeout(viewTimer);
                        viewTimer = null;
                    }
                }
            });
        }, {
            threshold: [0.3, 0.5, 0.8, 1.0] // Track different visibility thresholds
        });
        
        // Start observing
        viewabilityObserver.observe(adContainer);
    }
}

// Initialize enhanced ad tracking for better analytics
function initEnhancedAdTracking() {
    // Track ad clicks for CTR improvement analysis
    document.addEventListener('click', function(event) {
        // Find closest ad container if click is within an ad
        const adContainer = event.target.closest('.ad-container, .mid-form-ad');
        if (adContainer) {
            // Track the potential ad click
            try {
                if (typeof track === 'function') {
                    track('potential_ad_click', {
                        location: adContainer.dataset.location || 'unknown',
                        calculator: new URLSearchParams(window.location.search).get('tab') || 'sc',
                        testGroup: window.adConfig?.isTestGroup ? 'test' : 'control',
                        pagePosition: getElementPosition(adContainer)
                    });
                }
            } catch (e) {
                console.error('Error tracking potential ad click', e);
            }
        }
    }, true); // Use capture phase to detect clicks before they reach the ad
    
    // Helper to get element position on page
    function getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        return {
            top: rect.top + scrollTop,
            left: rect.left,
            bottom: rect.bottom + scrollTop,
            percentageDown: (rect.top + scrollTop) / document.body.scrollHeight
        };
    }
}

// Get A/B test segment with configurable test group size
function getABTestSegment(testGroupSize = 0.5) {
    // Use stored test group if available
    const storedGroup = localStorage.getItem('adTestGroup');
    if (storedGroup) {
        return storedGroup === 'test';
    }
    
    // Assign new test group
    const isTestGroup = Math.random() < testGroupSize;
    
    // Store for consistency across sessions
    localStorage.setItem('adTestGroup', isTestGroup ? 'test' : 'control');
    
    return isTestGroup;
}

// Preload ads for high-converting pages
function preloadHighPriorityAds() {
    // Only preload for high-converting calculators (sc and gc)
    const currentTab = new URLSearchParams(window.location.search).get('tab') || 'sc';
    
    // Only preload for high-converting calculators (sc and gc)
    if (currentTab === 'sc' || currentTab === 'gc') {
        console.log('Preloading ads for high-priority calculator:', currentTab);
        
        try {
            // Preload primary ad containers first
            const adContainers = document.querySelectorAll(`.mid-form-ad[data-location^="${currentTab}"]`);
            
            // Preload each ad with slight delay to avoid too many simultaneous requests
            adContainers.forEach((container, index) => {
                setTimeout(() => {
                    try {
                        // Get ad element
                        const adElement = container.querySelector('.adsbygoogle');
                        if (adElement && !adElement.getAttribute('data-adsbygoogle-status')) {
                            // Push to AdSense
                            (adsbygoogle = window.adsbygoogle || []).push({});
                            
                            // Track preloaded ad
                            if (typeof track === 'function') {
                                track('ad_preloaded', {
                                    location: container.dataset.location || 'unknown',
                                    calculator: currentTab,
                                    index: index
                                });
                            }
                        }
                    } catch (e) {
                        console.error('Error preloading ad:', e);
                    }
                }, index * 200); // Stagger preloading
            });
            
            console.log(`Preloaded ${adContainers.length} ads for ${currentTab}`);
        } catch (e) {
            console.error('Error in preloadHighPriorityAds:', e);
        }
    }
}

// Create sticky ad function
function createStickyAd() {
    // Check if we already have a sticky ad
    if (document.querySelector('.sticky-ad')) {
        return;
    }
    
    // Get the current calculator for customization
    const urlParams = new URLSearchParams(window.location.search);
    const currentCalculator = urlParams.get('tab') || 'sc';
    
    // Skip creating sticky ad based on calculator priority
    if (window.adConfig && window.adConfig.calculators) {
        const config = window.adConfig.calculators[currentCalculator] || window.adConfig.calculators['sc'];
        
        // For lowest priority calculators, maybe skip sticky ad entirely
        if (config.priority > 3 && Math.random() > 0.5) {
            console.log('Skipping sticky ad for low priority calculator');
            return;
        }
    }
    
    // Create sticky ad container
    const stickyAdContainer = document.createElement('div');
    stickyAdContainer.className = 'sticky-ad';
    stickyAdContainer.dataset.location = `${currentCalculator}_sticky`;
    
    // Add close button
    const closeButton = document.createElement('div');
    closeButton.className = 'sticky-ad-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', function() {
        stickyAdContainer.classList.add('closing');
        setTimeout(function() {
            if (stickyAdContainer.parentNode) {
                stickyAdContainer.parentNode.removeChild(stickyAdContainer);
            }
        }, 500);
        
        // Track close events
        try {
            if (typeof track === 'function') {
                track('ad_closed', {
                    type: 'sticky',
                    calculator: currentCalculator,
                    test_group: window.adConfig && window.adConfig.isTestGroup ? 'test' : 'control'
                });
            }
        } catch (e) {
            console.error('Error tracking sticky ad close', e);
        }
    });
    
    // Create ad content
    const adContent = document.createElement('div');
    adContent.className = 'sticky-ad-content';
    
    // Create AdSense ad
    const adInsElement = document.createElement('ins');
    adInsElement.className = 'adsbygoogle';
    adInsElement.style.display = 'inline-block';
    adInsElement.style.width = '320px';
    adInsElement.style.height = '100px';
    adInsElement.setAttribute('data-ad-client', 'ca-pub-8598751574376549');
    adInsElement.setAttribute('data-ad-slot', '5105542799');
    
    // Add ad to content
    adContent.appendChild(adInsElement);
    
    // Assemble sticky ad
    stickyAdContainer.appendChild(closeButton);
    stickyAdContainer.appendChild(adContent);
    
    // Add to document
    document.body.appendChild(stickyAdContainer);
    
    // Initialize ad
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
        
        // Track ad display
        try {
            if (typeof track === 'function') {
                track('ad_displayed', {
                    type: 'sticky',
                    calculator: currentCalculator,
                    test_group: window.adConfig && window.adConfig.isTestGroup ? 'test' : 'control'
                });
            }
        } catch (e) {
            console.error('Error tracking sticky ad display', e);
        }
    } catch (e) {
        console.error('Error creating sticky ad:', e);
        if (stickyAdContainer.parentNode) {
            stickyAdContainer.parentNode.removeChild(stickyAdContainer);
        }
    }
}

// Function to check if ads are rendered properly
function checkAdRendered(adElement, timeout = 2000) {
    return new Promise((resolve) => {
        // Set a flag to track if the ad has been rendered
        let adRendered = false;
        
        // Check if ad is already rendered
        if (adElement && adElement.querySelector('.adsbygoogle[data-ad-status="filled"]')) {
            adRendered = true;
            resolve(true);
            return;
        }
        
        // Set up observer to watch for changes in the ad element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'data-ad-status') {
                    const status = mutation.target.getAttribute('data-ad-status');
                    if (status === 'filled') {
                        adRendered = true;
                        observer.disconnect();
                        resolve(true);
                    } else if (status === 'unfilled') {
                        observer.disconnect();
                        resolve(false);
                    }
                }
            });
        });
        
        // Start observing ad elements
        const adInsElement = adElement.querySelector('.adsbygoogle');
        if (adInsElement) {
            observer.observe(adInsElement, { attributes: true });
        }
        
        // Set timeout to resolve if ad doesn't render within specified time
        setTimeout(() => {
            observer.disconnect();
            resolve(adRendered);
        }, timeout);
    });
}

// Enhanced function to hide ad containers if ads aren't rendered
function hideEmptyAdContainers() {
    // Get all ad containers
    const adContainers = document.querySelectorAll('.mid-form-ad, .ad-container, .lazy-ad');
    
    // Fix missing script elements in mid-form ads
    adContainers.forEach(container => {
        const adInsElement = container.querySelector('.adsbygoogle');
        if (adInsElement && !adInsElement.nextElementSibling) {
            // If the ad ins element has no script sibling, add one
            const scriptElement = document.createElement('script');
            scriptElement.textContent = '(adsbygoogle = window.adsbygoogle || []).push({});';
            adInsElement.parentNode.insertBefore(scriptElement, adInsElement.nextSibling);
            console.log('Added missing script to ad container:', container.dataset.location);
        }
    });
    
    // Check each container
    adContainers.forEach(async (container) => {
        // Skip containers that already have ads loaded or are being processed
        if (container.classList.contains('loaded') || container.classList.contains('processing')) {
            return;
        }
        
        // Mark as processing to avoid duplicate checks
        container.classList.add('processing');
        
        // Try to render the ad if not already rendered
        const adInsElement = container.querySelector('.adsbygoogle');
        if (adInsElement && !adInsElement.getAttribute('data-adsbygoogle-status')) {
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
                console.log('Pushed ad to container:', container.dataset.location);
            } catch (e) {
                console.error('Error pushing ad:', e);
            }
        }
        
        // Wait for a moment to check if it rendered
        setTimeout(async () => {
            const isRendered = await checkAdRendered(container);
            
            if (!isRendered) {
                container.style.display = 'none';
                container.classList.add('hidden');
                // Log for analytics
                try {
                    if (typeof track === 'function') {
                        track('ad_not_rendered', {
                            location: container.dataset.location || 'unknown',
                            calculator: new URLSearchParams(window.location.search).get('tab') || 'sc'
                        });
                    }
                } catch (e) {
                    console.error('Error tracking ad render failure', e);
                }
            } else {
                container.classList.add('loaded');
                container.classList.remove('processing');
                // Log successful render for analytics
                try {
                    if (typeof track === 'function') {
                        track('ad_rendered', {
                            location: container.dataset.location || 'unknown',
                            calculator: new URLSearchParams(window.location.search).get('tab') || 'sc'
                        });
                    }
                } catch (e) {
                    console.error('Error tracking ad render success', e);
                }
            }
        }, 1000);
    });
}

// Initialize optimized ads when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if AdBlock is active
    const checkAdBlocker = () => {
        return new Promise((resolve) => {
            const testAd = document.createElement('div');
            testAd.innerHTML = '&nbsp;';
            testAd.className = 'adsbox';
            testAd.style.position = 'absolute';
            testAd.style.opacity = '0';
            testAd.style.pointerEvents = 'none';
            document.body.appendChild(testAd);
            
            window.setTimeout(() => {
                if (testAd.offsetHeight === 0) {
                    console.log('AdBlock detected!');
                    resolve(true);
                } else {
                    console.log('No AdBlock detected');
                    resolve(false);
                }
                testAd.remove();
            }, 100);
        });
    };
    
    // Apply adblock detection first
    checkAdBlocker().then((isAdBlockActive) => {
        if (isAdBlockActive) {
            console.log('AdBlock is active - adjusting ad containers');
            handleAdBlockDetected();
        } else {
            initializeAds();
        }
    });
    
    // Handle adblock detected case
    function handleAdBlockDetected() {
        // Hide all ad containers
        const adContainers = document.querySelectorAll('.ad-container, .mid-form-ad, .sticky-ad, .lazy-ad, .inline-ad');
        adContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        // Adjust layout to compensate for missing ads
        document.body.classList.add('adblock-detected');
        
        // Log adblock detection if tracking is available
        try {
            if (typeof track === 'function') {
                track('adblock_detected', {
                    calculator: new URLSearchParams(window.location.search).get('tab') || 'sc'
                });
            }
        } catch (e) {
            console.error('Error tracking adblock detection', e);
        }
    }
    
    // Initialize ads when no adblock is detected
    function initializeAds() {
        // Apply optimized ad settings
        const config = optimizeAdsByUserBehavior();
        
        // Initialize the global adsbygoogle variable if not already defined
        window.adsbygoogle = window.adsbygoogle || [];
        
        // Add error handling for ad loading
        window.addEventListener('error', function(e) {
            if (e.target && (e.target.src || e.target.href)) {
                const resource = e.target.src || e.target.href;
                // Check if the error is related to AdSense
                if (resource.includes('adsbygoogle') || resource.includes('pagead2.googlesyndication.com')) {
                    console.log('AdSense resource failed to load:', resource);
                    
                    // Try to hide the affected ad container
                    try {
                        const adContainer = e.target.closest('.ad-container, .mid-form-ad, .sticky-ad, .lazy-ad');
                        if (adContainer) {
                            adContainer.style.display = 'none';
                            adContainer.classList.add('ad-load-error');
                        }
                    } catch (err) {
                        console.error('Error handling ad resource failure', err);
                    }
                }
            }
        }, true);
        
        // Initialize lazy ads first for fast page loading
        initLazyAds();
        
        // Create sticky ad with delay based on calculator type
        setTimeout(createStickyAd, config.stickyAdDelay);
        
        // Preload ads for high-converting calculators with slight delay
        setTimeout(preloadHighPriorityAds, 500);
        
        // Give ads some time to load before checking for empty containers
        setTimeout(hideEmptyAdContainers, 3000);
        
        // Log successful ad initialization
        console.log('Ad optimization applied for calculator: ' + 
            (new URLSearchParams(window.location.search).get('tab') || 'sc'));
        
        // Track ad initialization
        try {
            if (typeof track === 'function') {
                track('ads_initialized', {
                    calculator: new URLSearchParams(window.location.search).get('tab') || 'sc',
                    testGroup: window.adConfig?.isTestGroup ? 'test' : 'control',
                    userAgent: navigator.userAgent
                });
            }
        } catch (e) {
            console.error('Error tracking ad initialization', e);
        }
    }
});
