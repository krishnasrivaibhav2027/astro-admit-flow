import json
import os
import logging
from typing import Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

DEFAULT_SETTINGS = {
    "model": "gemini-2.5-flash-lite",
    "temperature": 0.7,
    "email_notifications": True,
    "passing_score": 70,
    "max_attempts": 3,
    "rag_k": 3
}

class SettingsManager:
    def __init__(self):
        self.supabase_url = os.environ.get('SUPABASE_URL')
        self.supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
        self.settings = self._load_settings()

    def _load_settings(self) -> Dict[str, Any]:
        """Load settings from Supabase or return defaults"""
        try:
            response = self.client.table("admin_settings").select("value").eq("key", "global_settings").execute()
            if response.data:
                saved_settings = json.loads(response.data[0]['value'])
                return {**DEFAULT_SETTINGS, **saved_settings}
            else:
                # Initialize if not exists
                self.client.table("admin_settings").insert({
                    "key": "global_settings",
                    "value": json.dumps(DEFAULT_SETTINGS)
                }).execute()
                return DEFAULT_SETTINGS.copy()
        except Exception as e:
            logging.error(f"Error loading settings from DB: {e}")
            return DEFAULT_SETTINGS.copy()

    def get_settings(self) -> Dict[str, Any]:
        """Get current settings (refresh from DB to ensure sync)"""
        self.settings = self._load_settings()
        return self.settings

    def update_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update settings and save to DB"""
        self.settings.update(new_settings)
        try:
            self.client.table("admin_settings").upsert({
                "key": "global_settings",
                "value": json.dumps(self.settings),
                "updated_at": "now()"
            }).execute()
            logging.info("Settings updated and saved to DB")
        except Exception as e:
            logging.error(f"Error saving settings to DB: {e}")
            raise e
        return self.settings

    def get_model_name(self) -> str:
        # Refresh to get latest
        self.settings = self._load_settings()
        return self.settings.get("model", "gemini-2.5-flash")

    def get_temperature(self) -> float:
        self.settings = self._load_settings()
        return self.settings.get("temperature", 0.7)

    def log_activity(self, admin_name: str, action: str, details: str):
        """Log admin activity to DB"""
        try:
            # Fetch existing log
            response = self.client.table("admin_settings").select("value").eq("key", "activity_log").execute()
            logs = []
            if response.data:
                logs = json.loads(response.data[0]['value'])
            
            # Add new log
            from datetime import datetime
            from zoneinfo import ZoneInfo
            
            # Use IST
            ist_time = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
            
            new_log = {
                "type": "settings_update", # currently mainly for settings
                "admin_name": admin_name,
                "action": action,
                "details": details,
                "created_at": ist_time
            }
            logs.insert(0, new_log)
            
            # Keep only last 50
            logs = logs[:50]
            
            # Save back
            self.client.table("admin_settings").upsert({
                "key": "activity_log",
                "value": json.dumps(logs),
                "updated_at": "now()"
            }).execute()
        except Exception as e:
            logging.error(f"Error logging activity: {e}")

# Global instance
settings_manager = SettingsManager()
