// main app controller
// ties everything together

(function() {
    'use strict';

    // dom elements - grabbed these once to avoid repeated queries
    const landingPage = document.getElementById('landing');
    const loadingPage = document.getElementById('loading');
    const editorPage = document.getElementById('editor');
    const themeToggle = document.getElementById('theme-toggle');
    
    const usernameInput = document.getElementById('username-input');
    const generateBtn = document.getElementById('generate-btn');
    const backBtn = document.getElementById('back-btn');
    
    const progressFill = document.getElementById('progress-fill');
    const progressStatus = document.getElementById('progress-status');
    
    const previewFrame = document.getElementById('preview-frame');
    const templateBtns = document.querySelectorAll('.template-btn');
    const previewTabs = document.querySelectorAll('.preview-tab');
    
    const primaryColorInput = document.getElementById('primary-color');
    const accentColorInput = document.getElementById('accent-color');
    const bioInput = document.getElementById('bio-input');
    const linkedinInput = document.getElementById('linkedin-input');
    const twitterInput = document.getElementById('twitter-input');
    const emailInput = document.getElementById('email-input');
    
    const filterStarred = document.getElementById('filter-starred');
    const filterNoForks = document.getElementById('filter-no-forks');
    const sortSelect = document.getElementById('sort-select');
    const featuredList = document.getElementById('featured-list');
    
    const exportBtn = document.getElementById('export-btn');
    const exportModal = document.getElementById('export-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const downloadHtmlBtn = document.getElementById('download-html');
    const copyHtmlBtn = document.getElementById('copy-html');
    const deployNetlifyBtn = document.getElementById('deploy-netlify');
    const instructionsDiv = document.getElementById('deploy-instructions');
    const instructionsContent = document.getElementById('instructions-content');
    
    const compareBtn = document.getElementById('compare-btn');
    const compareModal = document.getElementById('compare-modal');
    const closeCompareBtn = document.getElementById('close-compare');
    const refreshPreviewBtn = document.getElementById('refresh-preview');
    
    const toast = document.getElementById('toast');

    let currentPreviewUrl = null;
    let debounceTimer = null;

    // console.log('app.js loaded');

    // ============ INITIALIZATION ============
    
    function init() {
        bindEvents();
        loadSavedSettings();
        initTheme();
        
        // check if theres a username in url hash
        const hash = window.location.hash.slice(1);
        if (hash) {
            usernameInput.value = hash;
            // dont auto-fetch, let user click
        }
    }

    // ============ DARK MODE ============
    // tried to make this feel smooth like apple's toggle
    
    function initTheme() {
        const savedTheme = localStorage.getItem('gitfolio_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon(true);
        }
        
        // listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('gitfolio_theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    function toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        setTheme(isDark ? 'light' : 'dark');
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('gitfolio_theme', 'dark');
            updateThemeIcon(true);
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('gitfolio_theme', 'light');
            updateThemeIcon(false);
        }
    }

    function updateThemeIcon(isDark) {
        const icon = themeToggle?.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = isDark ? '🌙' : '☀️';
        }
    }

    function bindEvents() {
        // theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // landing page
        generateBtn.addEventListener('click', handleGenerate);
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleGenerate();
        });

        // back button
        backBtn.addEventListener('click', () => {
            showPage('landing');
            // cleanup preview
            if (currentPreviewUrl) {
                ExportHandler.revokePreviewUrl(currentPreviewUrl);
                currentPreviewUrl = null;
            }
        });

        // template selection
        templateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                templateBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                TemplateEngine.setTemplate(btn.dataset.template);
                updatePreview();
            });
        });

        // preview tabs (desktop/mobile)
        previewTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                previewTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                previewFrame.classList.toggle('mobile', tab.dataset.view === 'mobile');
            });
        });

        // color inputs
        primaryColorInput.addEventListener('input', debounce(handleSettingsChange, 150));
        accentColorInput.addEventListener('input', debounce(handleSettingsChange, 150));

        // bio and social inputs
        bioInput.addEventListener('input', debounce(handleSettingsChange, 300));
        linkedinInput.addEventListener('input', debounce(handleSettingsChange, 300));
        twitterInput.addEventListener('input', debounce(handleSettingsChange, 300));
        emailInput.addEventListener('input', debounce(handleSettingsChange, 300));

        // filters
        filterStarred.addEventListener('change', handleSettingsChange);
        filterNoForks.addEventListener('change', handleSettingsChange);
        sortSelect.addEventListener('change', handleSettingsChange);

        // export modal
        exportBtn.addEventListener('click', () => showModal(exportModal));
        closeModalBtn.addEventListener('click', () => hideModal(exportModal));
        
        downloadHtmlBtn.addEventListener('click', handleDownload);
        copyHtmlBtn.addEventListener('click', handleCopy);
        deployNetlifyBtn.addEventListener('click', handleDeployNetlify);

        // compare modal
        compareBtn.addEventListener('click', handleCompare);
        closeCompareBtn.addEventListener('click', () => hideModal(compareModal));

        // refresh preview
        refreshPreviewBtn.addEventListener('click', updatePreview);

        // close modals on backdrop click
        [exportModal, compareModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) hideModal(modal);
            });
        });

        // keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideModal(exportModal);
                hideModal(compareModal);
            }
        });
    }

    // ============ PAGE NAVIGATION ============

    function showPage(pageName) {
        [landingPage, loadingPage, editorPage].forEach(page => {
            page.classList.remove('active');
        });

        switch(pageName) {
            case 'landing':
                landingPage.classList.add('active');
                break;
            case 'loading':
                loadingPage.classList.add('active');
                break;
            case 'editor':
                editorPage.classList.add('active');
                break;
        }
    }

    // ============ MAIN FLOW ============

    async function handleGenerate() {
        const username = usernameInput.value.trim();
        
        if (!username) {
            showToast('Please enter a GitHub username', 'error');
            usernameInput.focus();
            return;
        }

        // validate username format (basic check)
        if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
            showToast('Invalid username format', 'error');
            return;
        }

        showPage('loading');
        setProgress(0, 'Connecting to GitHub...');

        try {
            const userData = await GitHubAPI.fetchUserData(username, (status) => {
                // update progress based on status message
                if (status.includes('cached')) {
                    setProgress(100, status);
                } else if (status.includes('user info')) {
                    setProgress(20, status);
                } else if (status.includes('repositories')) {
                    setProgress(40, status);
                } else if (status.includes('Fetched')) {
                    setProgress(50, status);
                } else if (status.includes('language')) {
                    setProgress(60, status);
                } else if (status.includes('Processing')) {
                    // extract percentage from status
                    const match = status.match(/(\d+)%/);
                    if (match) {
                        const pct = parseInt(match[1]);
                        setProgress(60 + (pct * 0.35), status);
                    }
                }
            });

            setProgress(100, 'Done!');
            
            // small delay so user sees 100%
            await sleep(300);

            // setup template engine with data
            TemplateEngine.setUserData(userData);
            
            // populate featured repos list
            populateFeaturedList(userData.repos);
            
            // prefill bio if user has one
            if (userData.userInfo.bio && !bioInput.value) {
                bioInput.value = userData.userInfo.bio;
            }

            // update url hash for sharing
            window.location.hash = username;

            // show editor
            showPage('editor');
            
            // render initial preview
            updatePreview();

        } catch(error) {
            console.error('fetch failed:', error);
            showToast(error.message || 'Failed to fetch data', 'error');
            showPage('landing');
        }
    }

    function setProgress(percent, status) {
        progressFill.style.width = percent + '%';
        if (status) {
            progressStatus.textContent = status;
        }
    }

    // ============ SETTINGS ============

    function handleSettingsChange() {
        const settings = {
            primaryColor: primaryColorInput.value,
            accentColor: accentColorInput.value,
            bio: bioInput.value,
            linkedin: linkedinInput.value,
            twitter: twitterInput.value,
            email: emailInput.value,
            filterStarred: filterStarred.checked,
            filterNoForks: filterNoForks.checked,
            sortBy: sortSelect.value,
            featuredRepos: getSelectedFeatured()
        };

        TemplateEngine.updateSettings(settings);
        saveSettings(settings);
        updatePreview();
    }

    function getSelectedFeatured() {
        const checkboxes = featuredList.querySelectorAll('input:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem('gitfolio_settings', JSON.stringify(settings));
        } catch(e) {
            // localStorage might be full
        }
    }

    function loadSavedSettings() {
        try {
            const saved = localStorage.getItem('gitfolio_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                // apply to inputs
                if (settings.primaryColor) primaryColorInput.value = settings.primaryColor;
                if (settings.accentColor) accentColorInput.value = settings.accentColor;
                if (settings.bio) bioInput.value = settings.bio;
                if (settings.linkedin) linkedinInput.value = settings.linkedin;
                if (settings.twitter) twitterInput.value = settings.twitter;
                if (settings.email) emailInput.value = settings.email;
                filterStarred.checked = !!settings.filterStarred;
                filterNoForks.checked = settings.filterNoForks !== false; // default true
                if (settings.sortBy) sortSelect.value = settings.sortBy;

                TemplateEngine.updateSettings(settings);
            }
        } catch(e) {
            // corrupted settings, ignore
        }
    }

    // ============ FEATURED REPOS ============

    function populateFeaturedList(repos) {
        // filter out forks for the list
        const filteredRepos = repos.filter(r => !r.fork);
        const savedFeatured = TemplateEngine.getSettings().featuredRepos || [];
        
        featuredList.innerHTML = filteredRepos.slice(0, 20).map(repo => {
            const isChecked = savedFeatured.includes(repo.name);
            const checkedCount = savedFeatured.length;
            const isDisabled = !isChecked && checkedCount >= 6;
            
            return `
                <label class="featured-item ${isDisabled ? 'disabled' : ''}">
                    <input type="checkbox" value="${repo.name}" 
                        ${isChecked ? 'checked' : ''} 
                        ${isDisabled ? 'disabled' : ''}>
                    <span>${repo.name}</span>
                </label>
            `;
        }).join('');

        // bind change events
        featuredList.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                updateFeaturedState();
                handleSettingsChange();
            });
        });
    }

    function updateFeaturedState() {
        const checkboxes = featuredList.querySelectorAll('input');
        const checkedCount = featuredList.querySelectorAll('input:checked').length;
        
        checkboxes.forEach(cb => {
            const item = cb.closest('.featured-item');
            if (!cb.checked && checkedCount >= 6) {
                cb.disabled = true;
                item.classList.add('disabled');
            } else {
                cb.disabled = false;
                item.classList.remove('disabled');
            }
        });
    }

    // ============ PREVIEW ============

    function updatePreview() {
        // cleanup old preview url
        if (currentPreviewUrl) {
            ExportHandler.revokePreviewUrl(currentPreviewUrl);
        }

        currentPreviewUrl = ExportHandler.getPreviewDataUrl();
        if (currentPreviewUrl) {
            previewFrame.src = currentPreviewUrl;
        }
    }

    // ============ EXPORT ============

    function handleDownload() {
        const userData = TemplateEngine.getUserData();
        const filename = userData ? `${userData.username}-portfolio.html` : 'portfolio.html';
        
        if (ExportHandler.downloadHtml(filename)) {
            showToast('Portfolio downloaded!', 'success');
        } else {
            showToast('Download failed', 'error');
        }
    }

    async function handleCopy() {
        const success = await ExportHandler.copyToClipboard();
        if (success) {
            showToast('Copied to clipboard!', 'success');
            copyHtmlBtn.querySelector('.export-label').textContent = 'Copied!';
            setTimeout(() => {
                copyHtmlBtn.querySelector('.export-label').textContent = 'Copy to Clipboard';
            }, 2000);
        } else {
            showToast('Copy failed', 'error');
        }
    }

    function handleDeployNetlify() {
        const instructions = ExportHandler.getDeployInstructions('netlify');
        
        instructionsContent.innerHTML = `
            <ol>
                ${instructions.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
        `;
        instructionsDiv.style.display = 'block';

        // also trigger download
        handleDownload();
    }

    // ============ COMPARE ============

    function handleCompare() {
        showModal(compareModal);
        
        // render all three templates in compare frames
        const templates = ['minimal', 'dark', 'creative'];
        const currentTemplate = TemplateEngine.getCurrentTemplate();
        
        templates.forEach(template => {
            const frame = document.getElementById(`compare-${template}`);
            if (frame) {
                // temporarily switch template
                TemplateEngine.setTemplate(template);
                const url = ExportHandler.getPreviewDataUrl();
                frame.src = url;
                
                // cleanup url after load
                frame.onload = () => {
                    setTimeout(() => ExportHandler.revokePreviewUrl(url), 100);
                };
            }
        });

        // restore original template
        TemplateEngine.setTemplate(currentTemplate);
    }

    // ============ MODALS ============

    function showModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        instructionsDiv.style.display = 'none';
    }

    // ============ TOAST ============

    function showToast(message, type = '') {
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ============ UTILITIES ============

    function debounce(fn, delay) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============ START ============
    
    // wait for dom
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
