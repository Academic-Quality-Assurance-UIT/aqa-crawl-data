# Database Transfer Scripts

This directory contains scripts to transfer data from the AQA crawl database to the main AQA application database.

## Overview

Three transfer scripts are provided:
1. **transfer-data.js** - Simple CLI-based transfer with command-line arguments
2. **transfer-data-configurable.js** - Configuration-based transfer using JSON config file
3. **transfer-data-entity-based.js** - Entity-aware transfer (only columns defined in TypeORM entities) 🆕

## Database Configuration

### Source Database (AQA Crawl Data)
- Host: localhost:5432
- Database: aqa_survey
- User: aqa_user
- Password: aqa_password

### Target Database (AQA Application)
- Host: localhost:5433
- Database: aqa
- User: postgres
- Password: jnhbgvfc

## Quick Start

### Option 1: Using the entity-based script (Recommended for production) 🆕

1. **Check entity column mappings**:
   ```bash
   npm run transfer-entity-mapping  # View entity column definitions
   ```

2. **Check database statistics**:
   ```bash
   npm run transfer-entity-stats
   ```

3. **Transfer with entity validation**:
   ```bash
   npm run transfer-entity
   ```

### Option 2: Using the configurable script (Recommended for development)

1. **Configure the transfer** by editing `transfer-config.json`:
   ```bash
   npm run transfer-config  # View current configuration
   ```

2. **Check database statistics**:
   ```bash
   npm run transfer-stats
   ```

3. **Transfer enabled tables**:
   ```bash
   npm run transfer
   ```

### Option 3: Using the simple script

1. **Transfer all tables**:
   ```bash
   npm run transfer-simple
   ```

2. **Transfer specific tables**:
   ```bash
   node transfer-data.js semester faculty subject
   ```

## Entity-Based Transfer (NEW) 🆕

The entity-based transfer script (`transfer-data-entity-based.js`) is designed to be production-ready and only transfers columns that are explicitly defined in the TypeORM entity files.

### Key Features

- **Column Validation**: Only transfers columns that exist in both source database and entity definitions
- **Schema Safety**: Prevents transferring deprecated or unused columns
- **Batch Processing**: Uses 20,000 row batches for memory efficiency
- **Missing Column Detection**: Reports columns that exist in entities but not in source database
- **Conflict Resolution**: Handles duplicate data gracefully

### Entity Column Mappings

The script automatically maps columns based on the TypeORM entity definitions:

```typescript
// Example: Semester entity
@Entity()
export class Semester {
  @PrimaryColumn()
  semester_id: string;    // ✅ Will be transferred

  @Column()
  display_name: string;   // ✅ Will be transferred

  @Column()
  type: string;           // ✅ Will be transferred

  @Column()
  year: string;           // ✅ Will be transferred
  
  // created_at not in entity = ❌ Will NOT be transferred
}
```

### Supported Tables & Columns

| Table | Entity Columns | Notes |
|-------|---------------|-------|
| **semester** | semester_id, display_name, type, year | Core semester data |
| **faculty** | faculty_id, display_name, full_name, is_displayed | Faculty information |
| **subject** | subject_id, display_name, faculty_id | Subject details |
| **lecturer** | lecturer_id, display_name, mscb, faculty_id, username, learning_position, birth_date, gender, learning, email, phone, ngach, position | Complete lecturer profile |
| **criteria** | criteria_id, display_name, index, semester_id | Evaluation criteria |
| **class** | class_id, display_name, semester_id, program, class_type, subject_id, lecturer_id, total_student, participating_student | Class instances |
| **point** | point_id, max_point, point, criteria_id, class_id | Aggregated survey points |
| **comment** | comment_id, class_id, content, type | Survey comments |
| **user_entity** | id, role, displayName, username, password, lastAccess, lastSendEmail, facultyFacultyId, lecturerLecturerId | System users |

### Usage Examples

```bash
# Show what columns will be transferred
npm run transfer-entity-mapping

# Check source data availability
npm run transfer-entity-stats

# Transfer all tables with entity validation
npm run transfer-entity

# Transfer specific tables only
node transfer-data-entity-based.js semester faculty lecturer
```

## Configuration File (transfer-config.json)

The configuration file allows you to:
- Enable/disable specific tables for transfer
- Add WHERE clauses to filter data
- Configure transfer options (batch size, error handling, etc.)

### Example Configuration

```json
{
  "tableFilters": {
    "semester": {
      "enabled": true,
      "whereClause": "",
      "comment": "Transfer all semesters"
    },
    "class": {
      "enabled": true,
      "whereClause": "WHERE semester_id = 'specific_semester_id'",
      "comment": "Transfer classes for specific semester only"
    },
    "user_entity": {
      "enabled": false,
      "whereClause": "",
      "comment": "Disabled by default for security"
    }
  },
  "transferOptions": {
    "truncateBeforeInsert": true,
    "batchSize": 100,
    "continueOnError": true
  }
}
```

## Available Tables

The following tables can be transferred (in dependency order):

1. **semester** - Academic semesters
2. **faculty** - University faculties
3. **subject** - Academic subjects (depends on faculty)
4. **lecturer** - Teaching staff (depends on faculty)
5. **criteria** - Evaluation criteria
6. **class** - Class instances (depends on semester, subject, lecturer)
7. **point_answer** - Individual survey responses (depends on criteria, class)
8. **point** - Aggregated survey points (depends on criteria, class)
9. **comment** - Survey comments (depends on class)
10. **user_entity** - System users (depends on faculty, lecturer)

## Commands Reference

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run transfer-entity` | **🆕 Transfer with entity validation (Recommended)** |
| `npm run transfer-entity-stats` | **🆕 Show statistics for entity-based transfer** |
| `npm run transfer-entity-mapping` | **🆕 Show entity column mappings** |
| `npm run transfer` | Transfer all enabled tables using config |
| `npm run transfer-stats` | Show row counts for both databases |
| `npm run transfer-config` | Display current configuration |
| `npm run transfer-simple` | Transfer all tables using simple script |
| `npm run transfer-help` | Show detailed help information |

### Direct Node Commands

#### Entity-Based Script (NEW - Recommended)
```bash
# Transfer with entity column validation
node transfer-data-entity-based.js --all

# Transfer specific tables with entity validation
node transfer-data-entity-based.js semester faculty subject

# Show entity column mappings
node transfer-data-entity-based.js --mapping

# Show statistics
node transfer-data-entity-based.js --stats
```

#### Configurable Script
```bash
# Transfer with custom config file
node transfer-data-configurable.js --config custom-config.json --transfer

# Show statistics
node transfer-data-configurable.js --stats

# Show current configuration
node transfer-data-configurable.js --show-config
```

#### Simple Script
```bash
# Transfer all tables
node transfer-data.js --all

# Transfer specific tables
node transfer-data.js semester faculty subject

# Show table statistics
node transfer-data.js --stats

# List available tables
node transfer-data.js --list
```

## Prerequisites

1. **Database connectivity**: Ensure both source and target databases are running and accessible
2. **Node.js dependencies**: Run `npm install` to install required packages
3. **Database schema**: The target database should have the correct schema (tables will be created if missing)

## Safety Features

- **Dependency order**: Tables are transferred in the correct dependency order to maintain referential integrity
- **Error handling**: Configurable error handling (continue on error or stop)
- **Batch processing**: Large datasets are processed in configurable batches
- **Conflict resolution**: Uses `ON CONFLICT DO NOTHING` to handle duplicate data
- **Dry run capability**: Check statistics before actual transfer

## Troubleshooting

### Common Issues

1. **Connection failed**:
   - Check if databases are running
   - Verify connection parameters in config
   - Ensure firewall allows connections

2. **Permission denied**:
   - Verify database user credentials
   - Check if user has necessary permissions (SELECT on source, INSERT/CREATE on target)

3. **Table not found**:
   - Ensure source database has been populated
   - Check if init.sql has been applied to create schema

4. **Foreign key constraints**:
   - Tables are transferred in dependency order automatically
   - If issues persist, check for data integrity problems

### Debugging

Enable verbose logging by modifying the scripts or use:
```bash
NODE_ENV=development node transfer-data-configurable.js --transfer
```

## Security Considerations

- **User data**: The `user_entity` table is disabled by default in the config
- **Passwords**: Ensure passwords are properly hashed before transfer
- **Sensitive data**: Review and filter any sensitive information before transfer
- **Network security**: Use secure connections for production transfers

## Performance Tips

1. **Batch size**: Adjust `batchSize` in config for optimal performance
2. **Indexes**: Ensure target database has proper indexes after transfer
3. **Memory**: For large datasets, consider processing tables individually
4. **Network**: Transfer during low-traffic periods for better performance
