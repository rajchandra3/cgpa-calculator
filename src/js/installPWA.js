// Install PWA functionality
let deferredPrompt;
const installButton = document.querySelector('.install-app-button');

// Hide install button by default
installButton.classList.add('hidden');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show the install button
  installButton.classList.remove('hidden');

  // Handle install button click
  installButton.addEventListener('click', (e) => {
    // Hide the install button
    installButton.classList.add('hidden');
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        track('pwa_installed'); // Track installation event
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the saved prompt
      deferredPrompt = null;
    });
  });
});

// Handle already installed case
window.addEventListener('appinstalled', (evt) => {
  // Hide install button if app is installed
  installButton.classList.add('hidden');
  console.log('App was installed.');
});

// Track how the PWA was launched #
window.addEventListener('DOMContentLoaded', () => {
    let displayMode = 'browser tab';
    if (navigator.standalone) {
        displayMode = 'standalone-ios';
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
        displayMode = 'standalone';
    }
    // Log launch display mode to analytics
    mixpanel.track('App Lauched', { mode: displayMode });
    console.log('DISPLAY_MODE_LAUNCH:', displayMode);
});

// Track when the display mode changes
window.addEventListener('DOMContentLoaded', () => {
    window.matchMedia('(display-mode: standalone)').addEventListener((evt) => {
        let displayMode = 'browser tab';
        if (evt.matches) {
            displayMode = 'standalone';
        }
        // Log display mode change to analytics
        mixpanel.track('Display mode changed', {
            mode: displayMode
        });
        console.log('DISPLAY_MODE_CHANGED', displayMode);
    });
});
