# gitfolio

I was job hunting last month and realized I was spending way too much time keeping my portfolio updated. Every new project meant manually editing HTML, taking screenshots, writing descriptions... it was getting ridiculous.

So I built this thing over a weekend. Just enter your GitHub username and it pulls all your repos, lets you pick a template, and generates a complete portfolio page. One click and you're done.

## Why I made this

- Manually updating portfolios is tedious af
- Wanted to play around with the GitHub API
- Needed something for my own job applications anyway
- Figured other people might find it useful too

## Features

- **Auto-pulls from GitHub** - repos, languages, stars, descriptions, everything
- **3 template styles** - minimal (clean white), developer dark (terminal vibes), creative (colorful gradients)
- **Customize colors** - pick your own primary/accent colors
- **Add your info** - bio, social links, email
- **SEO ready** - meta tags, open graph, structured data all generated
- **One-click export** - download as single HTML file, ready to host anywhere

## How to use

1. Open `index.html` in your browser
2. Enter your GitHub username
3. Wait for it to fetch your repos (might take a sec if you have a lot)
4. Pick a template you like
5. Customize colors, add bio, select featured projects
6. Hit export and download your portfolio

That's it. Drop the HTML file on Netlify or GitHub Pages and you're live.

## Running locally

Just open `index.html` in a browser. No build step, no npm install, no nothing. It's vanilla JS.

If you want to serve it properly:
```bash
# python
python -m http.server 8000

# or node if you have serve installed
npx serve .
```

## Project structure

```
gitfolio/
├── index.html          # main app
├── styles/
│   ├── main.css        # app styles
│   └── templates/      # portfolio template styles
├── js/
│   ├── app.js          # main controller
│   ├── github-api.js   # api stuff
│   ├── template-engine.js  # renders portfolios
│   ├── seo-generator.js    # meta tags etc
│   └── export-handler.js   # download/copy
└── templates/          # html references (not actually used)
```

## Known issues

- **Rate limiting** - GitHub API only allows 60 requests/hour without auth. If you have tons of repos or keep refreshing, you might hit the limit. Working on adding optional OAuth.
- **Some repos look weird** - If your repo doesn't have a description, it shows "No description". Not much I can do about that lol
- **Mobile preview** - The mobile preview in the editor is just a narrow iframe, not a real device simulation

## Things I might add later

- [ ] OAuth for higher rate limits
- [ ] More templates (maybe a "hacker" theme?)
- [ ] Import from other sources (GitLab, Bitbucket)
- [ ] Custom CSS injection
- [ ] Blog post integration (dev.to, hashnode)
- [ ] Analytics preview (lighthouse scores etc)

## Tech

Pure vanilla JavaScript. No React, no Vue, no build tools. Just HTML, CSS, and JS like the old days.

Uses:
- GitHub REST API v3
- Google Fonts (Inter, JetBrains Mono)
- localStorage for caching

## Contributing

Feel free to open issues or PRs. The code is pretty straightforward, most of the interesting stuff is in `template-engine.js`.

## License

MIT 

---

Built this because I was tired of updating my portfolio manually. Hope it saves someone else some time too.
