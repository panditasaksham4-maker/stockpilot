"""
Backend Server Entrypoint for the AI Self-Healing Cloud Infrastructure Platform.
Automatically switches between FastAPI (with Uvicorn) and the built-in standard-library engine.
"""
import sys
import os

# Add parent directory to sys.path so 'app' package is found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import Config

def print_banner(mode: str):
    banner = f"""
===========================================================================
  AI-POWERED SELF-HEALING CLOUD INFRASTRUCTURE CONTROL CENTER
  Autonomous Monitoring | AI Anomaly Detection | Closed-Loop Recovery
===========================================================================
  * Server Engine    : {mode}
  * Host & Port      : http://localhost:{Config.PORT}
  * Health Endpoint  : http://localhost:{Config.PORT}/api/health
  * Metrics Stream   : http://localhost:{Config.PORT}/api/metrics
  * SQLite DB Store  : {Config.DATABASE_PATH}
===========================================================================
    """
    print(banner)

def main():
    try:
        import uvicorn
        import fastapi
        print_banner("FastAPI + Uvicorn + WebSocket Engine")
        uvicorn.run(
            "app.api:app",
            host=Config.HOST,
            port=Config.PORT,
            reload=False,
            log_level="info"
        )
    except ImportError:
        print_banner("Python Standard-Library Autonomic Cloud Engine (Zero External Dependencies)")
        from app.standalone_server import run_standalone_server
        run_standalone_server()

if __name__ == "__main__":
    main()
