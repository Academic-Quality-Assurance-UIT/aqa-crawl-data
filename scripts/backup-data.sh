#!/bin/bash

# === Configuration ===
HOST="localhost"
PORT="5432"
USER="aqa_user"
PASSWORD="aqa_password"
DATABASE="aqa_survey"
OUTPUT_DIR="../data/staff-survey"

# === Tables to back up ===
TABLES=(
  "public.staff_survey_criteria"
  "public.staff_survey_batch"
  "public.staff_survey_sheet"
  "public.staff_survey_point"
)

# === Check argument ===
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_filename>"
  echo "Example: ./backup_staff_survey.sh data_$(date +%F).dump"
  exit 1
fi

RESTORE_BACKUP_FILE="$OUTPUT_DIR/restore/$1.dump"
SQL_BACKUP_FILE="$OUTPUT_DIR/sql/$1.sql"

# === Create output directory if not exist ===
mkdir -p "$OUTPUT_DIR"

# === Run pg_dump ===
echo "🔄 Starting PostgreSQL backup..."
PGPASSWORD="$PASSWORD" pg_dump \
  -h "$HOST" \
  -p "$PORT" \
  -U "$USER" \
  -d "$DATABASE" \
  $(printf -- '-t %s ' "${TABLES[@]}") \
  -F c \
  -f "$RESTORE_BACKUP_FILE"
PGPASSWORD="$PASSWORD" pg_dump \
  -h "$HOST" \
  -p "$PORT" \
  -U "$USER" \
  -d "$DATABASE" \
  $(printf -- '-t %s ' "${TABLES[@]}") \
  -f "$SQL_BACKUP_FILE"

# === Verify result ===
if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully!"
  echo "📁 File saved to: $RESTORE_BACKUP_FILE"
  echo "📁 File saved to: $SQL_BACKUP_FILE"
else
  echo "❌ Backup failed!"
  exit 1
fi
