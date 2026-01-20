// github api stuff
// rate limit is 60/hour without auth which is kinda annoying

const GitHubAPI = (function() {
    const BASE_URL = 'https://api.github.com';
    const CACHE_KEY = 'gitfolio_cache';
    const CACHE_DURATION = 1000 * 60 * 30; // 30 mins, seemed reasonable
    
    // console.log('GitHubAPI module loaded');
    
    let rateLimitRemaining = 60;
    let rateLimitReset = null;

    // check if we have cached data thats still fresh
    function getCachedData(username) {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            if (data.username !== username) return null;
            
            const age = Date.now() - data.lastFetch;
            if (age > CACHE_DURATION) {
                // console.log('cache expired');
                return null;
            }
            
            return data;
        } catch(e) {
            // localStorage might be full or disabled
            console.warn('cache read failed:', e);
            return null;
        }
    }

    function setCachedData(username, repos, userInfo) {
        try {
            const data = {
                username,
                repos,
                userInfo,
                lastFetch: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch(e) {
            // probably quota exceeded, whatever
            console.warn('cache write failed:', e);
        }
    }

    // update rate limit from response headers
    function updateRateLimit(response) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');
        
        if (remaining) rateLimitRemaining = parseInt(remaining);
        if (reset) rateLimitReset = parseInt(reset) * 1000;
        
        // console.log('rate limit remaining:', rateLimitRemaining);
    }

    async function fetchWithRateLimit(url) {
        if (rateLimitRemaining <= 0 && rateLimitReset && Date.now() < rateLimitReset) {
            const waitTime = Math.ceil((rateLimitReset - Date.now()) / 1000 / 60);
            throw new Error(`Rate limit exceeded. Try again in ${waitTime} minutes.`);
        }

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        updateRateLimit(response);
        
        if (response.status === 404) {
            throw new Error('User not found');
        }
        if (response.status === 403) {
            throw new Error('Rate limit exceeded. Try again later.');
        }
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        return response.json();
    }

    // get user info
    async function fetchUser(username) {
        const url = `${BASE_URL}/users/${username}`;
        return fetchWithRateLimit(url);
    }

    // get all repos, handles pagination
    async function fetchRepos(username, onProgress) {
        const repos = [];
        let page = 1;
        const perPage = 100; // max allowed
        
        while (true) {
            const url = `${BASE_URL}/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated`;
            const pageRepos = await fetchWithRateLimit(url);
            
            if (pageRepos.length === 0) break;
            
            repos.push(...pageRepos);
            
            if (onProgress) {
                onProgress(`Fetched ${repos.length} repos...`);
            }
            
            if (pageRepos.length < perPage) break;
            page++;
            
            // dont hammer the api too hard
            await sleep(100);
        }
        
        return repos;
    }

    // get languages for a repo
    async function fetchLanguages(owner, repo) {
        const url = `${BASE_URL}/repos/${owner}/${repo}/languages`;
        try {
            return await fetchWithRateLimit(url);
        } catch(e) {
            // some repos might not have languages, thats fine
            return {};
        }
    }

    // get readme content (just first paragraph usually)
    async function fetchReadme(owner, repo) {
        const url = `${BASE_URL}/repos/${owner}/${repo}/readme`;
        try {
            const data = await fetchWithRateLimit(url);
            // content is base64 encoded
            const content = atob(data.content);
            return extractFirstParagraph(content);
        } catch(e) {
            // no readme is common
            return null;
        }
    }

    // try to get a useful excerpt from readme
    function extractFirstParagraph(markdown) {
        // skip badges and headers at the start
        const lines = markdown.split('\n');
        let paragraph = '';
        let foundContent = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // skip empty lines, badges, headers
            if (!trimmed) {
                if (foundContent && paragraph) break;
                continue;
            }
            if (trimmed.startsWith('#')) continue;
            if (trimmed.startsWith('![')) continue;
            if (trimmed.startsWith('[!')) continue; // shields.io badges
            if (trimmed.startsWith('[![')) continue;
            
            foundContent = true;
            paragraph += (paragraph ? ' ' : '') + trimmed;
            
            // dont grab too much
            if (paragraph.length > 300) break;
        }
        
        // clean up markdown syntax
        paragraph = paragraph
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
            .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
            .replace(/\*([^*]+)\*/g, '$1') // italic
            .replace(/`([^`]+)`/g, '$1'); // code
        
        return paragraph.slice(0, 250) + (paragraph.length > 250 ? '...' : '');
    }

    // helper
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // main function to get everything we need
    async function fetchUserData(username, onProgress) {
        // check cache first
        const cached = getCachedData(username);
        if (cached) {
            if (onProgress) onProgress('Using cached data...');
            return cached;
        }

        if (onProgress) onProgress('Fetching user info...');
        const userInfo = await fetchUser(username);
        
        if (onProgress) onProgress('Fetching repositories...');
        const repos = await fetchRepos(username, onProgress);
        
        if (repos.length === 0) {
            throw new Error('No public repositories found');
        }

        // fetch languages for top repos (dont want to hit rate limit)
        // only do this for repos we'll actually show
        const topRepos = repos.slice(0, 20);
        
        if (onProgress) onProgress('Fetching language data...');
        
        for (let i = 0; i < topRepos.length; i++) {
            const repo = topRepos[i];
            repo.languageData = await fetchLanguages(username, repo.name);
            
            // also try to get readme for featured repos
            if (i < 6) {
                repo.readmeExcerpt = await fetchReadme(username, repo.name);
            }
            
            if (onProgress) {
                const pct = Math.round((i + 1) / topRepos.length * 100);
                onProgress(`Processing repos... ${pct}%`);
            }
            
            await sleep(50); // be nice to the api
        }

        // cache it
        setCachedData(username, repos, userInfo);

        return { username, repos, userInfo, lastFetch: Date.now() };
    }

    // public api
    return {
        fetchUserData,
        getRateLimitInfo: () => ({ remaining: rateLimitRemaining, reset: rateLimitReset }),
        clearCache: () => localStorage.removeItem(CACHE_KEY)
    };
})();
