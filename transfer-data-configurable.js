#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class ConfigurableDataTransfer {
    constructor(configPath = './transfer-config.json') {
        this.configPath = configPath;
        this.config = this.loadConfig();
        this.sourceClient = null;
        this.targetClient = null;
        this.transferLog = [];
    }

    loadConfig() {
        try {
            const configFile = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(configFile);
        } catch (error) {
            console.error(`❌ Error loading config file: ${error.message}`);
            process.exit(1);
        }
    }

    async connect() {
        console.log('🔌 Connecting to databases...');
        
        this.sourceClient = new Client(this.config.sourceDatabase);
        this.targetClient = new Client(this.config.targetDatabase);
        
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
        }
        if (this.targetClient) {
            await this.targetClient.end();
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

    async getTableRowCount(client, tableName, whereClause = '') {
        try {
            const query = `SELECT COUNT(*) FROM ${tableName} ${whereClause}`;
            const result = await client.query(query);
            return parseInt(result.rows[0].count);
        } catch (error) {
            return 0;
        }
    }

    async createTableInTarget(tableName) {
        console.log(`📋 Creating table '${tableName}' in target database...`);
        
        const initSqlPath = path.join(__dirname, 'init.sql');
        if (!fs.existsSync(initSqlPath)) {
            console.warn(`⚠️  init.sql not found. Table '${tableName}' must exist in target database.`);
            return;
        }

        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}[\\s\\S]*?;`, 'i');
        const match = initSql.match(tableRegex);
        
        if (match) {
            try {
                await this.targetClient.query(match[0]);
                console.log(`✅ Table '${tableName}' created successfully`);
            } catch (error) {
                console.log(`ℹ️  Table '${tableName}' creation skipped: ${error.message}`);
            }
        } else {
            console.warn(`⚠️  Could not find CREATE TABLE statement for '${tableName}'`);
        }
    }

    async transferTable(tableName) {
        console.log(`\n📦 Transferring table: ${tableName}`);
        
        const tableFilter = this.config.tableFilters[tableName];
        if (!tableFilter || !tableFilter.enabled) {
            console.log(`⏭️  Table '${tableName}' is disabled in config`);
            return false;
        }

        try {
            // Check if source table exists
            const sourceExists = await this.checkTableExists(this.sourceClient, tableName);
            if (!sourceExists) {
                console.log(`⚠️  Table '${tableName}' does not exist in source database`);
                return false;
            }

            // Build query with filter
            const whereClause = tableFilter.whereClause || '';
            const baseSelectQuery = `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at`;
            
            const sourceCount = await this.getTableRowCount(this.sourceClient, tableName, whereClause);
            if (sourceCount === 0) {
                console.log(`ℹ️  Table '${tableName}' has no matching data`);
                return true;
            }

            // Ensure target table exists
            const targetExists = await this.checkTableExists(this.targetClient, tableName);
            if (!targetExists) {
                await this.createTableInTarget(tableName);
            }

            // Clear target table if configured
            if (this.config.transferOptions.truncateBeforeInsert) {
                const targetCountBefore = await this.getTableRowCount(this.targetClient, tableName);
                if (targetCountBefore > 0) {
                    console.log(`�️  Clearing existing ${targetCountBefore} rows in target table...`);
                    await this.targetClient.query(`DELETE FROM ${tableName}`);
                }
            }

            console.log(`📊 Processing ${sourceCount} rows from source...`);
            if (whereClause) {
                console.log(`🔍 Filter: ${whereClause}`);
            }

            const batchSize = this.config.transferOptions.batchSize || 20000;
            console.log(`📦 Using batch size: ${batchSize} rows`);
            
            const totalBatches = Math.ceil(sourceCount / batchSize);
            let totalInserted = 0;
            let totalErrors = 0;

            // Process data in batches to handle large tables
            for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
                const offset = batchNum * batchSize;
                console.log(`\n📦 Processing batch ${batchNum + 1}/${totalBatches} (rows ${offset + 1}-${Math.min(offset + batchSize, sourceCount)})`);
                
                // Fetch batch of data
                const batchQuery = `${baseSelectQuery} LIMIT ${batchSize} OFFSET ${offset}`;
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
                        if (this.config.transferOptions.continueOnError) {
                            console.error(`⚠️  Error inserting row ${offset + i + 1}: ${error.message}`);
                        } else {
                            throw error;
                        }
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

    getEnabledTables() {
        return Object.keys(this.config.tableFilters)
            .filter(tableName => this.config.tableFilters[tableName].enabled);
    }

    async transferAllEnabledTables() {
        const enabledTables = this.getEnabledTables();
        console.log(`🚀 Starting data transfer for ${enabledTables.length} enabled tables...`);
        console.log(`📋 Tables to transfer: ${enabledTables.join(', ')}`);
        
        const startTime = Date.now();
        let successCount = 0;

        for (const tableName of enabledTables) {
            const success = await this.transferTable(tableName);
            if (success) successCount++;
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`\n📊 Transfer Summary:`);
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`✅ Successful: ${successCount}/${enabledTables.length} tables`);
        
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
        console.log('\nSource Database:');
        
        for (const tableName of Object.keys(this.config.tableFilters)) {
            const filter = this.config.tableFilters[tableName];
            const exists = await this.checkTableExists(this.sourceClient, tableName);
            if (exists) {
                const count = await this.getTableRowCount(this.sourceClient, tableName, filter.whereClause);
                const status = filter.enabled ? '✅' : '❌';
                console.log(`  ${status} ${tableName}: ${count} rows ${filter.whereClause ? '(filtered)' : ''}`);
            } else {
                console.log(`  ❓ ${tableName}: table not found`);
            }
        }

        console.log('\nTarget Database:');
        for (const tableName of Object.keys(this.config.tableFilters)) {
            const exists = await this.checkTableExists(this.targetClient, tableName);
            if (exists) {
                const count = await this.getTableRowCount(this.targetClient, tableName);
                console.log(`  📊 ${tableName}: ${count} rows`);
            } else {
                console.log(`  ❓ ${tableName}: table not found`);
            }
        }
    }

    showConfig() {
        console.log('\n⚙️  Current Configuration:');
        console.log(`📁 Config file: ${this.configPath}`);
        console.log(`🔗 Source: ${this.config.sourceDatabase.user}@${this.config.sourceDatabase.host}:${this.config.sourceDatabase.port}/${this.config.sourceDatabase.database}`);
        console.log(`🎯 Target: ${this.config.targetDatabase.user}@${this.config.targetDatabase.host}:${this.config.targetDatabase.port}/${this.config.targetDatabase.database}`);
        console.log(`\n📋 Table Configuration:`);
        
        Object.keys(this.config.tableFilters).forEach(tableName => {
            const filter = this.config.tableFilters[tableName];
            const status = filter.enabled ? '✅' : '❌';
            const whereInfo = filter.whereClause ? ` (${filter.whereClause})` : '';
            console.log(`  ${status} ${tableName}${whereInfo}`);
            if (filter.comment) {
                console.log(`      💬 ${filter.comment}`);
            }
        });
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    // Look for custom config file
    const configIndex = args.findIndex(arg => arg === '--config');
    const configPath = configIndex !== -1 && args[configIndex + 1] ? args[configIndex + 1] : './transfer-config.json';
    
    const transfer = new ConfigurableDataTransfer(configPath);

    try {
        if (args.includes('--help') || args.includes('-h')) {
            console.log(`
📋 Configurable Data Transfer Script Usage:

  node transfer-data-configurable.js [options]

Options:
  --help, -h              Show this help message
  --config <path>         Use custom config file (default: ./transfer-config.json)
  --stats, -s             Show table statistics for both databases
  --show-config           Display current configuration
  --transfer              Transfer all enabled tables from config

Examples:
  node transfer-data-configurable.js --transfer                    # Transfer enabled tables
  node transfer-data-configurable.js --stats                       # Show table statistics
  node transfer-data-configurable.js --show-config                 # Show configuration
  node transfer-data-configurable.js --config custom.json --transfer

Configuration:
  Edit transfer-config.json to customize:
  - Database connections
  - Which tables to transfer (enabled/disabled)
  - Custom WHERE clauses for filtering data
  - Transfer options (truncate, batch size, error handling)
            `);
            return;
        }

        await transfer.connect();

        if (args.includes('--show-config')) {
            transfer.showConfig();
            return;
        }

        if (args.includes('--stats') || args.includes('-s')) {
            await transfer.showTableStats();
            return;
        }

        if (args.includes('--transfer')) {
            await transfer.transferAllEnabledTables();
            return;
        }

        // Default action if no specific command
        console.log('❓ No action specified. Use --help for usage information.');
        console.log('💡 Quick start: node transfer-data-configurable.js --transfer');

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

module.exports = ConfigurableDataTransfer;
