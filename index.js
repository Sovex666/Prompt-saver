/**
 * Prompt Saver Extension for SillyTavern
 * Main entry point - SillyTavern compatible
 */

// Import SillyTavern core modules
import { eventSource, event_types } from '../../../../script.js';
import { extension_settings, saveSettingsDebounced } from '../../../extensions.js';

// Import our extension modules
import { PromptSaverExtension } from './prompt-saver.js';
import { waitForElement } from './utils.js';

// Extension constants
const EXTENSION_NAME = 'prompt-saver-extension';
const LOG_PREFIX = '[Prompt Saver]';

/**
 * Initialize extension settings namespace
 */
function initializeSettings() {
    if (!extension_settings[EXTENSION_NAME]) {
        extension_settings[EXTENSION_NAME] = {
            prompts: {},
            settings: {
                max_prompts: 1000,
                auto_backup: true,
                backup_interval: 24,
                show_favorites_first: true,
                enable_comparison: true,
                enable_export: true
            }
        };
    }
    console.log(`${LOG_PREFIX} Settings initialized`);
}

/**
 * Main extension initialization
 */
async function initializeExtension() {
    try {
        console.log(`${LOG_PREFIX} Starting initialization...`);
        
        // Initialize settings
        initializeSettings();
        
        // Create extension instance
        const promptSaver = new PromptSaverExtension();
        
        // Initialize the extension
        await promptSaver.initialize();
        
        // Setup event listeners
        setupEventListeners(promptSaver);
        
        // Setup UI integration
        await setupUIIntegration(promptSaver);
        
        console.log(`${LOG_PREFIX} Initialization complete!`);
        
    } catch (error) {
        console.error(`${LOG_PREFIX} Failed to initialize:`, error);
    }
}

/**
 * Setup event listeners for SillyTavern events
 */
function setupEventListeners(promptSaver) {
    // Listen for preset changes
    eventSource.on(event_types.SETTINGS_LOADED, () => {
        console.log(`${LOG_PREFIX} Settings loaded, refreshing extension`);
        promptSaver.refresh();
    });
    
    // Listen for character changes
    eventSource.on(event_types.CHARACTER_SELECTED, () => {
        console.log(`${LOG_PREFIX} Character changed, updating context`);
        promptSaver.updateContext();
    });
    
    // Listen for preset updates
    eventSource.on(event_types.PRESET_CHANGED, () => {
        console.log(`${LOG_PREFIX} Preset changed, updating UI`);
        promptSaver.updateUI();
    });
}

/**
 * Setup UI integration with SillyTavern
 */
async function setupUIIntegration(promptSaver) {
    // Wait for prompt manager to be available
    waitForElement('#completion_prompt_manager', async (element) => {
        console.log(`${LOG_PREFIX} Prompt manager found, integrating UI`);
        await promptSaver.integrateWithPromptManager();
    });
    
    // Wait for main navigation to add our button
    waitForElement('#left-nav-panel', async (element) => {
        console.log(`${LOG_PREFIX} Navigation panel found, adding menu button`);
        await promptSaver.addNavigationButton();
    });
    
    // Wait for settings panel to add our settings
    waitForElement('#extensions_settings', async (element) => {
        console.log(`${LOG_PREFIX} Settings panel found, adding extension settings`);
        await promptSaver.addSettingsPanel();
    });
}

// Initialize when DOM is ready
waitForElement('body', () => {
    console.log(`${LOG_PREFIX} DOM ready, starting initialization`);
    initializeExtension();
});

console.log(`${LOG_PREFIX} Extension loaded`);
