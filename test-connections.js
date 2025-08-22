#!/usr/bin/env node

const { Client } = require('pg');

// Database configurations
const databases = {
    source: {
        name: 'Source (AQA Crawl)',
        config: {
            host: 'localhost',
            port: 5432,
            database: 'aqa_survey',
            user: 'aqa_user',
            password: 'aqa_password'
        }
    },
    target: {
        name: 'Target (AQA App)',
        config: {
            host: 'localhost',
            port: 5433,
            database: 'aqa',
            user: 'postgres',
            password: 'jnhbgvfc'
        }
    }
};

async function testConnection(name, config) {
    const client = new Client(config);
    
    try {
        console.log(`🔌 Testing connection to ${name}...`);
        await client.connect();
        
        // Test basic query
        const result = await client.query('SELECT version()');
        console.log(`✅ ${name}: Connected successfully`);
        console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[1]}`);
        
        // Test table count
        const tableResult = await client.query(`
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`   Tables: ${tableResult.rows[0].table_count}`);
        
        return true;
    } catch (error) {
        console.error(`❌ ${name}: Connection failed`);
        console.error(`   Error: ${error.message}`);
        return false;
    } finally {
        try {
            await client.end();
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

async function main() {
    console.log('🧪 Database Connection Test\n');
    
    let allConnected = true;
    
    for (const [key, db] of Object.entries(databases)) {
        const success = await testConnection(db.name, db.config);
        allConnected = allConnected && success;
        console.log(''); // Empty line for readability
    }
    
    if (allConnected) {
        console.log('🎉 All database connections successful!');
        console.log('💡 You can now run the transfer scripts.');
        console.log('');
        console.log('Quick commands:');
        console.log('  npm run transfer-stats    # Check table statistics');
        console.log('  npm run transfer-config   # View configuration');
        console.log('  npm run transfer          # Start transfer');
    } else {
        console.log('💥 One or more database connections failed.');
        console.log('');
        console.log('Troubleshooting steps:');
        console.log('1. Check if Docker containers are running:');
        console.log('   docker ps');
        console.log('2. Check if databases are accessible:');
        console.log('   Source: psql -h localhost -p 5432 -U aqa_user -d aqa_survey');
        console.log('   Target: psql -h localhost -p 5433 -U postgres -d aqa');
        console.log('3. Verify database credentials in the configuration files');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
