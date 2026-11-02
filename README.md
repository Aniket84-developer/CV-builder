# AI Bio-Data / CV Maker

A simple, beautiful web app that creates professional **Nepali-style Bio-Data / CV** from:

1. **Passport photo** + **Nagrikta (Citizenship) photo** → AI (GPT-4o Vision) extracts personal details
2. User enters **work experience** (Company → Job title → Years → Country)
3. AI polishes the wording and generates a clean Bio-Data matching the classic format

## Features

- Upload Passport + Citizenship images
- AI extracts: Name, DOB, Address, Passport number & dates, etc.
- All extracted fields are **editable**
- Multiple work experiences supported
- Generates a printable / downloadable PDF Bio-Data
- Matches the traditional format (Objectives, Personal Profile, Education, Experience, Passport Details, Declaration)
- API key stored **only in browser** (localStorage) – never sent to any third-party server of mine

## How to Use

### 1. Get an OpenAI API Key
- Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Create a new secret key
- You need credits for GPT-4o (vision) and GPT-4o-mini

### 2. Run Locally
```bash
# Just open index.html in any modern browser
# Or use a simple local server:
npx serve .
# or
python -m http.server 8000
```

### 3. Deploy to GitHub Pages
1. Create a new repository on GitHub
2. Upload all files (`index.html`, `styles.css`, `app.js`, `README.md`)
3. Go to **Settings → Pages**
4. Source: Deploy from branch `main` / root
5. Your site will be live at `https://yourusername.github.io/repo-name`

### 4. Using the App
1. Paste your OpenAI API key and click **Save Key**
2. Upload **Passport photo** and **Nagrikta photo**
3. Click **Analyze Photos with AI**
4. Review / edit the extracted personal details
5. Add one or more work experiences (Company, Position, Years, Country)
6. Click **Generate Professional Bio-Data / CV**
7. Preview → Download PDF or Print

## File Structure
```
cv-maker/
├── index.html      # Main page
├── styles.css      # Styling + CV paper design
├── app.js          # All logic + OpenAI calls
└── README.md
```

## Notes
- Works best with clear, well-lit photos of the documents
- AI may occasionally misread handwritten or low-quality text – always review the extracted fields
- Cost is very low (usually < $0.05 per full CV generation)
- No backend required – pure frontend

## License
MIT – free to use, modify, and share.
