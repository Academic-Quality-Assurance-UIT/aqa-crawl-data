#!/usr/bin/env node

const { Client } = require('pg');

// Quick transfer script for large tables using 20k batch size
async function quickTransfer() {
    const sourceConfig = {
        host: 'localhost',
        port: 5432,
        database: 'aqa_survey',
        user: 'aqa_user',
        password: 'aqa_password'
    };

    const targetConfig = {
        host: 'localhost',
        port: 5433,
        database: 'aqa',
        user: 'postgres',
        password: 'jnhbgvfc'
    };

    const sourceClient = new Client(sourceConfig);
    const targetClient = new Client(targetConfig);

    try {
        await sourceClient.connect();
        await targetClient.connect();
        console.log('✅ Connected to both databases');

        // Get table with most rows to test batch processing
        const tablesResult = await sourceClient.query(`
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as row_count
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public'
            ORDER BY n_tup_ins DESC
            LIMIT 5
        `);

        console.log('\n📊 Top 5 tables by estimated row count:');
        tablesResult.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.tablename}: ~${row.row_count} rows`);
        });

        // Check actual counts for key tables
        const keyTables = ['point_answer', 'point', 'class', 'comment'];
        console.log('\n📊 Actual row counts for key tables:');
        
        for (const tableName of keyTables) {
            try {
                const countResult = await sourceClient.query(`SELECT COUNT(*) FROM ${tableName}`);
                const count = parseInt(countResult.rows[0].count);
                const batches = Math.ceil(count / 20000);
                console.log(`  ${tableName}: ${count.toLocaleString()} rows (${batches} batches of 20k)`);
            } catch (error) {
                console.log(`  ${tableName}: table not found or error`);
            }
        }

        console.log('\n💡 Batch processing will use 20,000 rows per batch to prevent memory exhaustion');
        console.log('   This is optimal for tables with 1M+ rows');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sourceClient.end();
        await targetClient.end();
    }
}

if (require.main === module) {
    quickTransfer().catch(console.error);
}
