// template rendering engine
// handles switching between templates and generating the portfolio html

const TemplateEngine = (function() {
    
    let currentTemplate = 'minimal';
    let userData = null;
    let settings = {
        primaryColor: '#6366f1',
        accentColor: '#22d3ee',
        bio: '',
        linkedin: '',
        twitter: '',
        email: '',
        filterStarred: false,
        filterNoForks: true,
        sortBy: 'stars',
        featuredRepos: []
    };

    // console.log('template engine loaded');

    function setUserData(data) {
        userData = data;
    }

    function setTemplate(templateName) {
        currentTemplate = templateName;
    }

    function updateSettings(newSettings) {
        settings = { ...settings, ...newSettings };
    }

    function getSettings() {
        return { ...settings };
    }

    // filter and sort repos based on settings
    function getFilteredRepos() {
        if (!userData || !userData.repos) return [];
        
        let repos = [...userData.repos];

        // apply filters
        if (settings.filterNoForks) {
            repos = repos.filter(r => !r.fork);
        }
        
        // starred filter - this checks if user has starred their own repos
        // actually github api doesnt give us this easily so skip for now
        // TODO: maybe add this later with separate api call
        
        // sort
        switch(settings.sortBy) {
            case 'stars':
                repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
                break;
            case 'updated':
                repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                break;
            case 'name':
                repos.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }

        return repos;
    }

    // get featured repos (user selected or top 6)
    function getFeaturedRepos() {
        const repos = getFilteredRepos();
        
        if (settings.featuredRepos && settings.featuredRepos.length > 0) {
            // return repos in the order user selected them
            return settings.featuredRepos
                .map(name => repos.find(r => r.name === name))
                .filter(Boolean)
                .slice(0, 6);
        }
        
        // default to top 6
        return repos.slice(0, 6);
    }

    // format date nicely
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        }
        
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
    }

    // get top languages from a repo
    function getTopLanguages(repo, limit = 3) {
        if (!repo.languageData) return [];
        
        const entries = Object.entries(repo.languageData);
        const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
        
        return entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([lang, bytes]) => ({
                name: lang,
                percent: Math.round((bytes / total) * 100)
            }));
    }

    // language colors - grabbed these from github
    const langColors = {
        'JavaScript': '#f1e05a',
        'TypeScript': '#3178c6',
        'Python': '#3572A5',
        'Java': '#b07219',
        'C++': '#f34b7d',
        'C': '#555555',
        'C#': '#178600',
        'Go': '#00ADD8',
        'Rust': '#dea584',
        'Ruby': '#701516',
        'PHP': '#4F5D95',
        'Swift': '#F05138',
        'Kotlin': '#A97BFF',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'SCSS': '#c6538c',
        'Vue': '#41b883',
        'Shell': '#89e051',
        'Dart': '#00B4AB'
    };

    function getLangColor(lang) {
        return langColors[lang] || '#8b8b8b';
    }

    // escape html to prevent xss
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // generate project card html based on template
    function generateProjectCard(repo, template) {
        const langs = getTopLanguages(repo);
        const updated = formatDate(repo.updated_at);
        const description = escapeHtml(repo.description) || 'No description';
        const homepage = repo.homepage || '';
        const topics = repo.topics || [];

        // different card styles per template
        if (template === 'minimal') {
            return `
                <article class="project-card">
                    <h3 class="project-title">
                        <a href="${repo.html_url}" target="_blank" rel="noopener">${escapeHtml(repo.name)}</a>
                    </h3>
                    <p class="project-desc">${description}</p>
                    <div class="project-meta">
                        <div class="project-langs">
                            ${langs.map(l => `<span class="lang-tag" style="--lang-color: ${getLangColor(l.name)}">${l.name}</span>`).join('')}
                        </div>
                        <div class="project-stats">
                            ${repo.stargazers_count > 0 ? `<span class="stat">★ ${repo.stargazers_count}</span>` : ''}
                            ${repo.forks_count > 0 ? `<span class="stat">⑂ ${repo.forks_count}</span>` : ''}
                        </div>
                    </div>
                    ${homepage ? `<a href="${homepage}" class="demo-link" target="_blank" rel="noopener">Live Demo →</a>` : ''}
                </article>
            `;
        }
        
        if (template === 'dark') {
            return `
                <article class="project-card">
                    <div class="card-header">
                        <span class="folder-icon">📁</span>
                        <div class="card-links">
                            <a href="${repo.html_url}" target="_blank" rel="noopener" title="GitHub">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                            </a>
                            ${homepage ? `<a href="${homepage}" target="_blank" rel="noopener" title="Live Demo">↗</a>` : ''}
                        </div>
                    </div>
                    <h3 class="project-title">${escapeHtml(repo.name)}</h3>
                    <p class="project-desc">${description}</p>
                    <div class="project-footer">
                        <div class="project-langs">
                            ${langs.map(l => `<span class="lang-dot" style="background: ${getLangColor(l.name)}" title="${l.name}"></span>`).join('')}
                            <span class="lang-name">${langs[0]?.name || ''}</span>
                        </div>
                        <div class="project-stats">
                            <span>★ ${repo.stargazers_count}</span>
                            <span>⑂ ${repo.forks_count}</span>
                        </div>
                    </div>
                </article>
            `;
        }
        
        if (template === 'creative') {
            // pick a random gradient for each card
            const gradients = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
            ];
            const gradient = gradients[Math.abs(hashCode(repo.name)) % gradients.length];
            
            return `
                <article class="project-card" style="--card-gradient: ${gradient}">
                    <div class="card-accent"></div>
                    <div class="card-content">
                        <div class="card-top">
                            ${topics.slice(0, 2).map(t => `<span class="topic-tag">${t}</span>`).join('')}
                        </div>
                        <h3 class="project-title">${escapeHtml(repo.name)}</h3>
                        <p class="project-desc">${description}</p>
                        <div class="card-bottom">
                            <div class="lang-pills">
                                ${langs.map(l => `<span class="lang-pill">${l.name}</span>`).join('')}
                            </div>
                            <div class="card-actions">
                                <a href="${repo.html_url}" class="card-btn" target="_blank" rel="noopener">View Code</a>
                                ${homepage ? `<a href="${homepage}" class="card-btn primary" target="_blank" rel="noopener">Demo</a>` : ''}
                            </div>
                        </div>
                    </div>
                </article>
            `;
        }

        return '';
    }

    // simple hash for consistent "random" values
    function hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    // generate social links html
    function generateSocialLinks() {
        const links = [];
        
        if (settings.linkedin) {
            links.push(`<a href="${settings.linkedin}" target="_blank" rel="noopener" class="social-link" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>`);
        }
        
        if (settings.twitter) {
            const handle = settings.twitter.replace('@', '');
            links.push(`<a href="https://twitter.com/${handle}" target="_blank" rel="noopener" class="social-link" aria-label="Twitter">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>`);
        }
        
        if (settings.email) {
            links.push(`<a href="mailto:${settings.email}" class="social-link" aria-label="Email">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </a>`);
        }
        
        if (userData && userData.userInfo) {
            links.push(`<a href="${userData.userInfo.html_url}" target="_blank" rel="noopener" class="social-link" aria-label="GitHub">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>`);
        }

        return links.join('\n');
    }

    // main render function - generates complete portfolio html
    function render() {
        if (!userData) {
            console.warn('no user data to render');
            return '<p>No data available</p>';
        }

        const user = userData.userInfo;
        const featuredRepos = getFeaturedRepos();
        const allRepos = getFilteredRepos();
        
        const name = user.name || user.login;
        const bio = settings.bio || user.bio || '';
        const avatar = user.avatar_url;
        const location = user.location || '';

        // get template-specific styles
        const templateStyles = getTemplateStyles(currentTemplate);
        
        // build the html
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(name)} - Portfolio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        ${templateStyles}
    </style>
    <!-- SEO meta tags will be injected by seo-generator -->
</head>
<body>
    <div class="portfolio-container">
        <header class="hero">
            <img src="${avatar}" alt="${escapeHtml(name)}" class="avatar" loading="lazy">
            <h1 class="name">${escapeHtml(name)}</h1>
            ${bio ? `<p class="bio">${escapeHtml(bio)}</p>` : ''}
            ${location ? `<p class="location">📍 ${escapeHtml(location)}</p>` : ''}
            <div class="social-links">
                ${generateSocialLinks()}
            </div>
        </header>

        <main>
            <section class="projects-section">
                <h2 class="section-title">Featured Projects</h2>
                <div class="projects-grid">
                    ${featuredRepos.map(repo => generateProjectCard(repo, currentTemplate)).join('\n')}
                </div>
            </section>

            ${allRepos.length > 6 ? `
            <section class="all-projects">
                <h2 class="section-title">All Projects</h2>
                <div class="projects-list">
                    ${allRepos.slice(6).map(repo => `
                        <a href="${repo.html_url}" class="project-row" target="_blank" rel="noopener">
                            <span class="row-name">${escapeHtml(repo.name)}</span>
                            <span class="row-desc">${escapeHtml(repo.description || '')}</span>
                            <span class="row-stats">★ ${repo.stargazers_count}</span>
                        </a>
                    `).join('\n')}
                </div>
            </section>
            ` : ''}
        </main>

        <footer class="footer">
            <p>Built with <a href="https://github.com" target="_blank" rel="noopener">GitHub</a></p>
        </footer>
    </div>
</body>
</html>
        `;

        return html;
    }

    // get css for specific template
    // spent a while making these look premium - vercel/linear inspired
    function getTemplateStyles(template) {
        // base styles shared by all templates
        const baseStyles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            html {
                scroll-behavior: smooth;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
                line-height: 1.6;
                min-height: 100vh;
            }
            
            img { max-width: 100%; height: auto; }
            a { text-decoration: none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
            
            ::selection {
                background: rgba(102, 126, 234, 0.2);
            }
            
            .portfolio-container {
                max-width: 1100px;
                margin: 0 auto;
                padding: clamp(2rem, 5vw, 4rem);
            }
            
            .hero {
                text-align: center;
                padding: clamp(3rem, 8vw, 6rem) 0;
            }
            
            .avatar {
                width: 140px;
                height: 140px;
                border-radius: 50%;
                margin-bottom: 1.75rem;
                object-fit: cover;
                transition: transform 0.3s ease;
            }
            
            .avatar:hover {
                transform: scale(1.03);
            }
            
            .name {
                font-size: clamp(2rem, 5vw, 3rem);
                font-weight: 700;
                letter-spacing: -0.03em;
                margin-bottom: 0.75rem;
                line-height: 1.2;
            }
            
            .bio {
                font-size: clamp(1rem, 2vw, 1.125rem);
                max-width: 560px;
                margin: 0 auto 1.25rem;
                line-height: 1.7;
            }
            
            .location {
                font-size: 0.9rem;
                margin-bottom: 2rem;
                font-weight: 500;
            }
            
            .social-links {
                display: flex;
                justify-content: center;
                gap: 0.75rem;
            }
            
            .social-link {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .social-link:hover {
                transform: translateY(-2px);
            }
            
            .section-title {
                font-size: clamp(1.25rem, 3vw, 1.5rem);
                font-weight: 600;
                margin-bottom: 2rem;
                letter-spacing: -0.02em;
            }
            
            .projects-grid {
                display: grid;
                gap: 1.25rem;
            }
            
            .project-card {
                padding: 1.75rem;
                border-radius: 16px;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .project-title {
                font-size: 1.125rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
                letter-spacing: -0.01em;
            }
            
            .project-desc {
                font-size: 0.9rem;
                margin-bottom: 1.25rem;
                line-height: 1.6;
            }
            
            .footer {
                text-align: center;
                padding: 4rem 0 3rem;
                font-size: 0.85rem;
            }
            
            /* responsive */
            @media (max-width: 768px) {
                .portfolio-container { padding: 1.5rem; }
                .projects-grid { grid-template-columns: 1fr !important; }
                .hero { padding: 2.5rem 0; }
            }
        `;

        // template specific styles
        // each one has its own vibe - minimal is clean, dark is dev-focused, creative is fun
        const templateSpecific = {
            minimal: `
                body { 
                    background: #FAFAFA; 
                    color: #1A1A1A;
                }
                
                .hero { 
                    border-bottom: 1px solid #E5E5E7;
                    background: linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%);
                }
                
                .avatar { 
                    border: 4px solid white; 
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                }
                
                .bio { color: #6E6E73; }
                .location { color: #86868B; }
                
                .social-link {
                    background: #F5F5F7;
                    color: #6E6E73;
                    border: 1px solid #E5E5E7;
                }
                .social-link:hover {
                    background: var(--primary, #0071E3);
                    color: white;
                    border-color: var(--primary, #0071E3);
                    box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
                }
                
                .section-title { color: #1A1A1A; }
                
                .projects-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                .project-card {
                    background: white;
                    border: 1px solid #E5E5E7;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                }
                .project-card:hover {
                    box-shadow: 0 12px 24px rgba(0,0,0,0.1);
                    transform: translateY(-4px);
                    border-color: #D1D1D6;
                }
                
                .project-title a {
                    color: #1A1A1A;
                }
                .project-title a:hover {
                    color: var(--primary, #0071E3);
                }
                
                .project-desc { color: #6E6E73; }
                
                .project-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .project-langs {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .lang-tag {
                    font-size: 0.75rem;
                    padding: 0.3rem 0.6rem;
                    background: #F5F5F7;
                    border-radius: 6px;
                    border-left: 3px solid var(--lang-color, #D1D1D6);
                    color: #6E6E73;
                    font-weight: 500;
                }
                
                .project-stats {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.8rem;
                    color: #86868B;
                }
                
                .demo-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    margin-top: 1.25rem;
                    color: var(--primary, #0071E3);
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .demo-link:hover { 
                    opacity: 0.8;
                }
                
                .all-projects { margin-top: 4rem; }
                
                .projects-list {
                    border: 1px solid #E5E5E7;
                    border-radius: 16px;
                    overflow: hidden;
                    background: white;
                }
                
                .project-row {
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #E5E5E7;
                    color: #1A1A1A;
                }
                .project-row:last-child { border-bottom: none; }
                .project-row:hover { background: #F5F5F7; }
                
                .row-name {
                    font-weight: 600;
                    min-width: 160px;
                    color: #1A1A1A;
                }
                .row-desc {
                    flex: 1;
                    color: #86868B;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin: 0 1.5rem;
                }
                .row-stats {
                    color: #86868B;
                    font-size: 0.8rem;
                }
                
                .footer { color: #86868B; }
                .footer a { color: #6E6E73; }
                .footer a:hover { color: var(--primary, #0071E3); }
            `,
            
            dark: `
                body {
                    background: #0A0A0A;
                    color: #F5F5F7;
                }
                
                .portfolio-container {
                    background: linear-gradient(180deg, #0A0A0A 0%, #141414 100%);
                    min-height: 100vh;
                }
                
                .avatar {
                    border: 3px solid var(--accent, #0A84FF);
                    box-shadow: 0 0 40px rgba(10, 132, 255, 0.25);
                }
                
                .name { color: #F5F5F7; }
                .bio { color: #A1A1A6; }
                .location { color: #6E6E73; }
                
                .social-link {
                    background: rgba(255,255,255,0.06);
                    color: #A1A1A6;
                    border: 1px solid #2C2C2E;
                }
                .social-link:hover {
                    background: var(--accent, #0A84FF);
                    color: white;
                    border-color: var(--accent, #0A84FF);
                    box-shadow: 0 0 20px rgba(10, 132, 255, 0.4);
                }
                
                .section-title {
                    color: #F5F5F7;
                    font-family: "SF Mono", "Fira Code", monospace;
                }
                .section-title::before {
                    content: '// ';
                    color: var(--accent, #0A84FF);
                }
                
                .projects-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                .project-card {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid #2C2C2E;
                    backdrop-filter: blur(12px);
                }
                .project-card:hover {
                    border-color: var(--accent, #0A84FF);
                    box-shadow: 0 0 30px rgba(10, 132, 255, 0.15);
                    background: rgba(255,255,255,0.06);
                }
                
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                
                .folder-icon { font-size: 1.5rem; opacity: 0.8; }
                
                .card-links {
                    display: flex;
                    gap: 0.75rem;
                }
                .card-links a {
                    color: #6E6E73;
                }
                .card-links a:hover {
                    color: var(--accent, #0A84FF);
                }
                
                .project-title {
                    color: #F5F5F7;
                    font-family: "SF Mono", "Fira Code", monospace;
                }
                
                .project-desc { color: #A1A1A6; }
                
                .project-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid #2C2C2E;
                }
                
                .project-langs {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .lang-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                }
                
                .lang-name {
                    font-size: 0.8rem;
                    color: #6E6E73;
                }
                
                .project-stats {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.8rem;
                    color: #6E6E73;
                }
                
                .all-projects { margin-top: 4rem; }
                
                .projects-list {
                    border: 1px solid #2C2C2E;
                    border-radius: 16px;
                    overflow: hidden;
                    background: rgba(255,255,255,0.02);
                }
                
                .project-row {
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #2C2C2E;
                    color: #F5F5F7;
                }
                .project-row:last-child { border-bottom: none; }
                .project-row:hover {
                    background: rgba(255,255,255,0.04);
                }
                
                .row-name {
                    font-weight: 600;
                    min-width: 160px;
                    font-family: "SF Mono", "Fira Code", monospace;
                    color: #F5F5F7;
                }
                .row-desc {
                    flex: 1;
                    color: #6E6E73;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin: 0 1.5rem;
                }
                .row-stats { color: #6E6E73; font-size: 0.8rem; }
                
                .footer { color: #6E6E73; }
                .footer a { color: #A1A1A6; }
                .footer a:hover { color: var(--accent, #0A84FF); }
            `,
            
            creative: `
                body {
                    background: linear-gradient(135deg, #FDF2F8 0%, #EDE9FE 50%, #E0F2FE 100%);
                    color: #1A1A1A;
                    min-height: 100vh;
                }
                
                .portfolio-container {
                    position: relative;
                }
                
                .hero {
                    padding: clamp(3rem, 8vw, 5rem) 0;
                }
                
                .avatar {
                    border: 5px solid white;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.15);
                }
                
                .name {
                    background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #06B6D4 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.2));
                }
                
                .bio { color: #6E6E73; }
                .location { color: #86868B; }
                
                .social-link {
                    background: white;
                    color: #6E6E73;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    border: 1px solid rgba(255,255,255,0.8);
                }
                .social-link:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.25);
                    color: #8B5CF6;
                }
                
                .section-title {
                    color: #1A1A1A;
                    text-align: center;
                }
                
                .projects-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                .project-card {
                    background: rgba(255,255,255,0.9);
                    backdrop-filter: blur(12px);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
                    position: relative;
                    border: 1px solid rgba(255,255,255,0.6);
                }
                .project-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 48px rgba(139, 92, 246, 0.15);
                }
                
                .card-accent {
                    height: 5px;
                    background: var(--card-gradient);
                }
                
                .card-content {
                    padding: 1.75rem;
                }
                
                .card-top {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }
                
                .topic-tag {
                    font-size: 0.65rem;
                    padding: 0.3rem 0.75rem;
                    background: #F5F5F7;
                    border-radius: 20px;
                    color: #6E6E73;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    font-weight: 600;
                }
                
                .project-title {
                    color: #1A1A1A;
                    margin-bottom: 0.75rem;
                }
                
                .project-desc {
                    color: #6E6E73;
                    font-size: 0.875rem;
                }
                
                .card-bottom {
                    margin-top: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                
                .lang-pills {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .lang-pill {
                    font-size: 0.7rem;
                    padding: 0.3rem 0.75rem;
                    background: linear-gradient(135deg, #FCE7F3 0%, #EDE9FE 100%);
                    border-radius: 20px;
                    color: #7C3AED;
                    font-weight: 500;
                }
                
                .card-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .card-btn {
                    font-size: 0.8rem;
                    padding: 0.5rem 1.25rem;
                    border-radius: 20px;
                    background: #F5F5F7;
                    color: #6E6E73;
                    font-weight: 500;
                }
                .card-btn:hover {
                    background: #E5E5E7;
                    color: #1A1A1A;
                }
                .card-btn.primary {
                    background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
                    color: white;
                }
                .card-btn.primary:hover {
                    opacity: 0.9;
                    transform: scale(1.02);
                }
                
                .all-projects {
                    margin-top: 4rem;
                    background: rgba(255,255,255,0.9);
                    backdrop-filter: blur(12px);
                    border-radius: 24px;
                    padding: 2rem;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
                    border: 1px solid rgba(255,255,255,0.6);
                }
                
                .projects-list {
                    margin-top: 1.5rem;
                }
                
                .project-row {
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.25rem;
                    border-radius: 16px;
                    color: #1A1A1A;
                    margin-bottom: 0.5rem;
                }
                .project-row:hover {
                    background: linear-gradient(135deg, rgba(252, 231, 243, 0.5) 0%, rgba(237, 233, 254, 0.5) 100%);
                }
                
                .row-name {
                    font-weight: 600;
                    min-width: 160px;
                    color: #7C3AED;
                }
                .row-desc {
                    flex: 1;
                    color: #86868B;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin: 0 1.5rem;
                }
                .row-stats {
                    color: #EC4899;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                
                .footer {
                    color: #86868B;
                    margin-top: 3rem;
                }
                .footer a { color: #7C3AED; }
                .footer a:hover { opacity: 0.8; }
            `
        };

        return baseStyles + (templateSpecific[template] || templateSpecific.minimal);
    }

    // public api
    return {
        setUserData,
        setTemplate,
        updateSettings,
        getSettings,
        getFilteredRepos,
        getFeaturedRepos,
        render,
        getCurrentTemplate: () => currentTemplate,
        getUserData: () => userData
    };
})();
