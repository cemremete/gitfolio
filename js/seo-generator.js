// seo meta tag generator
// creates all the meta stuff for better search visibility

const SEOGenerator = (function() {
    
    // console.log('seo generator init');

    function generateMetaTags(userData, settings) {
        if (!userData || !userData.userInfo) {
            return '';
        }

        const user = userData.userInfo;
        const name = user.name || user.login;
        const bio = settings.bio || user.bio || `${name}'s developer portfolio`;
        const avatar = user.avatar_url;
        const url = user.html_url;
        
        // truncate bio for meta description (google shows ~155 chars)
        const description = bio.length > 155 ? bio.slice(0, 152) + '...' : bio;

        // get top repos for keywords
        const repos = userData.repos || [];
        const topRepoNames = repos.slice(0, 5).map(r => r.name).join(', ');
        
        // collect all languages used
        const languages = new Set();
        repos.forEach(repo => {
            if (repo.languageData) {
                Object.keys(repo.languageData).forEach(lang => languages.add(lang));
            } else if (repo.language) {
                languages.add(repo.language);
            }
        });
        const langKeywords = Array.from(languages).slice(0, 10).join(', ');

        const metaTags = `
    <!-- basic meta -->
    <meta name="description" content="${escapeAttr(description)}">
    <meta name="author" content="${escapeAttr(name)}">
    <meta name="keywords" content="developer, portfolio, ${escapeAttr(langKeywords)}, ${escapeAttr(topRepoNames)}">
    
    <!-- open graph / facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeAttr(url)}">
    <meta property="og:title" content="${escapeAttr(name)} - Developer Portfolio">
    <meta property="og:description" content="${escapeAttr(description)}">
    <meta property="og:image" content="${escapeAttr(avatar)}">
    
    <!-- twitter card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${escapeAttr(url)}">
    <meta name="twitter:title" content="${escapeAttr(name)} - Developer Portfolio">
    <meta name="twitter:description" content="${escapeAttr(description)}">
    <meta name="twitter:image" content="${escapeAttr(avatar)}">
    
    <!-- extra seo stuff -->
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${escapeAttr(url)}">
        `;

        return metaTags.trim();
    }

    // json-ld structured data for google
    function generateStructuredData(userData, settings) {
        if (!userData || !userData.userInfo) {
            return '';
        }

        const user = userData.userInfo;
        const name = user.name || user.login;
        const bio = settings.bio || user.bio || '';

        // collect skills from languages
        const skills = new Set();
        (userData.repos || []).forEach(repo => {
            if (repo.languageData) {
                Object.keys(repo.languageData).forEach(lang => skills.add(lang));
            }
        });

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": name,
            "url": user.html_url,
            "image": user.avatar_url,
            "description": bio,
            "sameAs": [
                user.html_url,
                settings.linkedin || null,
                settings.twitter ? `https://twitter.com/${settings.twitter.replace('@', '')}` : null
            ].filter(Boolean),
            "jobTitle": "Software Developer",
            "knowsAbout": Array.from(skills).slice(0, 15)
        };

        // add email if provided
        if (settings.email) {
            structuredData.email = settings.email;
        }

        // add location if available
        if (user.location) {
            structuredData.address = {
                "@type": "PostalAddress",
                "addressLocality": user.location
            };
        }

        return `<script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2)}\n</script>`;
    }

    // generate sitemap xml
    function generateSitemap(userData) {
        if (!userData || !userData.userInfo) {
            return '';
        }

        const baseUrl = userData.userInfo.html_url;
        const today = new Date().toISOString().split('T')[0];

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${escapeXml(baseUrl)}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>`;

        return sitemap;
    }

    // generate robots.txt
    function generateRobotsTxt() {
        return `User-agent: *
Allow: /

# sitemap location (update this with your actual domain)
# Sitemap: https://yourdomain.com/sitemap.xml`;
    }

    // inject seo tags into html
    function injectIntoHtml(html, userData, settings) {
        const metaTags = generateMetaTags(userData, settings);
        const structuredData = generateStructuredData(userData, settings);
        
        // find the closing </head> tag and inject before it
        const headCloseIndex = html.indexOf('</head>');
        if (headCloseIndex === -1) {
            // no head tag? weird but ok, just return as is
            console.warn('no </head> found in html');
            return html;
        }

        // also inject structured data before </body>
        let result = html.slice(0, headCloseIndex) + metaTags + '\n' + html.slice(headCloseIndex);
        
        const bodyCloseIndex = result.indexOf('</body>');
        if (bodyCloseIndex !== -1) {
            result = result.slice(0, bodyCloseIndex) + structuredData + '\n' + result.slice(bodyCloseIndex);
        }

        return result;
    }

    // helper to escape html attributes
    function escapeAttr(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // helper to escape xml
    function escapeXml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // public api
    return {
        generateMetaTags,
        generateStructuredData,
        generateSitemap,
        generateRobotsTxt,
        injectIntoHtml
    };
})();
