#!/bin/bash
cd ~/Desktop/knowledge-base
REACT_APP_SUPABASE_URL="https://bkauwzygugfjdaeofmnt.supabase.co" \
REACT_APP_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYXV3enlndWdmamRhZW9mbW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzc5MzAsImV4cCI6MjA5MzgxMzkzMH0.tQiGTepIM-Q7qk--jGeiaZDMbv5777tBKocoEMDCdTI" \
REACT_APP_GOOGLE_CLIENT_ID="222965495212-c1jmq3jseqemcbqqpq3nnvoo0sc6qs8k.apps.googleusercontent.com" \
npm run build && \
grep -o "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[^\"]*" build/static/js/main.*.js | head -1 | grep -o "emln\|enln"
