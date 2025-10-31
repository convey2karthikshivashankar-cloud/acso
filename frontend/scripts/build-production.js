#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting ACSO Enterprise UI Production Build...\n');

// Environment validation
const requiredEnvVars = [
  'REACT_APP_API_BASE_URL',
  'REACT_APP_WS_URL'
];

console.log('📋 Validating environment variables...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  process.exit(1);
}

console.log('✅ Environment variables validated\n');

// Clean previous build
console.log('🧹 Cleaning previous build...');
try {
  if (fs.existsSync('dist')) {
    execSync('rm -rf dist', { stdio: 'inherit' });
  }
  console.log('✅ Previous build cleaned\n');
} catch (error) {
  console.error('❌ Failed to clean previous build:', error.message);
  process.exit(1);
}

// Type checking
console.log('🔍 Running TypeScript type checking...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript type checking passed\n');
} catch (error) {
  console.error('❌ TypeScript type checking failed');
  process.exit(1);
}

// Linting
console.log('🔧 Running ESLint...');
try {
  execSync('npx eslint src --ext .ts,.tsx --max-warnings 0', { stdio: 'inherit' });
  console.log('✅ ESLint passed\n');
} catch (error) {
  console.error('❌ ESLint failed');
  process.exit(1);
}

// Build
console.log('🏗️  Building production bundle...');
try {
  execSync('npx vite build --config vite.config.production.ts', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  console.log('✅ Production build completed\n');
} catch (error) {
  console.error('❌ Production build failed');
  process.exit(1);
}

// Bundle analysis
console.log('📊 Analyzing bundle size...');
try {
  const statsPath = path.join(__dirname, '../dist/stats.html');
  if (fs.existsSync(statsPath)) {
    console.log('✅ Bundle analysis report generated at dist/stats.html');
  }
  
  // Check bundle sizes
  const distPath = path.join(__dirname, '../dist');
  const jsFiles = fs.readdirSync(path.join(distPath, 'js'))
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(distPath, 'js', file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024)
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('\n📦 JavaScript Bundle Sizes:');
  jsFiles.forEach(file => {
    const sizeColor = file.sizeKB > 500 ? '🔴' : file.sizeKB > 200 ? '🟡' : '🟢';
    console.log(`   ${sizeColor} ${file.name}: ${file.sizeKB} KB`);
  });

  const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSizeKB = Math.round(totalSize / 1024);
  console.log(`\n📊 Total JavaScript Size: ${totalSizeKB} KB`);

  if (totalSizeKB > 2000) {
    console.warn('⚠️  Warning: Total bundle size exceeds 2MB. Consider code splitting.');
  }

} catch (error) {
  console.warn('⚠️  Could not analyze bundle sizes:', error.message);
}

// Generate build info
console.log('\n📝 Generating build information...');
try {
  const buildInfo = {
    version: process.env.npm_package_version || '1.0.0',
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    environment: 'production',
    gitCommit: process.env.GITHUB_SHA || 'unknown',
    gitBranch: process.env.GITHUB_REF_NAME || 'unknown'
  };

  fs.writeFileSync(
    path.join(__dirname, '../dist/build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );

  console.log('✅ Build information generated');
  console.log(`   Version: ${buildInfo.version}`);
  console.log(`   Build Time: ${buildInfo.buildTime}`);
  console.log(`   Git Commit: ${buildInfo.gitCommit}`);

} catch (error) {
  console.warn('⚠️  Could not generate build info:', error.message);
}

// Security check
console.log('\n🔒 Running security audit...');
try {
  execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
  console.log('✅ Security audit passed');
} catch (error) {
  console.warn('⚠️  Security audit found issues. Please review and fix.');
}

// Final validation
console.log('\n🔍 Validating build output...');
try {
  const requiredFiles = [
    'dist/index.html',
    'dist/build-info.json'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required build files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }

  // Check if index.html contains proper asset references
  const indexHtml = fs.readFileSync('dist/index.html', 'utf8');
  if (!indexHtml.includes('assets/') && !indexHtml.includes('js/')) {
    console.error('❌ index.html does not contain proper asset references');
    process.exit(1);
  }

  console.log('✅ Build output validated');

} catch (error) {
  console.error('❌ Build validation failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Production build completed successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Test the build locally: npm run preview');
console.log('   2. Deploy to staging environment');
console.log('   3. Run end-to-end tests');
console.log('   4. Deploy to production');
console.log('\n📁 Build output available in: ./dist/');