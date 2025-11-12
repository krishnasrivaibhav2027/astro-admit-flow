#!/usr/bin/env python3
"""
Script to add password column to Supabase students table.
This requires either:
1. Supabase Service Role Key (set as SUPABASE_SERVICE_ROLE_KEY env var), OR
2. Direct PostgreSQL connection string (set as DATABASE_URL env var)
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

def add_password_column_via_postgres():
    """Add password column using direct PostgreSQL connection"""
    try:
        import psycopg2
        
        database_url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')
        
        if not database_url:
            print("❌ DATABASE_URL not found in environment variables")
            print("Please set DATABASE_URL or POSTGRES_URL with your Supabase PostgreSQL connection string")
            print("\nExample format:")
            print("postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres")
            return False
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Add password column
        cursor.execute("""
            ALTER TABLE public.students 
            ADD COLUMN IF NOT EXISTS password TEXT;
        """)
        
        conn.commit()
        
        # Verify column was added
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'students' AND column_name = 'password';
        """)
        
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            print("✅ Password column added successfully!")
            return True
        else:
            print("❌ Failed to add password column")
            return False
            
    except ImportError:
        print("❌ psycopg2 not installed. Install with: pip install psycopg2-binary")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def add_password_column_via_supabase_api():
    """Attempt to add password column via Supabase Management API"""
    try:
        import requests
        
        project_ref = os.environ.get('SUPABASE_URL', '').split('//')[1].split('.')[0] if os.environ.get('SUPABASE_URL') else None
        service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not service_role_key:
            print("❌ SUPABASE_SERVICE_ROLE_KEY not found")
            print("Please add your Supabase Service Role Key to .env file")
            print("\nYou can find it in:")
            print("Supabase Dashboard → Settings → API → service_role key")
            return False
        
        if not project_ref:
            print("❌ Could not extract project reference from SUPABASE_URL")
            return False
        
        # Note: Supabase doesn't provide a direct API for schema changes via REST
        # This would require using their Management API with proper authentication
        print("⚠️ Supabase Management API requires additional setup")
        print("Please use the SQL Editor method instead (see SETUP_PASSWORD_AUTH.md)")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Add Password Column to Supabase Students Table")
    print("=" * 60)
    print()
    
    # Try PostgreSQL connection first
    print("Method 1: Trying direct PostgreSQL connection...")
    if add_password_column_via_postgres():
        print("\n✅ SUCCESS! Password column has been added.")
        print("\nNext steps:")
        print("1. Restart backend: sudo supervisorctl restart backend")
        print("2. Test registration endpoint: POST /api/register")
        return 0
    
    print("\nMethod 1 failed. Trying alternative methods...")
    print()
    
    # Try Supabase API
    print("Method 2: Trying Supabase Management API...")
    if add_password_column_via_supabase_api():
        print("\n✅ SUCCESS! Password column has been added.")
        return 0
    
    print("\nMethod 2 failed.")
    print()
    
    # Provide manual instructions
    print("=" * 60)
    print("MANUAL SETUP REQUIRED")
    print("=" * 60)
    print()
    print("Please follow the instructions in SETUP_PASSWORD_AUTH.md")
    print()
    print("Quick steps:")
    print("1. Go to Supabase Dashboard → SQL Editor")
    print("2. Run this SQL:")
    print()
    print("   ALTER TABLE public.students ADD COLUMN password TEXT;")
    print()
    print("3. Restart backend: sudo supervisorctl restart backend")
    print()
    
    return 1

if __name__ == "__main__":
    sys.exit(main())
