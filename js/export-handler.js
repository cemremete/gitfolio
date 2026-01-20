// export and download functionality
// handles html download, clipboard copy, deploy instructions

const ExportHandler = (function() {
    
    // console.log('export handler ready');

    // generate final html with seo
    function generateExportHtml() {
        const userData = TemplateEngine.getUserData();
        const settings = TemplateEngine.getSettings();
        
        if (!userData) {
            console.error('no data to export');
            return null;
        }

        // get base html from template engine
        let html = TemplateEngine.render();
        
        // inject seo meta tags
        html = SEOGenerator.injectIntoHtml(html, userData, settings);

        // inject custom colors as css variables
        html = injectCustomColors(html, settings);

        return html;
    }

    // add custom color variables to the html
    function injectCustomColors(html, settings) {
        const colorVars = `
        :root {
            --primary: ${settings.primaryColor};
            --accent: ${settings.accentColor};
        }`;
        
        // find first <style> tag and prepend our vars
        const styleIndex = html.indexOf('<style>');
        if (styleIndex !== -1) {
            const insertPos = styleIndex + 7; // after <style>
            html = html.slice(0, insertPos) + colorVars + html.slice(insertPos);
        }
        
        return html;
    }

    // download html as file
    function downloadHtml(filename) {
        const html = generateExportHtml();
        if (!html) return false;

        filename = filename || 'portfolio.html';
        
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        return true;
    }

    // copy html to clipboard
    async function copyToClipboard() {
        const html = generateExportHtml();
        if (!html) return false;

        try {
            await navigator.clipboard.writeText(html);
            return true;
        } catch(err) {
            // fallback for older browsers
            console.warn('clipboard api failed, trying fallback');
            return copyFallback(html);
        }
    }

    // fallback copy method using textarea
    function copyFallback(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch(err) {
            document.body.removeChild(textarea);
            return false;
        }
    }

    // generate sitemap and robots.txt as downloadable zip
    // actually lets just provide them separately, zip is overkill
    function downloadSitemap() {
        const userData = TemplateEngine.getUserData();
        const sitemap = SEOGenerator.generateSitemap(userData);
        
        const blob = new Blob([sitemap], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sitemap.xml';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    function downloadRobotsTxt() {
        const robots = SEOGenerator.generateRobotsTxt();
        
        const blob = new Blob([robots], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'robots.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // get deploy instructions for different platforms
    function getDeployInstructions(platform) {
        const instructions = {
            netlify: {
                title: 'Deploy to Netlify',
                steps: [
                    'Download your portfolio HTML file',
                    'Go to <a href="https://app.netlify.com/drop" target="_blank">Netlify Drop</a>',
                    'Drag and drop your HTML file onto the page',
                    'Your site will be live in seconds!',
                    'Optional: Connect a custom domain in Netlify settings'
                ]
            },
            github: {
                title: 'Deploy to GitHub Pages',
                steps: [
                    'Create a new repository named <code>yourusername.github.io</code>',
                    'Upload your portfolio.html file and rename it to <code>index.html</code>',
                    'Go to repository Settings → Pages',
                    'Select "Deploy from a branch" and choose main branch',
                    'Your site will be live at https://yourusername.github.io'
                ]
            },
            vercel: {
                title: 'Deploy to Vercel',
                steps: [
                    'Download your portfolio HTML file',
                    'Create a folder and put the file inside as <code>index.html</code>',
                    'Go to <a href="https://vercel.com/new" target="_blank">Vercel</a> and sign up',
                    'Drag and drop your folder or connect via CLI',
                    'Your site will be deployed automatically'
                ]
            }
        };

        return instructions[platform] || instructions.netlify;
    }

    // generate a simple qr code (using external api)
    // this is kinda hacky but works without dependencies
    function generateQRCode(url, size = 150) {
        // using qrserver api - free and no auth needed
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
        return qrUrl;
    }

    // get preview url for the current portfolio
    // this creates a data url that can be used in iframe
    function getPreviewDataUrl() {
        const html = generateExportHtml();
        if (!html) return null;
        
        // create blob url for preview
        const blob = new Blob([html], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }

    // cleanup blob urls when done
    function revokePreviewUrl(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }

    // estimate file size
    function getEstimatedSize() {
        const html = generateExportHtml();
        if (!html) return '0 KB';
        
        const bytes = new Blob([html]).size;
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // public api
    return {
        generateExportHtml,
        downloadHtml,
        copyToClipboard,
        downloadSitemap,
        downloadRobotsTxt,
        getDeployInstructions,
        generateQRCode,
        getPreviewDataUrl,
        revokePreviewUrl,
        getEstimatedSize
    };
})();
