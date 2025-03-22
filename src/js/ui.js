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

