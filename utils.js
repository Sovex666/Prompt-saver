/**
 * Utility functions for Prompt Saver Extension
 */

// Constants
export const LOG_PREFIX = '[Prompt Saver]';
export const EXTENSION_NAME = 'prompt-saver-extension';

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector to wait for
 * @param {function} callback - Function to call when element is found
 * @param {number} timeout - Maximum time to wait in milliseconds
 */
export function waitForElement(selector, callback, timeout = 10000) {
    const startTime = Date.now();
    
    function poll() {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else if (Date.now() - startTime < timeout) {
            requestAnimationFrame(poll);
        } else {
            console.warn(`${LOG_PREFIX} Timed out waiting for element: ${selector}`);
        }
    }
    
    poll();
}

/**
 * Generate a unique ID
 */
export function generateId() {
    return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Format date for display
 */
export function formatDate(date) {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

/**
 * Debounce function calls
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Create a modal dialog
 */
export function createModal(title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h4 class="modal-title">${title}</h4>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${options.footer || '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>'}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info') {
    // Use SillyTavern's toast system if available
    if (window.toastr) {
        window.toastr[type](message);
    } else {
        console.log(`${LOG_PREFIX} ${type.toUpperCase()}: ${message}`);
    }
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if we're running in test environment
 */
export function isTestEnvironment() {
    return typeof global !== 'undefined' && global.process && global.process.env;
}

/**
 * Get extension settings
 */
export function getExtensionSettings() {
    if (typeof extension_settings !== 'undefined') {
        return extension_settings[EXTENSION_NAME] || {};
    }
    return {};
}

/**
 * Save extension settings
 */
export function saveExtensionSettings(settings) {
    if (typeof extension_settings !== 'undefined') {
        extension_settings[EXTENSION_NAME] = { ...extension_settings[EXTENSION_NAME], ...settings };
        // Trigger save if SillyTavern function is available
        try {
            // Try to import and call saveSettingsDebounced
            import('../../../extensions.js').then(module => {
                if (module.saveSettingsDebounced) {
                    module.saveSettingsDebounced();
                }
            }).catch(() => {
                // Fallback: try global function
                if (typeof window !== 'undefined' && window.saveSettingsDebounced) {
                    window.saveSettingsDebounced();
                }
            });
        } catch (error) {
            console.warn(`${LOG_PREFIX} Could not trigger settings save:`, error);
        }
    }
}
