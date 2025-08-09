<!-- src/App.svelte -->
<script>
// @ts-nocheck

    import { onMount, tick } from 'svelte';
    import Router from 'svelte-spa-router'
    import { push } from 'svelte-spa-router';
    import routes from './routes.js'

    // Reactive declarations for UI state
    let currentTime = '';
    let batteryPercentage = '100%';
    let batteryIconClass = 'fas fa-battery-full';
    let batteryIconColor = '';

    // Dark/Light Mode
    let prefersDarkScheme; // Will be initialized on mount
    let htmlElement; // Reference to the <html> element

    // Iframe Manager
    let showIframe = false;
    let iframeUrl = '';
    let iframeId = 'dynamic-iframe-container';
    let iframeElement; // Svelte will bind the iframe DOM node to this variable
    let currentIframeWindow = null; // Reference to the iframe's window

    // SPA Navigation State: 'home' for game list, 'settings' for settings iframe
    let currentPage = 'home'; // Default page is the game list

    // --- Time Update Function ---
    function updateTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12;
        const strMinutes = minutes < 10 ? '0' + minutes : minutes;

        currentTime = `${hours}:${strMinutes} ${ampm}`;
    }

    // --- Battery Status Function ---
    function updateBatteryStatus(battery) {
        const level = Math.floor(battery.level * 100);
        const isCharging = battery.charging;

        batteryPercentage = `${level}%`;

        // Reset classes
        batteryIconClass = 'fas'; // Base class
        batteryIconColor = ''; // Reset custom color

        if (isCharging) {
            batteryIconClass += ' fa-bolt';
            batteryIconColor = '#4CAF50'; // Green for charging
        } else if (level <= 10) {
            batteryIconClass += ' fa-battery-empty';
            batteryIconColor = 'red'; // Red for critical level
        } else if (level <= 30) {
            batteryIconClass += ' fa-battery-quarter';
            batteryIconColor = 'orange'; // Orange for warning
        } else if (level <= 60) {
            batteryIconClass += ' fa-battery-half';
        } else if (level <= 85) {
            batteryIconClass += ' fa-battery-three-quarters';
        } else {
            batteryIconClass += ' fa-battery-full';
        }
    }

    // --- Battery Initialization ---
    function initializeBattery() {
        if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
            navigator.getBattery().then(function(battery) {
                updateBatteryStatus(battery);
                battery.addEventListener('levelchange', () => updateBatteryStatus(battery));
                battery.addEventListener('chargingchange', () => updateBatteryStatus(battery));
            }).catch(function(error) {
                console.error('Failed to access Battery Status API:', error);
                batteryPercentage = 'N/A';
                batteryIconClass = 'fas fa-battery-full'; // Default icon
                batteryIconColor = '#666'; // Default color
            });
        } else {
            console.warn('Battery Status API not supported.');
            batteryPercentage = 'N/A';
            batteryIconClass = 'fas fa-battery-full';
            batteryIconColor = '#666';
        }
    }

    // --- Dark/Light Mode Functions ---
    function applyTheme(theme) {
        if (htmlElement) {
            if (theme === 'dark') {
                htmlElement.classList.add('dark-mode');
            } else {
                htmlElement.classList.remove('dark-mode');
            }
            localStorage.setItem('themePreference', theme);
        }
    }

    // --- Iframe Manager Functions ---
    async function openIframe(url) { // Made async to use await tick()
        if (showIframe) { // Check if iframe is already open
            console.warn(`Iframe is already open. Not opening a new one.`);
            return;
        }
        currentPage = 'iframe'; // Set current page to iframe to hide other content
        iframeUrl = url;
        showIframe = true; // Show the iframe overlay

        // Wait for Svelte to render the iframe and bind it to iframeElement
        await tick();

        if (iframeElement) { // Now iframeElement should be reliably populated
            currentIframeWindow = iframeElement.contentWindow;
            // Send current theme to the iframe after it loads
            const currentTheme = localStorage.getItem('themePreference') || (prefersDarkScheme.matches ? 'dark' : 'light');
            if (currentIframeWindow) {
                currentIframeWindow.postMessage({ type: 'parentTheme', theme: currentTheme }, '*');
            }
        } else {
            console.error("Iframe element not found after tick(). Cannot send parent theme.");
        }
    }

    function closeIframe() {
        showIframe = false; // Hide the iframe overlay
        currentIframeWindow = null; // Clear reference
        console.log(`Iframe with ID '${iframeId}' closed successfully.`);
        currentPage = 'home'; // Go back to home page (game list) after closing iframe
    }

    // --- Notification Functions ---

    /**
     * Requests permission from the user to show desktop notifications.
     * This should be called in response to a user gesture.
     */
    function requestNotificationPermission() {
        // 1. Check if the browser supports the Notification API
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notifications.");
            // Optionally, provide user feedback in the UI
            return;
        }

        // 2. Check current permission status
        if (Notification.permission === "granted") {
            console.log("Notification permission already granted.");
            // Optionally, show a confirmation notification
            showSimpleNotification("Notifications Enabled", "You're all set to receive updates!");
            return;
        }

        if (Notification.permission === "denied") {
            console.warn("Notification permission was denied by the user.");
            // Advise the user to change browser settings
            // showTemporaryNotification("Notifications blocked. Please enable them in browser settings.");
            return;
        }

        // 3. If permission is 'default' (not yet granted or denied), request it
        if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted!");
                    showSimpleNotification("Permission Granted!", "You'll now receive notifications.");
                } else {
                    console.warn("Notification permission denied by user (after request).");
                }
            }).catch(error => {
                console.error("Error requesting notification permission:", error);
            });
        }
    }

    /**
     * Displays a simple desktop notification.
     * This function should only be called if notification permission has been granted.
     * @param {string} title - The title of the notification.
     * @param {string} body - The body text of the notification.
     * @param {string} [icon=''] - Optional URL for an icon to display in the notification.
     */
    function showSimpleNotification(title, body, icon = '') {
        if (!("Notification" in window)) {
            console.warn("Notifications not supported in this browser.");
            return;
        }

        if (Notification.permission === "granted") {
            new Notification(title, { body: body, icon: icon });
        } else {
            console.warn("Cannot show notification: Permission not granted.");
        }
    }


    // --- Lifecycle Hook: onMount ---
    onMount(() => {
        htmlElement = document.documentElement; // Get reference to <html> element

        // Initial Time & Battery
        updateTime();
        setInterval(updateTime, 60000); // Update every minute
        initializeBattery();

        // Initial Theme Application
        prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
        const storedTheme = localStorage.getItem('themePreference');
        if (storedTheme) {
            applyTheme(storedTheme);
        } else if (prefersDarkScheme.matches) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }

        // Listen for system theme changes (only if no explicit user preference)
        const prefersDarkSchemeListener = (event) => {
            if (!localStorage.getItem('themePreference')) {
                applyTheme(event.matches ? 'dark' : 'light');
            }
        };
        prefersDarkScheme.addEventListener("change", prefersDarkSchemeListener);

        // Listen for messages from iframes (e.g., settings.html)
        const messageListener = (event) => {
            const message = event.data;
            if (message && message.type === 'themeChanged') {
                console.log(`Main page received theme changed message from iframe: ${message.theme}`);
                applyTheme(message.theme); // Apply the theme received from the iframe
            }
        };
        window.addEventListener('message', messageListener);

        // Cleanup on component unmount (important for single-page apps)
        return () => {
            prefersDarkScheme.removeEventListener("change", prefersDarkSchemeListener);
            window.removeEventListener('message', messageListener);
        };
    });

    // Function to handle settings button click
    function handleSettingsClick() {
        openIframe('settings.html'); // Open your settings.html file in the iframe
    }

    // Function to handle notification permission request click
    function handleNotificationPermissionClick() {
        requestNotificationPermission();
    }

    // Function to navigate to the home (game list) page
    function handleHomeClick() {
        push('/'); // Navigate to the home route
        currentPage = 'home'; // Set current page to home
        showIframe = false; // Ensure iframe is closed when navigating home
    }
</script>

<!-- Main container for the console UI -->
<div class="console-container" style="min-height: 100vh; display: flex; flex-direction: column;">
    <!-- Top Bar: Displays user profile, time, Wi-Fi, and battery status -->
     <header class="top-bar">
        <div class="user-profile">
            <svg class="w-8 h-8 rounded-full bg-blue-500 text-white p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <span class="text-gray-700 font-semibold text-lg">Username</span>
        </div>
        <div class="status-indicators">
            <span class="text-gray-800 font-bold text-xl">{currentTime}</span>
            <i class="fas fa-wifi text-gray-600 text-lg"></i>
            <span class="battery-status">
                <i class="{batteryIconClass}" style="color: {batteryIconColor};"></i>
                <span class="battery-percentage">{batteryPercentage}</span>
            </span>
        </div>
    </header>
    <!-- Navigation Buttons Section: Circular buttons for various console functions -->
    <nav class="nav-buttons-section">
        <button class="nav-button" aria-label="Messages"><i class="fas fa-comment-dots"></i></button>
        <button class="nav-button" aria-label="Shop"><i class="fas fa-shopping-bag"></i></button>
        <button class="nav-button" aria-label="Gallery"><i class="fas fa-image"></i></button>
        <button class="nav-button" aria-label="Games" on:click={handleHomeClick}>
            <i class="fas fa-gamepad"></i>
        </button>
        <button class="nav-button" aria-label="Settings" on:click={handleSettingsClick}>
            <i class="fas fa-cog"></i>
        </button>
        <!-- New button for Notification Permission -->
        <button class="nav-button" aria-label="Notifications" on:click={handleNotificationPermissionClick}>
            <i class="fas fa-bell"></i>
        </button>
        <button class="nav-button" aria-label="Power Off"><i class="fas fa-power-off"></i></button>
    </nav>
    <!-- Main Content Area: Displays the current page content -->
    <main class="router-center">
        <Router {routes} />
    </main>

    <!-- Bottom Bar: Displays device info and action buttons -->
    <footer class="bottom-bar">
        <div class="device-info">
            <i class="fas fa-tv text-lg"></i>
            <span>Device Info</span>
        </div>
        <div class="action-buttons">
            <span><i class="fas fa-plus mr-1"></i>Options</span>
            <span><i class="fas fa-play mr-1"></i>Start</span>
        </div>
    </footer>
</div>

<!-- Iframe Overlay (conditionally rendered) -->
{#if showIframe}
<div id={iframeId} class="iframe-overlay" style="display: flex; align-items: center; justify-content: center;">
    <div class="iframe-wrapper">
        <iframe bind:this={iframeElement} src={iframeUrl} class="iframe-content" allowfullscreen frameborder="0" title="External Content"></iframe>
        <button class="iframe-close-btn" on:click={closeIframe}>&times;</button>
    </div>
</div>
{/if}
