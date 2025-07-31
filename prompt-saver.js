/**
 * Main Prompt Saver Extension Class
 */

import { extension_settings } from '../../../extensions.js';
import { LOG_PREFIX, EXTENSION_NAME, generateId, sanitizeHtml, formatDate, showToast, createModal, getExtensionSettings, saveExtensionSettings } from './utils.js';

export class PromptSaverExtension {
    constructor() {
        this.extensionName = EXTENSION_NAME;
        this.isInitialized = false;
        this.prompts = {};
        this.currentModal = null;
    }

    /**
     * Initialize the extension
     */
    async initialize() {
        try {
            console.log(`${LOG_PREFIX} Initializing extension...`);
            
            // Load saved prompts
            await this.loadPrompts();
            
            // Setup storage
            this.setupStorage();
            
            this.isInitialized = true;
            console.log(`${LOG_PREFIX} Extension initialized successfully`);
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to initialize:`, error);
            throw error;
        }
    }

    /**
     * Load prompts from storage
     */
    async loadPrompts() {
        try {
            const settings = getExtensionSettings();
            this.prompts = settings.prompts || {};
            console.log(`${LOG_PREFIX} Loaded ${Object.keys(this.prompts).length} prompts`);
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to load prompts:`, error);
            this.prompts = {};
        }
    }

    /**
     * Save prompts to storage
     */
    async savePrompts() {
        try {
            saveExtensionSettings({ prompts: this.prompts });
            console.log(`${LOG_PREFIX} Saved ${Object.keys(this.prompts).length} prompts`);
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to save prompts:`, error);
        }
    }

    /**
     * Setup storage mechanisms
     */
    setupStorage() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.savePrompts();
        }, 30000);
    }

    /**
     * Add navigation button to SillyTavern
     */
    async addNavigationButton() {
        try {
            const navPanel = document.querySelector('#left-nav-panel');
            if (!navPanel) {
                console.warn(`${LOG_PREFIX} Navigation panel not found`);
                return;
            }

            // Check if button already exists
            if (document.querySelector('#prompt-saver-nav-button')) {
                return;
            }

            const button = document.createElement('div');
            button.id = 'prompt-saver-nav-button';
            button.className = 'nav-button';
            button.innerHTML = `
                <i class="fa-solid fa-bookmark"></i>
                <span>Prompt Library</span>
            `;
            
            button.addEventListener('click', () => {
                this.showPromptLibrary();
            });

            navPanel.appendChild(button);
            console.log(`${LOG_PREFIX} Navigation button added`);
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to add navigation button:`, error);
        }
    }

    /**
     * Integrate with SillyTavern's prompt manager
     */
    async integrateWithPromptManager() {
        try {
            const promptManager = document.querySelector('#completion_prompt_manager');
            if (!promptManager) {
                console.warn(`${LOG_PREFIX} Prompt manager not found`);
                return;
            }

            // Add save button to prompt manager
            this.addSaveButton(promptManager);
            
            console.log(`${LOG_PREFIX} Integrated with prompt manager`);
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to integrate with prompt manager:`, error);
        }
    }

    /**
     * Add save button to prompt manager
     */
    addSaveButton(promptManager) {
        // Check if button already exists
        if (document.querySelector('#prompt-saver-save-button')) {
            return;
        }

        const saveButton = document.createElement('button');
        saveButton.id = 'prompt-saver-save-button';
        saveButton.className = 'btn btn-primary';
        saveButton.innerHTML = '<i class="fa-solid fa-save"></i> Save Current Prompts';
        
        saveButton.addEventListener('click', () => {
            this.saveCurrentPrompts();
        });

        // Find a good place to insert the button
        const header = promptManager.querySelector('.completion_prompt_manager_header') || promptManager;
        header.appendChild(saveButton);
    }

    /**
     * Save current prompts from the active preset
     */
    async saveCurrentPrompts() {
        try {
            console.log(`${LOG_PREFIX} Saving current prompts...`);
            
            // Get current preset data
            const currentPreset = this.getCurrentPreset();
            if (!currentPreset || !currentPreset.prompts) {
                showToast('No prompts found in current preset', 'warning');
                return;
            }

            let savedCount = 0;
            for (const prompt of currentPreset.prompts) {
                if (prompt.content && prompt.content.trim()) {
                    const promptId = generateId();
                    const promptData = {
                        id: promptId,
                        name: prompt.name || `Prompt from ${currentPreset.name || 'Unknown Preset'}`,
                        content: prompt.content,
                        role: prompt.role || 'user',
                        metadata: {
                            created_at: new Date().toISOString(),
                            source_preset: currentPreset.name || 'Unknown',
                            favorite: false,
                            usage_count: 0
                        }
                    };
                    
                    this.prompts[promptId] = promptData;
                    savedCount++;
                }
            }

            await this.savePrompts();
            showToast(`Saved ${savedCount} prompts successfully`, 'success');
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to save current prompts:`, error);
            showToast('Failed to save prompts', 'error');
        }
    }

    /**
     * Get current preset data
     */
    getCurrentPreset() {
        // Try to get from SillyTavern's global state
        if (typeof power_user !== 'undefined' && power_user.completion_preset) {
            return power_user.completion_preset;
        }
        
        // Fallback: try to extract from UI
        return this.extractPresetFromUI();
    }

    /**
     * Extract preset data from UI elements
     */
    extractPresetFromUI() {
        try {
            const promptElements = document.querySelectorAll('.completion_prompt_manager_prompt');
            const prompts = [];
            
            promptElements.forEach(element => {
                const nameElement = element.querySelector('.completion_prompt_manager_prompt_name');
                const contentElement = element.querySelector('.completion_prompt_manager_prompt_text');
                const roleElement = element.querySelector('.completion_prompt_manager_prompt_role');
                
                if (contentElement && contentElement.value) {
                    prompts.push({
                        name: nameElement ? nameElement.value : 'Unnamed Prompt',
                        content: contentElement.value,
                        role: roleElement ? roleElement.value : 'user'
                    });
                }
            });
            
            return {
                name: 'Current Preset',
                prompts: prompts
            };
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to extract preset from UI:`, error);
            return { prompts: [] };
        }
    }

    /**
     * Show the prompt library modal
     */
    showPromptLibrary() {
        try {
            const content = this.generateLibraryHTML();
            this.currentModal = createModal('Prompt Library', content, {
                footer: `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="promptSaver.exportPrompts()">Export</button>
                `
            });
            
            // Show modal using Bootstrap
            if (window.bootstrap && window.bootstrap.Modal) {
                const modal = new window.bootstrap.Modal(this.currentModal);
                modal.show();
            } else {
                // Fallback for older versions
                $(this.currentModal).modal('show');
            }
            
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to show prompt library:`, error);
        }
    }

    /**
     * Generate HTML for the prompt library
     */
    generateLibraryHTML() {
        const promptList = Object.values(this.prompts);
        
        if (promptList.length === 0) {
            return '<p>No saved prompts found. Save some prompts from the prompt manager to get started!</p>';
        }

        let html = `
            <div class="prompt-library-container">
                <div class="prompt-library-header">
                    <input type="text" class="form-control" placeholder="Search prompts..." id="prompt-search">
                    <div class="btn-group mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="promptSaver.filterFavorites()">Favorites</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="promptSaver.clearFilters()">All</button>
                    </div>
                </div>
                <div class="prompt-library-list" id="prompt-library-list">
        `;

        promptList.forEach(prompt => {
            html += `
                <div class="prompt-card" data-prompt-id="${prompt.id}">
                    <div class="prompt-card-header">
                        <h6>${sanitizeHtml(prompt.name)}</h6>
                        <div class="prompt-card-actions">
                            <button class="btn btn-sm btn-outline-warning" onclick="promptSaver.toggleFavorite('${prompt.id}')">
                                <i class="fa-${prompt.metadata.favorite ? 'solid' : 'regular'} fa-star"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="promptSaver.applyPrompt('${prompt.id}')">Apply</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="promptSaver.deletePrompt('${prompt.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="prompt-card-content">
                        <p>${sanitizeHtml(prompt.content.substring(0, 200))}${prompt.content.length > 200 ? '...' : ''}</p>
                        <small class="text-muted">
                            Role: ${prompt.role} | Created: ${formatDate(prompt.metadata.created_at)}
                        </small>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    /**
     * Refresh the extension
     */
    refresh() {
        console.log(`${LOG_PREFIX} Refreshing extension...`);
        this.loadPrompts();
    }

    /**
     * Update context when character changes
     */
    updateContext() {
        console.log(`${LOG_PREFIX} Updating context...`);
        // Implementation for character-specific context
    }

    /**
     * Update UI when preset changes
     */
    updateUI() {
        console.log(`${LOG_PREFIX} Updating UI...`);
        // Implementation for UI updates
    }

    /**
     * Add settings panel
     */
    async addSettingsPanel() {
        // Implementation for settings panel
        console.log(`${LOG_PREFIX} Settings panel integration not yet implemented`);
    }

    /**
     * Toggle favorite status of a prompt
     */
    toggleFavorite(promptId) {
        if (this.prompts[promptId]) {
            this.prompts[promptId].metadata.favorite = !this.prompts[promptId].metadata.favorite;
            this.savePrompts();
            showToast(`Prompt ${this.prompts[promptId].metadata.favorite ? 'added to' : 'removed from'} favorites`, 'success');

            // Refresh the library if it's open
            if (this.currentModal) {
                const listContainer = document.getElementById('prompt-library-list');
                if (listContainer) {
                    listContainer.innerHTML = this.generateLibraryHTML().match(/<div class="prompt-library-list"[^>]*>(.*)<\/div>/s)[1];
                }
            }
        }
    }

    /**
     * Apply a prompt to the current preset
     */
    async applyPrompt(promptId) {
        try {
            const prompt = this.prompts[promptId];
            if (!prompt) {
                showToast('Prompt not found', 'error');
                return;
            }

            // Update usage count
            prompt.metadata.usage_count = (prompt.metadata.usage_count || 0) + 1;
            prompt.metadata.last_used = new Date().toISOString();

            // Try to apply to current preset
            // This is a simplified implementation - in a real scenario, you'd need to
            // integrate with SillyTavern's preset system
            console.log(`${LOG_PREFIX} Applying prompt: ${prompt.name}`);

            this.savePrompts();
            showToast(`Applied prompt: ${prompt.name}`, 'success');

        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to apply prompt:`, error);
            showToast('Failed to apply prompt', 'error');
        }
    }

    /**
     * Delete a prompt
     */
    deletePrompt(promptId) {
        if (this.prompts[promptId]) {
            const promptName = this.prompts[promptId].name;
            delete this.prompts[promptId];
            this.savePrompts();
            showToast(`Deleted prompt: ${promptName}`, 'success');

            // Refresh the library if it's open
            if (this.currentModal) {
                const listContainer = document.getElementById('prompt-library-list');
                if (listContainer) {
                    listContainer.innerHTML = this.generateLibraryHTML().match(/<div class="prompt-library-list"[^>]*>(.*)<\/div>/s)[1];
                }
            }
        }
    }

    /**
     * Filter to show only favorites
     */
    filterFavorites() {
        // Implementation for filtering favorites
        console.log(`${LOG_PREFIX} Filtering favorites...`);
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        // Implementation for clearing filters
        console.log(`${LOG_PREFIX} Clearing filters...`);
    }

    /**
     * Export prompts
     */
    exportPrompts() {
        try {
            const exportData = {
                version: '1.0.0',
                exported_at: new Date().toISOString(),
                prompts: this.prompts
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `prompt-library-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            showToast('Prompts exported successfully', 'success');

        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to export prompts:`, error);
            showToast('Failed to export prompts', 'error');
        }
    }
}

// Make extension available globally for HTML onclick handlers
window.promptSaver = new PromptSaverExtension();
