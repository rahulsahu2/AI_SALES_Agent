from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "voiceflow_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Optional configuration settings
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=["app.workers.tasks"]
)

# Celery Beat schedule for checking scheduled campaigns
celery_app.conf.beat_schedule = {
    "check-scheduled-campaigns-every-minute": {
        "task": "tasks.check_scheduled_campaigns",
        "schedule": 60.0,  # Run every 60 seconds
    },
}
