from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Project, Video, PublishedItem, Script, Short, User
from ..auth.router import get_current_user
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard")
def get_dashboard_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
    project_ids = [p.id for p in projects]

    total_views = db.query(PublishedItem).filter(PublishedItem.project_id.in_(project_ids)).all()
    total_view_count = sum(p.views for p in total_views)
    total_likes = sum(p.likes for p in total_views)

    return {
        "overview": {
            "total_projects": len(projects),
            "total_videos": db.query(Video).filter(Video.project_id.in_(project_ids)).count(),
            "total_shorts": db.query(Short).filter(Short.project_id.in_(project_ids)).count(),
            "total_published": len([p for p in total_views if p.status == "published"]),
            "total_views": total_view_count,
            "total_likes": total_likes,
            "total_scripts": db.query(Script).filter(Script.project_id.in_(project_ids)).count(),
        },
        "platform_stats": [
            {"platform": "YouTube", "views": random.randint(1000, 50000), "subscribers": random.randint(100, 5000), "revenue": round(random.uniform(10, 500), 2)},
            {"platform": "TikTok", "views": random.randint(5000, 200000), "followers": random.randint(500, 20000), "likes": random.randint(1000, 50000)},
            {"platform": "Instagram", "views": random.randint(2000, 80000), "followers": random.randint(200, 10000), "saves": random.randint(100, 5000)},
            {"platform": "Facebook", "views": random.randint(500, 30000), "followers": random.randint(100, 3000), "shares": random.randint(50, 2000)},
        ],
        "recent_performance": [
            {
                "date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"),
                "views": random.randint(100, 5000),
                "engagement": round(random.uniform(2, 15), 1)
            }
            for i in range(30, 0, -1)
        ],
        "top_content": [
            {
                "title": p.title,
                "platform": p.platform,
                "views": p.views,
                "likes": p.likes,
                "status": p.status
            }
            for p in sorted(total_views, key=lambda x: x.views, reverse=True)[:5]
        ]
    }

@router.get("/project/{project_id}")
def get_project_analytics(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        return {"error": "Project not found"}

    published = db.query(PublishedItem).filter(PublishedItem.project_id == project_id).all()

    return {
        "project": {
            "id": project.id,
            "title": project.title,
            "status": project.status,
        },
        "performance": [
            {
                "platform": item.platform,
                "views": item.views,
                "likes": item.likes,
                "comments": item.comments,
                "shares": item.shares,
                "published_at": item.published_at.isoformat() if item.published_at else None,
            }
            for item in published
        ]
    }
