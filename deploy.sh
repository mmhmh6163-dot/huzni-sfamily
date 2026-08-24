#!/bin/bash
# deploy.sh

echo "🚀 Building for GitHub Pages..."

# Build the project
npm run build

# Create .nojekyll file
touch out/.nojekyll

# Deploy to gh-pages branch
npx gh-pages -d out -b gh-pages -m "Deploy to GitHub Pages [skip ci]"

echo "✅ Deployed successfully!"
echo "🌐 Your site will be available at: https://mmhmh6163-dot.github.io/huzni-sfamily/"
