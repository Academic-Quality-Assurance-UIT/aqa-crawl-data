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

// Define tables in dependency order with only the columns that exist in entities
const TABLES = [
    'semester',
    'faculty', 
    'subject',
    'lecturer',
    'criteria',
    'class',
    'point',
    'comment',
    'user_entity'
];

// Table configurations with specific column mappings from entities
const TABLE_CONFIG = {
    semester: {
        columns: ['semester_id', 'display_name', 'type', 'year', 'search_string'],
        dependencies: []
    },
    faculty: {
        columns: ['faculty_id', 'display_name', 'full_name', 'is_displayed'],
        dependencies: []
    },
    subject: {
        columns: ['subject_id', 'display_name', 'faculty_id'],
        dependencies: ['faculty']
    },
    lecturer: {
        columns: [
            'lecturer_id', 'display_name', 'mscb', 'faculty_id', 'username',
            'learning_position', 'birth_date', 'gender', 'learning', 'email',
            'phone', 'ngach', 'position'
        ],
        dependencies: ['faculty']
    },
    criteria: {
        columns: ['criteria_id', 'display_name', 'index', 'semester_id'],
        dependencies: []
    },
    class: {
        columns: [
            'class_id', 'display_name', 'semester_id', 'program', 'class_type',
            'subject_id', 'lecturer_id', 'total_student', 'participating_student'
        ],
        dependencies: ['semester', 'subject', 'lecturer']
    },
    point: {
        columns: ['point_id', 'max_point', 'point', 'criteria_id', 'class_id'],
        dependencies: ['criteria', 'class']
    },
    comment: {
        columns: ['comment_id', 'class_id', 'content', 'type'],
        columnMappings: {
            // Source column -> Target column (if different)
            'content': 'content'  // Entity has display_name but it maps to content column
        },
        dependencies: ['class']
    },
    user_entity: {
        columns: [
            'id', 'role', 'displayName', 'username', 'password', 
            'lastAccess', 'lastSendEmail', 'facultyFacultyId', 'lecturerLecturerId'
        ],
        dependencies: ['faculty', 'lecturer']
    }
};

class EntityBasedDataTransfer {
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

    async getTableRowCount(client, tableName, whereClause = '') {
        try {
            const query = `SELECT COUNT(*) FROM ${tableName} ${whereClause}`;
            const result = await client.query(query);
            return parseInt(result.rows[0].count);
        } catch (error) {
            return 0;
        }
    }

    async getAvailableColumns(client, tableName) {
        const query = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            ORDER BY ordinal_position
        `;
        const result = await client.query(query, [tableName]);
        return result.rows.map(row => row.column_name);
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
        
        const config = TABLE_CONFIG[tableName];
        if (!config) {
            console.error(`❌ No configuration found for table: ${tableName}`);
            return false;
        }

        const BATCH_SIZE = 20000; // Process 20k rows at a time to prevent memory exhaustion

        try {
            // Check if source table exists
            const sourceExists = await this.checkTableExists(this.sourceClient, tableName);
            if (!sourceExists) {
                console.log(`⚠️  Table '${tableName}' does not exist in source database`);
                return false;
            }

            // Get available columns in source table
            const sourceColumns = await this.getAvailableColumns(this.sourceClient, tableName);
            console.log(`📋 Available columns in source: ${sourceColumns.join(', ')}`);

            // Filter to only columns that exist in both source and entity definition
            const entityColumns = config.columns;
            const validColumns = entityColumns.filter(col => sourceColumns.includes(col));
            const missingColumns = entityColumns.filter(col => !sourceColumns.includes(col));

            console.log(`✅ Columns to transfer: ${validColumns.join(', ')}`);
            if (missingColumns.length > 0) {
                console.log(`⚠️  Missing columns (will be skipped): ${missingColumns.join(', ')}`);
            }

            if (validColumns.length === 0) {
                console.log(`❌ No valid columns found for transfer`);
                return false;
            }

            // Build select query with only valid columns
            const columnList = validColumns.join(', ');
            const baseSelectQuery = `SELECT ${columnList} FROM ${tableName} ORDER BY ${validColumns.includes('created_at') ? 'created_at' : validColumns[0]}`;

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

            // Clear target table first
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
                console.log(`\n📦 Processing batch ${batchNum + 1}/${totalBatches} (rows ${offset + 1}-${Math.min(offset + BATCH_SIZE, sourceCount)})`);
                
                // Fetch batch of data with only valid columns
                const batchQuery = `${baseSelectQuery} LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
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
            console.log(`   📋 Columns transferred: ${validColumns.length}/${entityColumns.length}`);
            console.log(`   ✅ Successfully inserted: ${totalInserted}`);
            console.log(`   ❌ Errors encountered: ${totalErrors}`);
            console.log(`   📈 Final count in target: ${targetCountAfter}`);
            
            this.transferLog.push({
                table: tableName,
                sourceRows: sourceCount,
                insertedRows: totalInserted,
                errorRows: totalErrors,
                targetRows: targetCountAfter,
                columnsTransferred: validColumns.length,
                missingColumns: missingColumns.length,
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
                columnsTransferred: 0,
                missingColumns: 0,
                success: false,
                error: error.message
            });
            return false;
        }
    }

    async transferTables(tableNames) {
        console.log(`🚀 Starting entity-based data transfer for ${tableNames.length} tables...`);
        console.log(`📋 Tables to transfer: ${tableNames.join(', ')}`);
        console.log(`🎯 Only transferring columns defined in entity files`);
        
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
                console.log(`${status} ${log.table}: ${log.sourceRows} source → ${log.insertedRows} inserted (${log.errorRows} errors) → ${log.targetRows} total`);
                console.log(`   📋 Columns: ${log.columnsTransferred} transferred, ${log.missingColumns} missing`);
            } else {
                console.log(`${status} ${log.table}: transfer failed`);
            }
            if (!log.success && log.error) {
                console.log(`   Error: ${log.error}`);
            }
        });
    }

    async showTableStats() {
        console.log('\n📊 Database Table Statistics (Entity-based):');
        console.log('\nSource Database (aqa_survey):');
        
        for (const tableName of TABLES) {
            const exists = await this.checkTableExists(this.sourceClient, tableName);
            if (exists) {
                const count = await this.getTableRowCount(this.sourceClient, tableName);
                const config = TABLE_CONFIG[tableName];
                console.log(`  ${tableName}: ${count} rows (${config.columns.length} entity columns)`);
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

    async showEntityMapping() {
        console.log('\n📋 Entity Column Mapping:');
        for (const [tableName, config] of Object.entries(TABLE_CONFIG)) {
            console.log(`\n${tableName}:`);
            console.log(`  Entity columns: ${config.columns.join(', ')}`);
            console.log(`  Dependencies: ${config.dependencies.join(', ') || 'none'}`);
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const transfer = new EntityBasedDataTransfer();

    try {
        await transfer.connect();

        if (args.includes('--help') || args.includes('-h')) {
            console.log(`
📋 Entity-Based Data Transfer Script Usage:

  node transfer-data-entity-based.js [options] [table1] [table2] ...

Options:
  --help, -h          Show this help message
  --stats, -s         Show table statistics for both databases
  --mapping, -m       Show entity column mapping
  --all               Transfer all tables (only entity columns)
  --list              List all available tables

Examples:
  node transfer-data-entity-based.js --all              # Transfer all tables
  node transfer-data-entity-based.js semester faculty   # Transfer specific tables
  node transfer-data-entity-based.js --stats            # Show table statistics
  node transfer-data-entity-based.js --mapping          # Show column mappings

Available tables: ${TABLES.join(', ')}

Features:
  ✅ Only transfers columns defined in entity files
  ✅ Batch processing (20k rows) for large tables
  ✅ Conflict handling with ON CONFLICT DO NOTHING
  ✅ Detailed column mapping and missing column reporting
            `);
            return;
        }

        if (args.includes('--stats') || args.includes('-s')) {
            await transfer.showTableStats();
            return;
        }

        if (args.includes('--mapping') || args.includes('-m')) {
            await transfer.showEntityMapping();
            return;
        }

        if (args.includes('--list')) {
            console.log('\n📋 Available tables:');
            TABLES.forEach((table, index) => {
                const config = TABLE_CONFIG[table];
                const deps = config.dependencies;
                const depsStr = deps.length > 0 ? ` (depends on: ${deps.join(', ')})` : '';
                console.log(`  ${index + 1}. ${table} - ${config.columns.length} entity columns${depsStr}`);
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

module.exports = EntityBasedDataTransfer;
