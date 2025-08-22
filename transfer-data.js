#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Source database configuration (from docker-compose.yml)
const sourceConfig = {
    host: 'localhost',
    port: 5432,
    database: 'aqa_survey',
    user: 'aqa_user',
    password: 'aqa_password'
};

// Target database configuration
const targetConfig = {
    host: 'localhost',
    port: 5433,
    database: 'aqa',
    user: 'postgres',
    password: 'jnhbgvfc'
};

// Define tables in dependency order (tables that reference others come after)
const TABLES = [
    'semester',
    'faculty', 
    'subject',
    'lecturer',
    'criteria',
    'class',
    'point',
    'comment'
];

// Table configurations
const TABLE_CONFIG = {
    semester: {
        select: 'SELECT * FROM semester ORDER BY created_at',
        dependencies: []
    },
    faculty: {
        select: 'SELECT * FROM faculty ORDER BY created_at',
        dependencies: []
    },
    subject: {
        select: 'SELECT * FROM subject ORDER BY created_at',
        dependencies: ['faculty']
    },
    lecturer: {
        select: 'SELECT * FROM lecturer ORDER BY created_at',
        dependencies: ['faculty']
    },
    criteria: {
        select: 'SELECT * FROM criteria ORDER BY created_at',
        dependencies: []
    },
    class: {
        select: 'SELECT * FROM class ORDER BY created_at',
        dependencies: ['semester', 'subject', 'lecturer']
    },
    point_answer: {
        select: 'SELECT * FROM point_answer ORDER BY created_at',
        dependencies: ['criteria', 'class']
    },
    point: {
        select: 'SELECT * FROM point ORDER BY created_at',
        dependencies: ['criteria', 'class']
    },
    comment: {
        select: 'SELECT * FROM comment ORDER BY created_at',
        dependencies: ['class']
    },
    user_entity: {
        select: 'SELECT * FROM user_entity ORDER BY "lastAccess"',
        dependencies: ['faculty', 'lecturer']
    }
};

class DataTransfer {
    constructor() {
        this.sourceClient = null;
        this.targetClient = null;
        this.transferLog = [];
    }

    async connect() {
        console.log('🔌 Connecting to databases...');
        
        this.sourceClient = new Client(sourceConfig);
        this.targetClient = new Client(targetConfig);
        
        try {
            await this.sourceClient.connect();
            console.log('✅ Connected to source database');
        } catch (error) {
            console.error('❌ Failed to connect to source database:', error.message);
            throw error;
        }
        
        try {
            await this.targetClient.connect();
            console.log('✅ Connected to target database');
        } catch (error) {
            console.error('❌ Failed to connect to target database:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.sourceClient) {
            await this.sourceClient.end();
            console.log('🔌 Disconnected from source database');
        }
        if (this.targetClient) {
            await this.targetClient.end();
            console.log('🔌 Disconnected from target database');
        }
    }

    async checkTableExists(client, tableName) {
        const query = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `;
        const result = await client.query(query, [tableName]);
        return result.rows[0].exists;
    }

    async getTableRowCount(client, tableName) {
        try {
            const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
            return parseInt(result.rows[0].count);
        } catch (error) {
            return 0;
        }
    }

    async createTableInTarget(tableName) {
        console.log(`📋 Creating table '${tableName}' in target database...`);
        
        // Read the table schema from init.sql
        const initSqlPath = path.join(__dirname, 'init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        
        // Extract the CREATE TABLE statement for this table
        const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}[\\s\\S]*?;`, 'i');
        const match = initSql.match(tableRegex);
        
        if (match) {
            try {
                await this.targetClient.query(match[0]);
                console.log(`✅ Table '${tableName}' created successfully`);
            } catch (error) {
                console.log(`ℹ️  Table '${tableName}' may already exist: ${error.message}`);
            }
        } else {
            console.warn(`⚠️  Could not find CREATE TABLE statement for '${tableName}'`);
        }
    }

    async transferTable(tableName) {
        console.log(`\n📦 Transferring table: ${tableName}`);
        
        const config = TABLE_CONFIG[tableName];
        if (!config) {
            console.error(`❌ No configuration found for table: ${tableName}`);
            return false;
        }

        const BATCH_SIZE = 20000; // Process 20k rows at a time to prevent memory exhaustion

        try {
            // Check if source table exists and has data
            const sourceExists = await this.checkTableExists(this.sourceClient, tableName);
            if (!sourceExists) {
                console.log(`⚠️  Table '${tableName}' does not exist in source database`);
                return false;
            }

            const sourceCount = await this.getTableRowCount(this.sourceClient, tableName);
            if (sourceCount === 0) {
                console.log(`ℹ️  Table '${tableName}' is empty in source database`);
                return true;
            }

            // Ensure target table exists
            const targetExists = await this.checkTableExists(this.targetClient, tableName);
            if (!targetExists) {
                await this.createTableInTarget(tableName);
            }

            // Clear target table first (optional - comment out if you want to append)
            const targetCountBefore = await this.getTableRowCount(this.targetClient, tableName);
            if (targetCountBefore > 0) {
                console.log(`🗑️  Clearing existing ${targetCountBefore} rows in target table...`);
                await this.targetClient.query(`TRUNCATE TABLE ${tableName} CASCADE`);
            }

            console.log(`📊 Processing ${sourceCount} rows in batches of ${BATCH_SIZE}...`);
            
            const totalBatches = Math.ceil(sourceCount / BATCH_SIZE);
            let totalInserted = 0;
            let totalErrors = 0;

            // Process data in batches to handle large tables
            for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
                const offset = batchNum * BATCH_SIZE;
                console.log(`\n� Processing batch ${batchNum + 1}/${totalBatches} (rows ${offset + 1}-${Math.min(offset + BATCH_SIZE, sourceCount)})`);
                
                // Fetch batch of data
                const batchQuery = `${config.select} LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
                const sourceResult = await this.sourceClient.query(batchQuery);
                const batchData = sourceResult.rows;

                if (batchData.length === 0) {
                    console.log(`ℹ️  No more data in batch ${batchNum + 1}`);
                    break;
                }

                console.log(`💾 Inserting ${batchData.length} rows from batch ${batchNum + 1}...`);
                
                // Insert batch data
                let batchInserted = 0;
                let batchErrors = 0;

                for (let i = 0; i < batchData.length; i++) {
                    const row = batchData[i];
                    const columns = Object.keys(row);
                    const values = Object.values(row);
                    
                    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
                    const columnNames = columns.join(', ');
                    
                    const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                    
                    try {
                        await this.targetClient.query(insertQuery, values);
                        batchInserted++;
                    } catch (error) {
                        batchErrors++;
                        console.error(`❌ Error inserting row ${offset + i + 1}:`, error.message);
                        // Continue with next row instead of failing completely
                    }
                    
                    // Progress indicator within batch
                    if ((i + 1) % 1000 === 0 || i === batchData.length - 1) {
                        console.log(`   Batch progress: ${i + 1}/${batchData.length} rows (${batchInserted} inserted, ${batchErrors} errors)`);
                    }
                }

                totalInserted += batchInserted;
                totalErrors += batchErrors;
                
                console.log(`✅ Batch ${batchNum + 1} completed: ${batchInserted} inserted, ${batchErrors} errors`);
                
                // Small delay to prevent overwhelming the database
                if (batchNum < totalBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            const targetCountAfter = await this.getTableRowCount(this.targetClient, tableName);
            console.log(`\n🎉 Transfer completed for '${tableName}':`);
            console.log(`   📊 Total rows processed: ${sourceCount}`);
            console.log(`   ✅ Successfully inserted: ${totalInserted}`);
            console.log(`   ❌ Errors encountered: ${totalErrors}`);
            console.log(`   📈 Final count in target: ${targetCountAfter}`);
            
            this.transferLog.push({
                table: tableName,
                sourceRows: sourceCount,
                insertedRows: totalInserted,
                errorRows: totalErrors,
                targetRows: targetCountAfter,
                success: true
            });

            return true;

        } catch (error) {
            console.error(`❌ Error transferring table '${tableName}':`, error.message);
            this.transferLog.push({
                table: tableName,
                sourceRows: 0,
                insertedRows: 0,
                errorRows: 0,
                targetRows: 0,
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async transferTables(tableNames) {
        console.log(`🚀 Starting data transfer for ${tableNames.length} tables...`);
        console.log(`📋 Tables to transfer: ${tableNames.join(', ')}`);
        
        const startTime = Date.now();
        let successCount = 0;

        for (const tableName of tableNames) {
            const success = await this.transferTable(tableName);
            if (success) successCount++;
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`\n📊 Transfer Summary:`);
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`✅ Successful: ${successCount}/${tableNames.length} tables`);
        
        this.transferLog.forEach(log => {
            const status = log.success ? '✅' : '❌';
            if (log.insertedRows !== undefined) {
                // New format with detailed batch metrics
                console.log(`${status} ${log.table}: ${log.sourceRows} source → ${log.insertedRows} inserted (${log.errorRows || 0} errors) → ${log.targetRows} total`);
            } else {
                // Legacy format for compatibility
                console.log(`${status} ${log.table}: ${log.sourceRows} → ${log.targetRows} rows`);
            }
            if (!log.success && log.error) {
                console.log(`   Error: ${log.error}`);
            }
        });
    }

    async showTableStats() {
        console.log('\n📊 Database Table Statistics:');
        console.log('\nSource Database (aqa_survey):');
        
        for (const tableName of TABLES) {
            const exists = await this.checkTableExists(this.sourceClient, tableName);
            if (exists) {
                const count = await this.getTableRowCount(this.sourceClient, tableName);
                console.log(`  ${tableName}: ${count} rows`);
            } else {
                console.log(`  ${tableName}: table not found`);
            }
        }

        console.log('\nTarget Database (aqa):');
        for (const tableName of TABLES) {
            const exists = await this.checkTableExists(this.targetClient, tableName);
            if (exists) {
                const count = await this.getTableRowCount(this.targetClient, tableName);
                console.log(`  ${tableName}: ${count} rows`);
            } else {
                console.log(`  ${tableName}: table not found`);
            }
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const transfer = new DataTransfer();

    try {
        await transfer.connect();

        if (args.includes('--help') || args.includes('-h')) {
            console.log(`
📋 Data Transfer Script Usage:

  node transfer-data.js [options] [table1] [table2] ...

Options:
  --help, -h          Show this help message
  --stats, -s         Show table statistics for both databases
  --all               Transfer all tables
  --list              List all available tables

Examples:
  node transfer-data.js --all                    # Transfer all tables
  node transfer-data.js semester faculty         # Transfer specific tables
  node transfer-data.js --stats                  # Show table statistics
  node transfer-data.js --list                   # List available tables

Available tables: ${TABLES.join(', ')}
            `);
            return;
        }

        if (args.includes('--stats') || args.includes('-s')) {
            await transfer.showTableStats();
            return;
        }

        if (args.includes('--list')) {
            console.log('\n📋 Available tables:');
            TABLES.forEach((table, index) => {
                const deps = TABLE_CONFIG[table].dependencies;
                const depsStr = deps.length > 0 ? ` (depends on: ${deps.join(', ')})` : '';
                console.log(`  ${index + 1}. ${table}${depsStr}`);
            });
            return;
        }

        let tablesToTransfer;

        if (args.includes('--all')) {
            tablesToTransfer = TABLES;
        } else {
            // Filter provided table names
            const providedTables = args.filter(arg => !arg.startsWith('--'));
            if (providedTables.length === 0) {
                console.log('❓ No tables specified. Use --all to transfer all tables or specify table names.');
                console.log('   Use --help for more information.');
                return;
            }
            
            // Validate table names
            const invalidTables = providedTables.filter(table => !TABLES.includes(table));
            if (invalidTables.length > 0) {
                console.error(`❌ Invalid table names: ${invalidTables.join(', ')}`);
                console.log(`Available tables: ${TABLES.join(', ')}`);
                return;
            }
            
            tablesToTransfer = providedTables;
        }

        await transfer.transferTables(tablesToTransfer);

    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    } finally {
        await transfer.disconnect();
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = DataTransfer;
