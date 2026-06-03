# Rollback Instructions — v2.4 Backup

If the redesign fails and you need to restore the current working version:

## Step 1 — Download these three files from this backup folder:
- App.css
- Dashboard.js
- DriveStatusBar.js

## Step 2 — Copy them back into place:
cp ~/Downloads/App.css ~/Desktop/knowledge-base/src/App.css
cp ~/Downloads/Dashboard.js ~/Desktop/knowledge-base/src/components/Dashboard.js
cp ~/Downloads/DriveStatusBar.js ~/Desktop/knowledge-base/src/components/DriveStatusBar.js

## Step 3 — Build and push:
cd ~/Desktop/knowledge-base && \
REACT_APP_SUPABASE_URL="https://bkauwzygugfjdaeofmnt.supabase.co" \
REACT_APP_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXV3enlndWdmamRhZW9mbW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzc5MzAsImV4cCI6MjA5MzgxMzkzMH0.tQiGTepIM-Q7qk--jGeiaZDMbv5777tBKocoEMDCdTI" \
REACT_APP_GOOGLE_CLIENT_ID="222965495212-c1jmq3jseqemcbqqpq3nnvoo0sc6qs8k.apps.googleusercontent.com" \
npm run build && \
grep -o "bkauwzygugfjdaeofmnt" build/static/js/main.*.js | head -1 && \
git add -f build/ src/ && \
git commit -m "Rollback to v2.4" && \
git push

## What this restores:
- Dark grey canvas (#5D5D5D)
- Near-black sidebar (#0E0D0B)
- Stanford Red accents (#a51d36)
- Inter + Playfair Display fonts
- Card grid layout with truncated summaries
- All features: multi-PDF, image vision, chat panel, Drive backup
